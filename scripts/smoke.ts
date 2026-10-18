import { getArg, runMain } from "./lib/args";

// Smoke contra un despliegue (BUILD_PROMPT 17). Fase 0: salud del servicio y de la base.
// Desde la Fase 2/3: crea un espacio, corre T1 en modo estructurado y verifica CREDITED.
runMain(async () => {
  const baseUrl = (getArg("base-url") ?? "http://localhost:3000").replace(/\/$/, "");
  console.log(`smoke: ${baseUrl}`);

  const health = await fetch(`${baseUrl}/api/health`, { headers: { accept: "application/json" } });
  const body = (await health.json().catch(() => ({}))) as { status?: string; database?: string; commit?: string };
  console.log(`GET /api/health -> ${health.status} status=${body.status} database=${body.database} commit=${body.commit}`);
  if (health.status !== 200 || body.status !== "ok" || body.database !== "ok") return 1;

  const home = await fetch(`${baseUrl}/`);
  const html = await home.text();
  const labelled = html.includes("Simulated funds");
  console.log(`GET / -> ${home.status} simulation band=${labelled ? "present" : "missing"}`);
  if (home.status !== 200 || !labelled) return 1;

  console.log("smoke: OK");
  return 0;
});
