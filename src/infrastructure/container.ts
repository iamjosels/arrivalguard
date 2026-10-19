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
import { ChangePayerPolicyUseCase } from "@/application/usecases/ChangePayerPolicyUseCase";
import { ConfirmPayerChangeUseCase } from "@/application/usecases/ConfirmPayerChangeUseCase";
import { GetCaseViewUseCase } from "@/application/usecases/GetCaseViewUseCase";
import { OpenEvaluationAccessUseCase } from "@/application/usecases/OpenEvaluationAccessUseCase";
import { PreparePayerChangeUseCase } from "@/application/usecases/PreparePayerChangeUseCase";
import { ReadModelsUseCase } from "@/application/usecases/ReadModelsUseCase";
import { RevokePermissionUseCase } from "@/application/usecases/RevokePermissionUseCase";
import { DbRateLimiter, DrizzleSessionStore, EnvAccessCode } from "./auth/DrizzleSessionStore";
import { pepperedHash } from "./auth/secrets";
import { getServerEnv } from "./config/env";
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
  const pepper = () => getServerEnv().SESSION_PEPPER;
  const sessions = new DrizzleSessionStore(db, pepper);
  const limiter = new DbRateLimiter(db);
  const createWorkspace = new CreateEvaluationWorkspaceUseCase(deps);
  return {
    deps,
    processor,
    sessions,
    limiter,
    /** HMAC con pepper de un valor que no debe guardarse en claro (por ejemplo, la IP). */
    hashForStorage: (purpose: string, value: string) => pepperedHash(pepper(), purpose, value),
    createWorkspace,
    access: new OpenEvaluationAccessUseCase(createWorkspace, sessions, limiter, new EnvAccessCode(() => getServerEnv().EVAL_ACCESS_CODE, pepper), {
      sessionTtlHours: getServerEnv().EVAL_SESSION_TTL_HOURS,
      perIpPerHour: getServerEnv().EVAL_ACCESS_PER_IP_HOUR,
      perDay: getServerEnv().EVAL_WORKSPACES_PER_DAY,
      keyPrefix: getServerEnv().RATE_LIMIT_PREFIX,
    }),
    caseView: new GetCaseViewUseCase(deps, processor),
    changePolicy: new ChangePayerPolicyUseCase(deps),
    preparePayerChange: new PreparePayerChangeUseCase(deps),
    confirmPayerChange: new ConfirmPayerChangeUseCase(deps),
    revoke: new RevokePermissionUseCase(deps),
    readModels: new ReadModelsUseCase(deps),
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
