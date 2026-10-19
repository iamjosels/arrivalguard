import { apiRoute } from "@/interfaces/http/route";
import { revokeBody } from "@/interfaces/http/schemas";

export const dynamic = "force-dynamic";

// T6, revocar. Si el pago ya salió, se informa que revocar no garantiza detenerlo (nunca se promete).
export const POST = apiRoute({ roles: ["payer"], mutating: true, body: revokeBody }, async ({ actor, body, app }) => {
  const result = await app.revoke.execute(actor, { approvalId: body.approvalId, mandateId: body.mandateId });
  return {
    synthetic: true,
    ...result,
    message: result.revoked
      ? "Permission revoked. Nothing will be sent with it."
      : "This payment was already sent. Revoking cannot guarantee stopping it. Check its status.",
  };
});
