import type { Container } from "@/infrastructure/container";
import type { ActorContext } from "@/application/ActorContext";
import { AttemptMapper, PlanMapper } from "@/application/mappers/CaseViewMapper";
import type { PlanVersionRecord } from "@/domain/ports/Repositories";
import { visibleTuitionStatus } from "@/domain/payment/VisibleStatus";

/** Arma PlanDTO con sus aprobaciones y receptores enmascarados. */
export async function presentPlan(app: Container, actor: ActorContext, record: PlanVersionRecord) {
  const repos = app.deps.uow.read;
  const [recipients, approvals, workspace] = await Promise.all([
    repos.recipients.list(actor.workspaceId),
    repos.approvals.listForSubject(actor.workspaceId, record.plan.id),
    repos.workspaces.get(actor.workspaceId),
  ]);
  const university = recipients.find((r) => r.kind === "INSTITUTION");
  return PlanMapper.toDTO(record, approvals, recipients, university?.id ?? "", workspace!.virtualNow);
}

/** Arma AttemptDTO con su estado visible y procedencia. */
export async function presentAttempt(app: Container, actor: ActorContext, attemptId: string) {
  const status = await app.paymentStatus.execute(actor, { attemptId });
  const attempt = status.attempt!;
  const visible = visibleTuitionStatus(status.plan?.plan ?? null, attempt.attempt);
  return AttemptMapper.toDTO(attempt, visible, status.observation);
}
