import { tuitionDebitReasons, type FundsSnapshot } from "../cash/CashInvariants";
import { Money } from "../money/Money";
import { sortReasons, type ReasonCode } from "../policy/ReasonCode";
import type { RouteQuote } from "../policy/RouteQuote";
import type { VirtualInstant } from "../time/Instant";
import type { TuitionApprovalPayload } from "./ApprovalPayload";

export type RequoteDecision =
  | { readonly allowed: true; readonly previousDebit: Money; readonly newDebit: Money }
  | { readonly allowed: false; readonly reasons: readonly ReasonCode[] };

/**
 * Enmienda A3: la aprobación cubre ruta, receptor y monto máximo. Si la cotización venció, el ejecutor puede
 * recotizar LA MISMA ruta y ejecutar solo si el débito sigue dentro del máximo y se conserva la reserva.
 * El máximo efectivo es el menor entre el aprobado y el vigente del pagador.
 */
export function checkRequoteWithinApproval(input: {
  readonly approved: TuitionApprovalPayload;
  readonly newQuote: RouteQuote;
  readonly funds: FundsSnapshot;
  readonly currentPolicy: { readonly maxTuitionDebit: Money; readonly reserve: Money };
  readonly committedToObligation: Money;
  readonly now: VirtualInstant;
  readonly targetArrivalAt: VirtualInstant;
}): RequoteDecision {
  const { approved, newQuote } = input;
  const approvedNet = Money.fromJSON(approved.netAmount);
  const sameScope =
    newQuote.routeId === approved.routeId &&
    newQuote.channel === approved.channel &&
    newQuote.receiverId === approved.receiverId &&
    newQuote.net.equals(approvedNet);
  if (!sameScope) return { allowed: false, reasons: ["APPROVAL_INVALID"] };

  const approvedMax = Money.fromJSON(approved.maxDebit);
  const approvedReserve = Money.fromJSON(approved.reserve);
  const reasons: ReasonCode[] = tuitionDebitReasons({
    debit: newQuote.debit,
    funds: input.funds,
    reserve: Money.max(approvedReserve, input.currentPolicy.reserve),
    maxTuitionDebit: Money.min(approvedMax, input.currentPolicy.maxTuitionDebit),
    committedToObligation: input.committedToObligation,
  });
  if (input.now.plusMinutes(newQuote.arrivalMinutes).isAfter(input.targetArrivalAt)) reasons.push("DEADLINE_MISSED");
  if (reasons.length > 0) return { allowed: false, reasons: sortReasons(reasons) };
  return { allowed: true, previousDebit: Money.fromJSON(approved.proposedDebit), newDebit: newQuote.debit };
}
