import type { Money, MoneyJSON } from "../money/Money";
import type { HasherPort } from "../ports/HasherPort";
import type { VirtualInstant } from "../time/Instant";
import { canonicalJson } from "./canonicalJson";

/** Campos exactos de la huella de una aprobación de matrícula (BUILD_PROMPT 8.4). */
export const TUITION_APPROVAL_FIELDS = [
  "workspaceId",
  "obligationId",
  "obligationVersion",
  "planId",
  "planVersion",
  "routeId",
  "channel",
  "receiverId",
  "reference",
  "sourceAccountId",
  "proposedDebit",
  "netAmount",
  "maxDebit",
  "reserve",
  "quoteId",
  "approvalExpiresAt",
] as const;

export interface TuitionApprovalPayload {
  readonly workspaceId: string;
  readonly obligationId: string;
  readonly obligationVersion: number;
  readonly planId: string;
  readonly planVersion: number;
  readonly routeId: string;
  readonly channel: string;
  readonly receiverId: string;
  readonly reference: string;
  readonly sourceAccountId: string;
  readonly proposedDebit: MoneyJSON;
  readonly netAmount: MoneyJSON;
  readonly maxDebit: MoneyJSON;
  readonly reserve: MoneyJSON;
  readonly quoteId: string;
  /** Hora virtual ISO. */
  readonly approvalExpiresAt: string;
}

export interface TuitionApprovalPayloadInput {
  readonly workspaceId: string;
  readonly obligationId: string;
  readonly obligationVersion: number;
  readonly planId: string;
  readonly planVersion: number;
  readonly routeId: string;
  readonly channel: string;
  readonly receiverId: string;
  readonly reference: string;
  readonly sourceAccountId: string;
  readonly proposedDebit: Money;
  readonly netAmount: Money;
  readonly maxDebit: Money;
  readonly reserve: Money;
  readonly quoteId: string;
  readonly approvalExpiresAt: VirtualInstant;
}

export function buildTuitionApprovalPayload(input: TuitionApprovalPayloadInput): TuitionApprovalPayload {
  return {
    workspaceId: input.workspaceId,
    obligationId: input.obligationId,
    obligationVersion: input.obligationVersion,
    planId: input.planId,
    planVersion: input.planVersion,
    routeId: input.routeId,
    channel: input.channel,
    receiverId: input.receiverId,
    reference: input.reference,
    sourceAccountId: input.sourceAccountId,
    proposedDebit: input.proposedDebit.toJSON(),
    netAmount: input.netAmount.toJSON(),
    maxDebit: input.maxDebit.toJSON(),
    reserve: input.reserve.toJSON(),
    quoteId: input.quoteId,
    approvalExpiresAt: input.approvalExpiresAt.toISOString(),
  };
}

/** SHA-256 hexadecimal del JSON canónico del payload. */
export function fingerprintOf(payload: object, hasher: HasherPort): string {
  return hasher.sha256Hex(canonicalJson(payload));
}

/** Primeros 8 caracteres: lo que se muestra como "Consent fingerprint". */
export function fingerprintPrefix(fingerprint: string): string {
  return fingerprint.slice(0, 8);
}
