import type { ActorRole, DomainEventDraft } from "@/domain/events/DomainEvent";
import type { TransitionSource } from "@/domain/payment/PaymentAttempt";
import type { CreditReceipt } from "@/domain/ports/InstitutionPort";
import {
  ProviderIdempotencyConflictError,
  ProviderTimeoutError,
  type SimulationContext,
  type TransferPayload,
} from "@/domain/ports/PaymentProviderPort";
import type { AttemptRecord, Repositories } from "@/domain/ports/Repositories";
import type { VirtualInstant } from "@/domain/time/Instant";
import type { AppDeps } from "../AppDeps";
import { NotFoundError } from "../errors/ApplicationError";
import { event } from "./events";

export interface Observation {
  /** De dónde viene el estado observado. */
  readonly source: "PROVIDER" | "INSTITUTION" | "SYSTEM";
  readonly observedAt: VirtualInstant;
  readonly receipt: CreditReceipt | null;
  readonly institutionNotice: string | null;
}

/**
 * Lleva un intento de matrícula desde el envío hasta CREDITED o FAILED_CONFIRMED. Cada paso es una transacción
 * con bloqueos en el orden fijo: cuenta, obligación, plan e intento. Conciliar nunca crea un pago nuevo: consulta
 * el MISMO intento por su clave de idempotencia.
 */
export class TuitionPaymentProcessor {
  constructor(private readonly deps: Pick<AppDeps, "uow" | "provider" | "institution">) {}

  /** Envía al proveedor. Si la respuesta se pierde, el intento queda UNKNOWN. */
  async submit(workspaceId: string, attemptId: string, actorRole: ActorRole | "system"): Promise<void> {
    const { record, ctx, payload } = await this.loadForSubmit(workspaceId, attemptId);
    if (record.attempt.status !== "SUBMITTING") return;
    let result;
    try {
      result = await this.deps.provider.submitTransfer(ctx, record.attempt.idempotencyKey, payload);
    } catch (error) {
      if (error instanceof ProviderTimeoutError || !(error instanceof ProviderIdempotencyConflictError)) {
        await this.markUnknown(workspaceId, attemptId, actorRole, error instanceof ProviderTimeoutError ? "TIMEOUT" : "PROVIDER_ERROR");
        return;
      }
      throw error;
    }
    if (result.status === "ACCEPTED") await this.settleAccepted(workspaceId, attemptId, result.transferId, "SUBMISSION", actorRole);
    else await this.settleFailed(workspaceId, attemptId, "SUBMISSION", actorRole, result.code);
  }

  /** Concilia el mismo intento: consulta al proveedor por su clave y a la institución por la referencia. */
  async reconcile(workspaceId: string, attemptId: string, actorRole: ActorRole | "system"): Promise<Observation> {
    const record = await this.deps.uow.read.attempts.get(workspaceId, attemptId);
    if (!record) throw new NotFoundError();
    const ctx = await this.context(workspaceId);
    const status = record.attempt.status;
    if (status === "SUBMITTING" || status === "UNKNOWN") {
      const transfer = await this.deps.provider.getTransfer(ctx, record.attempt.idempotencyKey);
      if (transfer?.status === "ACCEPTED") await this.settleAccepted(workspaceId, attemptId, transfer.transferId, "RECONCILIATION", actorRole);
      else if (transfer?.status === "FAILED") await this.settleFailed(workspaceId, attemptId, "RECONCILIATION", actorRole, "REJECTED_BY_PROVIDER");
      else if (status === "SUBMITTING") await this.submit(workspaceId, attemptId, actorRole);
      // El proveedor confirma que nunca recibió el envío: falla confirmada sin débito.
      else await this.settleFailed(workspaceId, attemptId, "RECONCILIATION", actorRole, "NOT_RECEIVED_BY_PROVIDER");
    } else if (status === "PROVIDER_ACCEPTED" || status === "PENDING_UNIVERSITY") {
      await this.settleAccepted(workspaceId, attemptId, record.attempt.providerTransferId ?? "", "PROVIDER", actorRole);
    }
    return this.observe(workspaceId, attemptId);
  }

  /** Estado observado con su procedencia (T2). No modifica nuestro estado. */
  async observe(workspaceId: string, attemptId: string): Promise<Observation> {
    const record = await this.deps.uow.read.attempts.get(workspaceId, attemptId);
    if (!record) throw new NotFoundError();
    const status = record.attempt.status;
    if ((status === "PENDING_UNIVERSITY" || status === "CREDITED") && record.attempt.providerTransferId) {
      const ctx = await this.context(workspaceId);
      const obligation = record.attempt.toProps().obligationId;
      const reference = obligation ? (await this.deps.uow.read.obligations.get(workspaceId, obligation))?.reference : null;
      const credit = reference ? await this.deps.institution.getCreditStatus(ctx, reference, record.attempt.providerTransferId) : null;
      return {
        source: "INSTITUTION",
        observedAt: status === "CREDITED" && credit?.receipt ? credit.receipt.creditedAt : record.statusChangedAt,
        receipt: status === "CREDITED" ? (credit?.receipt ?? null) : null,
        institutionNotice: credit?.notice ?? null,
      };
    }
    return {
      source: status === "SUBMITTING" ? "SYSTEM" : "PROVIDER",
      observedAt: record.statusChangedAt,
      receipt: null,
      institutionNotice: null,
    };
  }

  private async markUnknown(workspaceId: string, attemptId: string, actorRole: ActorRole | "system", cause: string): Promise<void> {
    await this.deps.uow.transaction(async (r) => {
      const now = await this.now(r, workspaceId);
      const { record } = await this.lockChain(r, workspaceId, attemptId);
      if (record.attempt.status !== "SUBMITTING") return;
      record.attempt.transitionTo("UNKNOWN", "SUBMISSION");
      await r.attempts.save({ ...record, statusChangedAt: now });
      const subject = { type: "PaymentAttempt", id: attemptId };
      await r.events.append(workspaceId, [
        event("PROVIDER_RESPONSE_LOST", actorRole, subject, now, { attemptId, cause }),
        event("ATTEMPT_UNKNOWN", actorRole, subject, now, { attemptId, nextStep: "RECONCILE_SAME_ATTEMPT" }),
      ]);
    });
  }

  private async settleFailed(workspaceId: string, attemptId: string, via: TransitionSource, actorRole: ActorRole | "system", code: string): Promise<void> {
    await this.deps.uow.transaction(async (r) => {
      const now = await this.now(r, workspaceId);
      const { record, account, planRecord } = await this.lockChain(r, workspaceId, attemptId);
      const status = record.attempt.status;
      if (status !== "SUBMITTING" && status !== "UNKNOWN") return;
      const events: DomainEventDraft[] = [];
      const subject = { type: "PaymentAttempt", id: attemptId };
      record.attempt.transitionTo("FAILED_CONFIRMED", via);
      await r.attempts.save({ ...record, statusChangedAt: now });
      events.push(event("PROVIDER_FAILED_CONFIRMED", actorRole, subject, now, { attemptId, code, via, debited: false }));
      if (account.releaseHold(attemptId) === "RELEASED") {
        await r.accounts.save(account);
        events.push(event("HOLD_RELEASED", actorRole, subject, now, { attemptId, amount: record.attempt.debit.toJSON() }));
      }
      if (planRecord && planRecord.plan.status === "EXECUTING") {
        // Falla confirmada sin débito: un intento nuevo exige revalidar y una aprobación nueva.
        planRecord.plan.transitionTo("READY_FOR_APPROVAL");
        await r.plans.saveVersion(planRecord);
      }
      await r.events.append(workspaceId, events);
    });
  }

  private async settleAccepted(workspaceId: string, attemptId: string, transferId: string, via: TransitionSource, actorRole: ActorRole | "system"): Promise<void> {
    const ctx = await this.context(workspaceId);
    // Lo que dicen el proveedor y la institución se consulta ANTES de abrir la transacción: así ninguna
    // transacción retiene una conexión mientras espera otra del pool.
    const peek = await this.deps.uow.read.attempts.get(workspaceId, attemptId);
    if (!peek) throw new NotFoundError();
    const effectiveTransferId = peek.attempt.providerTransferId ?? transferId;
    const obligationId = peek.attempt.toProps().obligationId;
    const reference = obligationId ? ((await this.deps.uow.read.obligations.get(workspaceId, obligationId))?.reference ?? null) : null;
    const providerEvents = await this.deps.provider.events(ctx, effectiveTransferId);
    const credit = peek.attempt.kind === "TUITION" && reference ? await this.deps.institution.getCreditStatus(ctx, reference, effectiveTransferId) : null;

    await this.deps.uow.transaction(async (r) => {
      const now = ctx.now;
      const { record, account, obligation, planRecord } = await this.lockChain(r, workspaceId, attemptId);
      const events: DomainEventDraft[] = [];
      const subject = { type: "PaymentAttempt", id: attemptId };
      const attempt = record.attempt;
      let changedAt = record.statusChangedAt;

      if (attempt.status === "SUBMITTING" || attempt.status === "UNKNOWN") {
        attempt.transitionTo("PROVIDER_ACCEPTED", via);
        attempt.recordProviderTransfer(effectiveTransferId);
        changedAt = now;
        events.push(event("PROVIDER_ACCEPTED", actorRole, subject, now, { attemptId, transferId: effectiveTransferId, via }));
      }

      // Eventos de débito del proveedor: cada entrega se mira una vez; un mismo evento se aplica una sola vez.
      let accountChanged = false;
      for (const providerEvent of providerEvents) {
        if (!(await r.providerReceipts.markProcessed(workspaceId, `delivery:${providerEvent.deliveryId}`))) continue;
        if (!(await r.providerReceipts.markProcessed(workspaceId, `applied:${providerEvent.providerEventId}`))) {
          events.push(event("DUPLICATE_EVENT_IGNORED", "system", subject, now, { attemptId, providerEventId: providerEvent.providerEventId }));
          continue;
        }
        const capture = account.captureHold(attemptId, { consumeArrivalReserve: attempt.kind === "REMITTANCE" });
        if (capture === "CAPTURED") {
          accountChanged = true;
          events.push(event("HOLD_CAPTURED", "system", subject, now, { attemptId, amount: attempt.debit.toJSON() }));
          events.push(event("DEBIT_CONFIRMED", "system", subject, now, { attemptId, debit: providerEvent.debit.toJSON(), providerEventId: providerEvent.providerEventId }));
        }
      }
      if (accountChanged) await r.accounts.save(account);

      if (attempt.kind === "TUITION" && obligation && credit && (attempt.status === "PROVIDER_ACCEPTED" || attempt.status === "PENDING_UNIVERSITY")) {
        if (attempt.status === "PROVIDER_ACCEPTED") {
          attempt.transitionTo("PENDING_UNIVERSITY", "INSTITUTION");
          changedAt = now;
          events.push(
            event("INSTITUTION_PENDING", "system", subject, now, {
              attemptId,
              reference: obligation.reference,
              expectedCreditAt: credit.expectedCreditAt.toISOString(),
              institutionNotice: credit.notice,
            }),
          );
        }
        if (credit.status === "CREDITED" && credit.receipt && attempt.status === "PENDING_UNIVERSITY") {
          attempt.transitionTo("CREDITED", "INSTITUTION");
          changedAt = credit.receipt.creditedAt;
          await r.obligations.saveStatus(workspaceId, obligation.id, "CREDITED");
          if (planRecord && planRecord.plan.status === "EXECUTING") {
            planRecord.plan.transitionTo("COMPLETED");
            await r.plans.saveVersion(planRecord);
          }
          events.push(
            event("INSTITUTION_CREDITED", "system", subject, now, {
              attemptId,
              receiptId: credit.receipt.receiptId,
              net: credit.receipt.net.toJSON(),
              reference: credit.receipt.reference,
              creditedAt: credit.receipt.creditedAt.toISOString(),
            }),
          );
        }
      }
      await r.attempts.save({ ...record, statusChangedAt: changedAt });
      await r.events.append(workspaceId, events);
    });
  }

  /** Bloquea cuenta, obligación, plan e intento, en ese orden. */
  private async lockChain(r: Repositories, workspaceId: string, attemptId: string) {
    const peek = await r.attempts.get(workspaceId, attemptId);
    if (!peek) throw new NotFoundError();
    const kind = peek.attempt.kind;
    const account = await r.accounts.getByKind(workspaceId, "PAYER_USD", { forUpdate: true });
    if (!account) throw new NotFoundError();
    const obligationId = peek.attempt.toProps().obligationId;
    const obligation = obligationId ? await r.obligations.get(workspaceId, obligationId, { forUpdate: true }) : null;
    const planId = peek.attempt.toProps().subjectId;
    if (kind === "TUITION") await r.plans.getCurrent(workspaceId, planId, { forUpdate: true });
    const planRecord = kind === "TUITION" ? await r.plans.getVersion(workspaceId, planId, peek.subjectVersion) : null;
    const record = await r.attempts.get(workspaceId, attemptId, { forUpdate: true });
    if (!record) throw new NotFoundError();
    return { record, account, obligation, planRecord };
  }

  private async loadForSubmit(workspaceId: string, attemptId: string): Promise<{ record: AttemptRecord; ctx: SimulationContext; payload: TransferPayload }> {
    const record = await this.deps.uow.read.attempts.get(workspaceId, attemptId);
    if (!record) throw new NotFoundError();
    const ctx = await this.context(workspaceId);
    const obligationId = record.attempt.toProps().obligationId;
    const obligation = obligationId ? await this.deps.uow.read.obligations.get(workspaceId, obligationId) : null;
    const q = record.quote;
    const payload: TransferPayload = {
      kind: record.attempt.kind,
      routeId: q.routeId,
      channel: q.channel,
      receiverId: q.receiverId,
      reference: obligation?.reference ?? `REM-${record.attempt.toProps().subjectId.slice(0, 8)}`,
      quoteId: q.quoteId,
      debit: q.debit.toJSON(),
      net: q.net.toJSON(),
      arrivalMinutes: q.arrivalMinutes,
    };
    return { record, ctx, payload };
  }

  private async context(workspaceId: string): Promise<SimulationContext> {
    const workspace = await this.deps.uow.read.workspaces.get(workspaceId);
    if (!workspace) throw new NotFoundError();
    return { workspaceId, now: workspace.virtualNow };
  }

  private async now(r: Repositories, workspaceId: string): Promise<VirtualInstant> {
    const workspace = await r.workspaces.get(workspaceId);
    if (!workspace) throw new NotFoundError();
    return workspace.virtualNow;
  }
}
