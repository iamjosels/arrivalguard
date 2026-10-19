import type { AppDeps } from "@/application/AppDeps";
import { TuitionPaymentProcessor } from "@/application/services/TuitionPaymentProcessor";
import { AdvanceVirtualClockUseCase } from "@/application/usecases/AdvanceVirtualClockUseCase";
import { CompareRoutesUseCase } from "@/application/usecases/CompareRoutesUseCase";
import { CreateEvaluationWorkspaceUseCase } from "@/application/usecases/CreateEvaluationWorkspaceUseCase";
import { ExecuteTuitionPaymentUseCase } from "@/application/usecases/ExecuteTuitionPaymentUseCase";
import { GetApprovalViewUseCase } from "@/application/usecases/GetApprovalViewUseCase";
import { GetPaymentStatusUseCase } from "@/application/usecases/GetPaymentStatusUseCase";
import { GrantApprovalUseCase } from "@/application/usecases/GrantApprovalUseCase";
import { InjectFaultUseCase } from "@/application/usecases/InjectFaultUseCase";
import { PlanTuitionPaymentUseCase } from "@/application/usecases/PlanTuitionPaymentUseCase";
import { ProjectCashUseCase } from "@/application/usecases/ProjectCashUseCase";
import { ReconcilePaymentUseCase } from "@/application/usecases/ReconcilePaymentUseCase";
import { RequestPayerApprovalUseCase } from "@/application/usecases/RequestPayerApprovalUseCase";
import { NodeHasher } from "./crypto/NodeHasher";
import { getDb } from "./db/client";
import { DrizzleUnitOfWork } from "./db/DrizzleUnitOfWork";
import { ScenarioSeeder } from "./scenarios/ScenarioSeeder";
import { SimulatedInstitutionAdapter } from "./simulators/institution/SimulatedInstitutionAdapter";
import { SimulatedProviderAdapter } from "./simulators/provider/SimulatedProviderAdapter";
import { SystemClock, UuidGenerator } from "./system/SystemClock";

/** Raíz de composición: arma los puertos reales y los casos de uso. */
export function buildContainer() {
  const db = getDb();
  const hasher = new NodeHasher();
  const ids = new UuidGenerator();
  const institution = new SimulatedInstitutionAdapter(db);
  const provider = new SimulatedProviderAdapter(db, institution, hasher);
  const seeder = new ScenarioSeeder(ids, institution);
  const deps: AppDeps = {
    uow: new DrizzleUnitOfWork(db),
    provider,
    institution,
    hasher,
    ids,
    scenarios: seeder,
    seeder,
    realClock: new SystemClock(),
  };
  const processor = new TuitionPaymentProcessor(deps);
  return {
    deps,
    processor,
    createWorkspace: new CreateEvaluationWorkspaceUseCase(deps),
    planTuition: new PlanTuitionPaymentUseCase(deps),
    compareRoutes: new CompareRoutesUseCase(deps),
    requestApproval: new RequestPayerApprovalUseCase(deps),
    approvalView: new GetApprovalViewUseCase(deps),
    grantApproval: new GrantApprovalUseCase(deps),
    executeTuition: new ExecuteTuitionPaymentUseCase(deps, processor),
    reconcile: new ReconcilePaymentUseCase(deps, processor),
    paymentStatus: new GetPaymentStatusUseCase(deps, processor),
    advanceClock: new AdvanceVirtualClockUseCase(deps, processor),
    injectFault: new InjectFaultUseCase(deps),
    projectCash: new ProjectCashUseCase(deps),
  };
}

export type Container = ReturnType<typeof buildContainer>;

let container: Container | undefined;

export function getContainer(): Container {
  if (!container) container = buildContainer();
  return container;
}
