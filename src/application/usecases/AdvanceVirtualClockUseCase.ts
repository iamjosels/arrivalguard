import type { VirtualInstant } from "@/domain/time/Instant";
import type { AppDeps } from "../AppDeps";
import { requireRole, type ActorContext } from "../ActorContext";
import { NotFoundError, ValidationError } from "../errors/ApplicationError";
import { event } from "../services/events";
import type { TuitionPaymentProcessor } from "../services/TuitionPaymentProcessor";

/**
 * Solo el evaluador avanza la hora virtual (BUILD_PROMPT 12). Después procesa lo programado en los simuladores:
 * concilia los intentos en curso del espacio. Avanzar la hora virtual nunca extiende credenciales.
 */
export class AdvanceVirtualClockUseCase {
  constructor(
    private readonly deps: Pick<AppDeps, "uow">,
    private readonly processor: TuitionPaymentProcessor,
  ) {}

  async execute(actor: ActorContext, command: { readonly minutes: number }): Promise<{ readonly virtualNow: VirtualInstant; readonly reconciled: number }> {
    requireRole(actor, "evaluator");
    if (!Number.isInteger(command.minutes) || command.minutes < 1 || command.minutes > 10_080) {
      throw new ValidationError("minutes must be a whole number between 1 and 10080");
    }
    const virtualNow = await this.deps.uow.transaction(async (r) => {
      const workspace = await r.workspaces.get(actor.workspaceId, { forUpdate: true });
      if (!workspace) throw new NotFoundError();
      const next = workspace.virtualNow.plusMinutes(command.minutes);
      await r.workspaces.setVirtualNow(actor.workspaceId, next);
      await r.events.append(actor.workspaceId, [
        event("CLOCK_ADVANCED", actor.role, { type: "Workspace", id: actor.workspaceId }, next, {
          from: workspace.virtualNow.toISOString(),
          to: next.toISOString(),
          minutes: command.minutes,
        }),
      ]);
      return next;
    });
    const active = await this.deps.uow.read.attempts.listActive(actor.workspaceId);
    for (const record of active) await this.processor.reconcile(actor.workspaceId, record.attempt.id, "system");
    return { virtualNow, reconciled: active.length };
  }
}
