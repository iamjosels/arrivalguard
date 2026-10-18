import { describe, expect, it } from "vitest";
import { Approval } from "@/domain/consent/Approval";
import { buildTuitionApprovalPayload, fingerprintOf } from "@/domain/consent/ApprovalPayload";
import { checkTuitionExecution, type TuitionExecutionFacts } from "@/domain/payment/ExecutionGuard";
import { PaymentPlan } from "@/domain/payment/PaymentPlan";
import { NodeHasher } from "@/infrastructure/crypto/NodeHasher";
import { cny, tuitionFacts, usd } from "../../support/scenarioFacts";

const hasher = new NodeHasher();

function setup(overrides: Partial<TuitionExecutionFacts> = {}): TuitionExecutionFacts {
  const routing = tuitionFacts("base", { targetHours: 48 });
  const quote = routing.quotes.find((q) => q.routeId === "B")!;
  const expiresAt = routing.now.plusHours(24);
  const payload = buildTuitionApprovalPayload({
    workspaceId: "ws-1",
    obligationId: routing.obligation.id,
    obligationVersion: routing.obligation.version,
    planId: "plan-1",
    planVersion: 1,
    routeId: quote.routeId,
    channel: quote.channel,
    receiverId: quote.receiverId,
    reference: routing.obligation.reference,
    sourceAccountId: "acc-payer",
    proposedDebit: quote.debit,
    netAmount: quote.net,
    maxDebit: routing.policy.maxTuitionDebit,
    reserve: routing.policy.reserve,
    quoteId: quote.quoteId,
    approvalExpiresAt: expiresAt,
  });
  const fingerprint = fingerprintOf(payload, hasher);
  const approval = Approval.grant({
    id: "apr-1",
    workspaceId: "ws-1",
    subjectType: "TUITION_PLAN",
    subjectId: "plan-1",
    subjectVersion: 1,
    payerActorId: "act-payer",
    payload,
    presentedFingerprint: fingerprint,
    hasher,
    now: routing.now,
    maxDebit: routing.policy.maxTuitionDebit,
    reserve: routing.policy.reserve,
    expiresAt,
  });
  const plan = PaymentPlan.rehydrate({
    id: "plan-1",
    workspaceId: "ws-1",
    obligationId: routing.obligation.id,
    obligationVersion: 1,
    version: 1,
    status: "APPROVED",
    targetArrivalAt: routing.targetArrivalAt,
    selectedRouteId: "B",
    createdByActorId: "act-student",
    approvalRequestedAt: routing.now,
    approvalExpiresAt: expiresAt,
  });
  return {
    now: routing.now.plusMinutes(5),
    obligation: routing.obligation,
    plan,
    approval,
    approvedPayload: payload,
    expectedFingerprint: fingerprint,
    quote,
    funds: routing.funds,
    policy: routing.policy,
    committedToObligation: usd("0.00"),
    acceptedChannels: routing.acceptedChannels,
    existingAttemptStatuses: [],
    ...overrides,
  };
}

describe("Comprobaciones antes de ejecutar (BUILD_PROMPT 8.3)", () => {
  it("todo en regla: sin razones", () => {
    expect(checkTuitionExecution(setup())).toEqual([]);
  });

  it("sin aprobación vigente: APPROVAL_MISSING (S02)", () => {
    expect(checkTuitionExecution(setup({ approval: null, approvedPayload: null }))).toEqual(["APPROVAL_MISSING"]);
    const facts = setup();
    const notApproved = PaymentPlan.rehydrate({ ...facts.plan.toProps(), status: "APPROVAL_REQUESTED" });
    expect(checkTuitionExecution({ ...facts, plan: notApproved })).toEqual(["APPROVAL_MISSING"]);
  });

  it("aprobación revocada antes de ejecutar: APPROVAL_REVOKED (N12)", () => {
    const facts = setup();
    facts.approval!.revoke();
    expect(checkTuitionExecution(facts)).toEqual(["APPROVAL_REVOKED"]);
  });

  it("si el plan cambió, la huella recalculada ya no coincide: APPROVAL_INVALID (S16)", () => {
    expect(checkTuitionExecution(setup({ expectedFingerprint: "f".repeat(64) }))).toEqual(["APPROVAL_INVALID"]);
  });

  it("si cambió la versión de la obligación: APPROVAL_INVALID", () => {
    const facts = setup();
    expect(checkTuitionExecution({ ...facts, obligation: { ...facts.obligation, version: 2 } })).toEqual(["APPROVAL_INVALID"]);
  });

  it("aprobación vencida: APPROVAL_EXPIRED", () => {
    const facts = setup();
    expect(checkTuitionExecution({ ...facts, now: facts.now.plusHours(24) })).toContain("APPROVAL_EXPIRED");
  });

  it("con otro intento activo (incluido UNKNOWN): ACTIVE_ATTEMPT_EXISTS (O03, O04)", () => {
    expect(checkTuitionExecution(setup({ existingAttemptStatuses: ["UNKNOWN"] }))).toEqual(["ACTIVE_ATTEMPT_EXISTS"]);
    expect(checkTuitionExecution(setup({ existingAttemptStatuses: ["SUBMITTING"] }))).toEqual(["ACTIVE_ATTEMPT_EXISTS"]);
  });

  it("matrícula ya acreditada: OBLIGATION_NOT_PENDING", () => {
    const facts = setup();
    expect(checkTuitionExecution({ ...facts, obligation: { ...facts.obligation, status: "CREDITED" } })).toEqual(["OBLIGATION_NOT_PENDING"]);
  });

  it("cotización vencida: QUOTE_EXPIRED (el ejecutor debe recotizar antes, A3)", () => {
    const facts = setup();
    expect(checkTuitionExecution({ ...facts, now: facts.now.plusMinutes(15) })).toEqual(["QUOTE_EXPIRED"]);
  });

  it("una cotización de otra ruta o receptor no está cubierta por la aprobación", () => {
    const facts = setup();
    const e = tuitionFacts("base").quotes.find((q) => q.routeId === "E")!;
    expect(checkTuitionExecution({ ...facts, quote: e })).toContain("APPROVAL_INVALID");
    expect(checkTuitionExecution({ ...facts, quote: { ...facts.quote, net: cny("19000.00") } })).toContain("APPROVAL_INVALID");
  });

  it("máximo acumulado: con USD 1,500.00 ya comprometidos se bloquea (S03)", () => {
    expect(checkTuitionExecution(setup({ committedToObligation: usd("1500.00") }))).toEqual(["EXCEEDS_PAYER_MAX"]);
  });

  it("si el pagador bajó el máximo después de aprobar, gana el más estricto (N11)", () => {
    const facts = setup();
    expect(checkTuitionExecution({ ...facts, policy: { ...facts.policy, maxTuitionDebit: usd("2500.00") } })).toEqual(["EXCEEDS_PAYER_MAX"]);
  });

  it("si la reserva ya no se conserva, BREAKS_RESERVE", () => {
    const facts = setup();
    expect(checkTuitionExecution({ ...facts, funds: { ...facts.funds, balance: usd("4500.00") } })).toEqual(["BREAKS_RESERVE"]);
  });
});
