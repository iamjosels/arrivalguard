import { describe, expect, it } from "vitest";
import { Approval, approvalExpiry } from "@/domain/consent/Approval";
import {
  TUITION_APPROVAL_FIELDS,
  buildTuitionApprovalPayload,
  fingerprintOf,
  fingerprintPrefix,
  type TuitionApprovalPayload,
} from "@/domain/consent/ApprovalPayload";
import { canonicalJson } from "@/domain/consent/canonicalJson";
import { materialChanges, policyChangeReasons } from "@/domain/consent/MaterialChange";
import { checkRequoteWithinApproval } from "@/domain/consent/RequoteScope";
import { ConsentMismatchError, DomainValidationError, InvalidTransitionError } from "@/domain/errors/DomainError";
import { VirtualInstant } from "@/domain/time/Instant";
import { NodeHasher } from "@/infrastructure/crypto/NodeHasher";
import { UNIVERSITY_RECIPIENT, cny, tuitionFacts, usd } from "../../support/scenarioFacts";

const hasher = new NodeHasher();
const start = VirtualInstant.fromISO("2026-10-20T09:00:00.000Z");
const due = start.plusHours(48);

function payload(overrides: Partial<Parameters<typeof buildTuitionApprovalPayload>[0]> = {}): TuitionApprovalPayload {
  return buildTuitionApprovalPayload({
    workspaceId: "ws-1",
    obligationId: "obl-1",
    obligationVersion: 1,
    planId: "plan-1",
    planVersion: 1,
    routeId: "B",
    channel: "EDU_PAY_PARTNER",
    receiverId: UNIVERSITY_RECIPIENT,
    reference: "AG-STUDENT-01",
    sourceAccountId: "acc-payer",
    proposedDebit: usd("2860.00"),
    netAmount: cny("20000.00"),
    maxDebit: usd("2900.00"),
    reserve: usd("1800.00"),
    quoteId: "q-B",
    approvalExpiresAt: start.plusHours(24),
    ...overrides,
  });
}

function grant(p: TuitionApprovalPayload = payload(), presented = fingerprintOf(p, hasher)) {
  return Approval.grant({
    id: "apr-1",
    workspaceId: "ws-1",
    subjectType: "TUITION_PLAN",
    subjectId: p.planId,
    subjectVersion: p.planVersion,
    payerActorId: "act-payer",
    payload: p,
    presentedFingerprint: presented,
    hasher,
    now: start,
    maxDebit: usd("2900.00"),
    reserve: usd("1800.00"),
    expiresAt: VirtualInstant.fromISO(p.approvalExpiresAt),
  });
}

describe("JSON canónico (BUILD_PROMPT 8.4)", () => {
  it("ordena las claves y no depende del orden de inserción", () => {
    expect(canonicalJson({ b: 1, a: { d: "x", c: [3, 1] } })).toBe('{"a":{"c":[3,1],"d":"x"},"b":1}');
    expect(canonicalJson({ a: { c: [3, 1], d: "x" }, b: 1 })).toBe(canonicalJson({ b: 1, a: { d: "x", c: [3, 1] } }));
  });

  it("rechaza bigint, números no enteros, undefined y objetos que no son planos", () => {
    expect(() => canonicalJson({ a: 1n })).toThrow(DomainValidationError);
    expect(() => canonicalJson({ a: 28.6 })).toThrow(DomainValidationError);
    expect(() => canonicalJson({ a: undefined })).toThrow(DomainValidationError);
    expect(() => canonicalJson({ a: new Date(0) })).toThrow(DomainValidationError);
    expect(() => canonicalJson({ a: usd("1.00") })).toThrow(DomainValidationError);
  });
});

describe("Huella de consentimiento (VC3)", () => {
  it("el payload tiene exactamente los 16 campos de la sección 8.4, con dinero como {currency, minor}", () => {
    const p = payload();
    expect(Object.keys(p).sort()).toEqual([...TUITION_APPROVAL_FIELDS].sort());
    expect(p.proposedDebit).toEqual({ currency: "USD", minor: "286000" });
    expect(p.netAmount).toEqual({ currency: "CNY", minor: "2000000" });
    expect(p.approvalExpiresAt).toBe("2026-10-21T09:00:00.000Z");
  });

  it("es SHA-256 hexadecimal y estable para el mismo payload canónico", () => {
    const a = fingerprintOf(payload(), hasher);
    const b = fingerprintOf(payload(), hasher);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).toBe(hasher.sha256Hex(canonicalJson(payload())));
    expect(fingerprintPrefix(a)).toBe(a.slice(0, 8));
  });

  it("cambia ante cualquier cambio material de cualquiera de los 16 campos", () => {
    const original = fingerprintOf(payload(), hasher);
    const changes: Partial<Parameters<typeof buildTuitionApprovalPayload>[0]>[] = [
      { workspaceId: "ws-2" },
      { obligationId: "obl-2" },
      { obligationVersion: 2 },
      { planId: "plan-2" },
      { planVersion: 2 },
      { routeId: "D" },
      { channel: "EXPRESS_EDU" },
      { receiverId: "rcp-other" },
      { reference: "AG-STUDENT-02" },
      { sourceAccountId: "acc-other" },
      { proposedDebit: usd("2860.01") },
      { netAmount: cny("19999.99") },
      { maxDebit: usd("2899.99") },
      { reserve: usd("1800.01") },
      { quoteId: "q-B-2" },
      { approvalExpiresAt: start.plusHours(23) },
    ];
    expect(changes).toHaveLength(16);
    const seen = new Set([original]);
    for (const change of changes) {
      const fp = fingerprintOf(payload(change), hasher);
      expect(fp, JSON.stringify(Object.keys(change))).not.toBe(original);
      seen.add(fp);
    }
    expect(seen.size).toBe(17);
  });

  it("la misma cifra en otra moneda da otra huella", () => {
    expect(fingerprintOf(payload({ proposedDebit: Money2("CNY", "2860.00") }), hasher)).not.toBe(fingerprintOf(payload(), hasher));
  });
});

describe("Aprobación ligada a plan, versión y huella (VC3)", () => {
  it("se concede solo si el pagador reenvía la huella correcta", () => {
    expect(grant().status).toBe("ACTIVE");
    expect(() => grant(payload(), "0".repeat(64))).toThrow(ConsentMismatchError);
    expect(() => grant(payload(), fingerprintOf(payload({ planVersion: 2 }), hasher))).toThrow(ConsentMismatchError);
  });

  it("vale solo para su planId, su planVersion y su huella", () => {
    const approval = grant();
    const fp = fingerprintOf(payload(), hasher);
    const ok = { subjectType: "TUITION_PLAN" as const, subjectId: "plan-1", subjectVersion: 1, fingerprint: fp, now: start.plusHours(1) };
    expect(approval.usableFor(ok)).toEqual([]);
    expect(approval.usableFor({ ...ok, subjectId: "plan-2" })).toEqual(["APPROVAL_INVALID"]);
    expect(approval.usableFor({ ...ok, subjectVersion: 2 })).toEqual(["APPROVAL_INVALID"]);
    expect(approval.usableFor({ ...ok, fingerprint: fingerprintOf(payload({ routeId: "D" }), hasher) })).toEqual(["APPROVAL_INVALID"]);
    expect(approval.usableFor({ ...ok, subjectType: "REMITTANCE" })).toEqual(["APPROVAL_INVALID"]);
  });

  it("vence a las 24 h virtuales o al vencimiento de la obligación, lo que ocurra primero", () => {
    expect(approvalExpiry(start, due, 24).toISOString()).toBe(start.plusHours(24).toISOString());
    const late = start.plusHours(30);
    expect(approvalExpiry(late, due, 24).toISOString()).toBe(due.toISOString());
    const approval = grant();
    const fp = fingerprintOf(payload(), hasher);
    const at = (t: VirtualInstant) => approval.usableFor({ subjectType: "TUITION_PLAN", subjectId: "plan-1", subjectVersion: 1, fingerprint: fp, now: t });
    expect(at(start.plusHours(24).plusMinutes(-1))).toEqual([]);
    expect(at(start.plusHours(24))).toEqual(["APPROVAL_EXPIRED"]);
  });

  it("revocada, invalidada o consumida ya no sirve", () => {
    const fp = fingerprintOf(payload(), hasher);
    const query = { subjectType: "TUITION_PLAN" as const, subjectId: "plan-1", subjectVersion: 1, fingerprint: fp, now: start };
    const revoked = grant();
    revoked.revoke();
    expect(revoked.usableFor(query)).toEqual(["APPROVAL_REVOKED"]);
    const invalidated = grant();
    invalidated.invalidate("ROUTE_CHANGED");
    expect(invalidated.usableFor(query)).toEqual(["APPROVAL_INVALID"]);
    expect(invalidated.invalidationReason).toBe("ROUTE_CHANGED");
    const consumed = grant();
    consumed.consume();
    expect(consumed.status).toBe("CONSUMED");
    expect(consumed.usableFor(query)).toEqual(["APPROVAL_INVALID"]);
  });

  it("solo se consume una vez y no se revoca después de consumida", () => {
    const approval = grant();
    approval.consume();
    expect(() => approval.consume()).toThrow(InvalidTransitionError);
    expect(() => approval.revoke()).toThrow(InvalidTransitionError);
  });

  it("no se concede ya vencida", () => {
    expect(() => grant(payload({ approvalExpiresAt: start }))).toThrow(DomainValidationError);
  });
});

describe("Alcance A3: recotizar la misma ruta dentro de la aprobación (VC3)", () => {
  const approved = payload();
  const facts = tuitionFacts("base");
  const b = facts.quotes.find((q) => q.routeId === "B")!;
  const now = start.plusMinutes(20);
  const requote = (debit: string, extra: Partial<typeof b> = {}) => ({ ...b, quoteId: "q-B-2", debit: usd(debit), quotedAt: now, expiresAt: now.plusMinutes(15), ...extra });
  const base = {
    approved,
    funds: facts.funds,
    currentPolicy: facts.policy,
    committedToObligation: usd("0.00"),
    now,
    targetArrivalAt: start.plusHours(48),
  };

  it("con USD 2,865.00 ejecuta sin nueva aprobación y registra débito anterior y nuevo", () => {
    const result = checkRequoteWithinApproval({ ...base, newQuote: requote("2865.00") });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.previousDebit.toDecimalString()).toBe("2860.00");
      expect(result.newDebit.toDecimalString()).toBe("2865.00");
    }
  });

  it("con USD 2,905.00 (REQUOTE_ABOVE_MAX) bloquea con EXCEEDS_PAYER_MAX", () => {
    const result = checkRequoteWithinApproval({ ...base, newQuote: requote("2905.00") });
    expect(result).toEqual({ allowed: false, reasons: ["EXCEEDS_PAYER_MAX"] });
  });

  it("bloquea con BREAKS_RESERVE si el nuevo débito rompe la reserva", () => {
    const result = checkRequoteWithinApproval({ ...base, funds: { ...base.funds, balance: usd("4660.00") }, newQuote: requote("2865.00") });
    expect(result).toEqual({ allowed: false, reasons: ["BREAKS_RESERVE"] });
  });

  it("usa el menor entre el máximo aprobado y el máximo vigente del pagador", () => {
    const result = checkRequoteWithinApproval({
      ...base,
      currentPolicy: { ...base.currentPolicy, maxTuitionDebit: usd("2862.00") },
      newQuote: requote("2865.00"),
    });
    expect(result).toEqual({ allowed: false, reasons: ["EXCEEDS_PAYER_MAX"] });
  });

  it("no cubre otra ruta, otro canal, otro receptor ni otro neto", () => {
    for (const change of [{ routeId: "D" }, { channel: "EXPRESS_EDU" }, { receiverId: "rcp-other" }, { net: cny("19999.00") }]) {
      const result = checkRequoteWithinApproval({ ...base, newQuote: requote("2860.00", change) });
      expect(result, JSON.stringify(change)).toEqual({ allowed: false, reasons: ["APPROVAL_INVALID"] });
    }
  });
});

describe("Cambios materiales (BUILD_PROMPT 8.4)", () => {
  it("cambiar solo el objetivo sin cambiar de ruta no es un cambio material", () => {
    expect(materialChanges(payload(), payload({ planVersion: 1 }))).toEqual([]);
  });

  it("cambiar de ruta, receptor, neto, cuenta u obligación sí lo es", () => {
    expect(materialChanges(payload(), payload({ routeId: "D", channel: "EXPRESS_EDU" }))).toEqual(["routeId", "channel"]);
    expect(materialChanges(payload(), payload({ netAmount: cny("19800.00") }))).toEqual(["netAmount"]);
    expect(materialChanges(payload(), payload({ obligationVersion: 2 }))).toEqual(["obligationVersion"]);
    expect(materialChanges(payload(), payload({ sourceAccountId: "acc-2", receiverId: "rcp-2" }))).toEqual(["receiverId", "sourceAccountId"]);
  });

  it("un cambio de política que el plan ya no cumple invalida (N11); uno que sí cumple, no", () => {
    const facts = tuitionFacts("base");
    expect(policyChangeReasons(payload(), { maxTuitionDebit: usd("2500.00"), reserve: usd("1800.00") }, facts.funds, usd("0.00"))).toEqual(["EXCEEDS_PAYER_MAX"]);
    expect(policyChangeReasons(payload(), { maxTuitionDebit: usd("3000.00"), reserve: usd("1800.00") }, facts.funds, usd("0.00"))).toEqual([]);
    expect(policyChangeReasons(payload(), { maxTuitionDebit: usd("2900.00"), reserve: usd("2200.00") }, facts.funds, usd("0.00"))).toEqual(["BREAKS_RESERVE"]);
  });
});

function Money2(currency: "USD" | "CNY", text: string) {
  return currency === "USD" ? usd(text) : cny(text);
}
