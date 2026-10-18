import { tuitionDebitReasons, type FundsSnapshot } from "../cash/CashInvariants";
import type { Approval } from "../consent/Approval";
import type { TuitionApprovalPayload } from "../consent/ApprovalPayload";
import { Money } from "../money/Money";
import type { ObligationFacts } from "../policy/PolicyEngine";
import { sortReasons, type ReasonCode } from "../policy/ReasonCode";
import { isQuoteExpired, type RouteQuote } from "../policy/RouteQuote";
import type { VirtualInstant } from "../time/Instant";
import { newAttemptBlockers, type AttemptStatus } from "./PaymentAttempt";
import type { PaymentPlan } from "./PaymentPlan";

export interface TuitionExecutionFacts {
  readonly now: VirtualInstant;
  readonly obligation: ObligationFacts;
  readonly plan: PaymentPlan;
  readonly approval: Approval | null;
  /** Payload aprobado (el que firmó el pagador). */
  readonly approvedPayload: TuitionApprovalPayload | null;
  /** Huella recalculada AHORA desde el estado del servidor para esta versión del plan. */
  readonly expectedFingerprint: string;
  /** Cotización con la que se enviaría (la original o una recotización de la misma ruta). */
  readonly quote: RouteQuote;
  readonly funds: FundsSnapshot;
  readonly policy: { readonly maxTuitionDebit: Money; readonly reserve: Money };
  readonly committedToObligation: Money;
  readonly acceptedChannels: readonly string[];
  readonly existingAttemptStatuses: readonly AttemptStatus[];
}

/**
 * Comprobaciones antes de ejecutar un pago de matrícula (BUILD_PROMPT 8.3 y página 17 del plan):
 * obligación pendiente, versiones coincidentes, aprobación vigente para esta versión y esta huella,
 * cotización vigente dentro del alcance aprobado, canal y receptor admitidos, límite acumulado,
 * reserva preservada y sin otro intento activo. Se evalúa dentro de la transacción del ejecutor.
 * Vacío significa que se puede ejecutar.
 */
export function checkTuitionExecution(facts: TuitionExecutionFacts): ReasonCode[] {
  const attemptBlockers = newAttemptBlockers(facts.existingAttemptStatuses);
  if (attemptBlockers.length > 0) return attemptBlockers;
  if (facts.obligation.status !== "PENDING") return ["OBLIGATION_NOT_PENDING"];
  if (facts.plan.status !== "APPROVED" || !facts.approval || !facts.approvedPayload) return ["APPROVAL_MISSING"];

  const reasons: ReasonCode[] = [];
  reasons.push(
    ...facts.approval.usableFor({
      subjectType: "TUITION_PLAN",
      subjectId: facts.plan.id,
      subjectVersion: facts.plan.version,
      fingerprint: facts.expectedFingerprint,
      now: facts.now,
    }),
  );
  if (facts.plan.obligationVersion !== facts.obligation.version) reasons.push("APPROVAL_INVALID");

  const approved = facts.approvedPayload;
  const inScope =
    facts.quote.routeId === approved.routeId &&
    facts.quote.channel === approved.channel &&
    facts.quote.receiverId === approved.receiverId &&
    facts.quote.net.equals(Money.fromJSON(approved.netAmount));
  if (!inScope) reasons.push("APPROVAL_INVALID");

  if (facts.quote.receiverId !== facts.obligation.recipientId) reasons.push("RECEIVER_NOT_ALLOWED");
  if (!facts.acceptedChannels.includes(facts.quote.channel)) reasons.push("CHANNEL_NOT_ALLOWED");
  if (facts.quote.net.currency !== facts.obligation.netDue.currency || facts.quote.net.lessThan(facts.obligation.netDue)) {
    reasons.push("NET_INSUFFICIENT");
  }
  if (isQuoteExpired(facts.quote, facts.now)) reasons.push("QUOTE_EXPIRED");
  if (facts.now.plusMinutes(facts.quote.arrivalMinutes).isAfter(facts.plan.targetArrivalAt)) reasons.push("DEADLINE_MISSED");

  reasons.push(
    ...tuitionDebitReasons({
      debit: facts.quote.debit,
      funds: facts.funds,
      reserve: Money.max(Money.fromJSON(approved.reserve), facts.policy.reserve),
      maxTuitionDebit: Money.min(Money.fromJSON(approved.maxDebit), facts.policy.maxTuitionDebit),
      committedToObligation: facts.committedToObligation,
    }),
  );
  return sortReasons(reasons);
}
