import type { SessionDTO } from "@/application/dto/CaseDTO";
import { apiRoute } from "@/interfaces/http/route";

export const dynamic = "force-dynamic";

export const GET = apiRoute({ roles: ["student", "payer", "evaluator"], mutating: false }, async ({ actor, app }) => {
  const { workspace, displayName } = await app.readModels.session(actor);
  const body: SessionDTO = {
    synthetic: true,
    workspaceId: workspace.id,
    scenario: workspace.scenario,
    role: actor.role,
    displayName,
    virtualNow: workspace.virtualNow.toISOString(),
    sessionExpiresAt: workspace.expiresAt.toISOString(),
  };
  return body;
});
