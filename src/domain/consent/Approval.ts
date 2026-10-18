import { ConsentMismatchError, DomainValidationError } from "../errors/DomainError";
import type { Money } from "../money/Money";
import type { ReasonCode } from "../policy/ReasonCode";
import type { HasherPort } from "../ports/HasherPort";
import { assertTransition, type TransitionTable } from "../shared/StateMachine";
import { VirtualInstant } from "../time/Instant";
import { fingerprintOf } from "./ApprovalPayload";

export type ApprovalSubjectType = "TUITION_PLAN" | "REMITTANCE";
export type ApprovalStatus = "ACTIVE" | "CONSUMED" | "REVOKED" | "INVALIDATED" | "EXPIRED";

const APPROVAL_TRANSITIONS: TransitionTable<ApprovalStatus> = {
  ACTIVE: ["CONSUMED", "REVOKED", "INVALIDATED", "EXPIRED"],
  CONSUMED: [],
  REVOKED: [],
  INVALIDATED: [],
  EXPIRED: [],
};

export interface ApprovalProps {
  readonly id: string;
  readonly workspaceId: string;
  readonly subjectType: ApprovalSubjectType;
  readonly subjectId: string;
  readonly subjectVersion: number;
  readonly payerActorId: string;
  readonly fingerprint: string;
  readonly canonicalPayload: Readonly<Record<string, unknown>>;
  readonly maxDebit: Money;
  readonly reserve: Money;
  readonly grantedAt: VirtualInstant;
  readonly expiresAt: VirtualInstant;
  readonly status: ApprovalStatus;
  readonly invalidationReason: string | null;
}

export interface ApprovalQuery {
  readonly subjectType: ApprovalSubjectType;
  readonly subjectId: string;
  readonly subjectVersion: number;
  readonly fingerprint: string;
  readonly now: VirtualInstant;
}

/** Vigencia: 24 h virtuales (configurable) o hasta el vencimiento de la obligación, lo que ocurra primero. */
export function approvalExpiry(requestedAt: VirtualInstant, obligationDueAt: VirtualInstant, validityHours: number): VirtualInstant {
  return VirtualInstant.earliest(requestedAt.plusHours(validityHours), obligationDueAt);
}

/**
 * Aprobación del pagador sobre una versión concreta de un plan (o de una remesa), con huella.
 * Solo se crea desde la sesión del pagador; la decisión nunca la toma el modelo.
 */
export class Approval {
  private constructor(private props: ApprovalProps) {}

  static grant(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly subjectType: ApprovalSubjectType;
    readonly subjectId: string;
    readonly subjectVersion: number;
    readonly payerActorId: string;
    readonly payload: object;
    readonly presentedFingerprint: string;
    readonly hasher: HasherPort;
    readonly now: VirtualInstant;
    readonly maxDebit: Money;
    readonly reserve: Money;
    readonly expiresAt: VirtualInstant;
  }): Approval {
    if (!input.expiresAt.isAfter(input.now)) throw new DomainValidationError("La aprobación ya estaría vencida");
    const fingerprint = fingerprintOf(input.payload, input.hasher);
    if (input.presentedFingerprint !== fingerprint) throw new ConsentMismatchError();
    return new Approval({
      id: input.id,
      workspaceId: input.workspaceId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectVersion: input.subjectVersion,
      payerActorId: input.payerActorId,
      fingerprint,
      canonicalPayload: { ...(input.payload as Record<string, unknown>) },
      maxDebit: input.maxDebit,
      reserve: input.reserve,
      grantedAt: input.now,
      expiresAt: input.expiresAt,
      status: "ACTIVE",
      invalidationReason: null,
    });
  }

  static rehydrate(props: ApprovalProps): Approval {
    return new Approval({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get status(): ApprovalStatus {
    return this.props.status;
  }
  get fingerprint(): string {
    return this.props.fingerprint;
  }
  get subjectId(): string {
    return this.props.subjectId;
  }
  get subjectVersion(): number {
    return this.props.subjectVersion;
  }
  get expiresAt(): VirtualInstant {
    return this.props.expiresAt;
  }
  get maxDebit(): Money {
    return this.props.maxDebit;
  }
  get reserve(): Money {
    return this.props.reserve;
  }
  get invalidationReason(): string | null {
    return this.props.invalidationReason;
  }

  toProps(): ApprovalProps {
    return { ...this.props };
  }

  /** Razones por las que esta aprobación NO sirve para la consulta; vacío si sirve. */
  usableFor(query: ApprovalQuery): ReasonCode[] {
    switch (this.props.status) {
      case "REVOKED":
        return ["APPROVAL_REVOKED"];
      case "INVALIDATED":
      case "CONSUMED":
        return ["APPROVAL_INVALID"];
      case "EXPIRED":
        return ["APPROVAL_EXPIRED"];
      case "ACTIVE":
        break;
    }
    if (!query.now.isBefore(this.props.expiresAt)) return ["APPROVAL_EXPIRED"];
    const matches =
      query.subjectType === this.props.subjectType &&
      query.subjectId === this.props.subjectId &&
      query.subjectVersion === this.props.subjectVersion &&
      query.fingerprint === this.props.fingerprint;
    return matches ? [] : ["APPROVAL_INVALID"];
  }

  /** Se consume al crear el intento de pago. */
  consume(): void {
    this.moveTo("CONSUMED");
  }

  revoke(): void {
    this.moveTo("REVOKED");
  }

  invalidate(reason: string): void {
    this.moveTo("INVALIDATED");
    this.props = { ...this.props, invalidationReason: reason };
  }

  markExpired(): void {
    this.moveTo("EXPIRED");
  }

  private moveTo(next: ApprovalStatus): void {
    assertTransition("Approval", APPROVAL_TRANSITIONS, this.props.status, next);
    this.props = { ...this.props, status: next };
  }
}
