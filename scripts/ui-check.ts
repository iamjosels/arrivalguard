import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { loadLocalEnv } from "../src/infrastructure/config/localEnv";
import { getArg, hasFlag, runMain } from "./lib/args";

// VC7 (AUTONOMIA 6): T1 completa solo con clics contra un servidor en marcha, con capturas a 1440 × 900 y 390 × 844
// en claro y oscuro (docs/design/screens/) y una pasada de axe por pantalla (docs/evidence/ui-axe.json).
// No es la suite E2E de P2: es un recorrido mínimo que falla si algún paso no aparece.
// Uso: pnpm ui:check --base-url http://localhost:3000 [--no-shots]

const SCREENS_DIR = path.join(process.cwd(), "docs", "design", "screens");
const EVIDENCE = path.join(process.cwd(), "docs", "evidence", "ui-axe.json");
const SIZES = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;
const THEMES = ["light", "dark"] as const;

interface AxeRow {
  readonly screen: string;
  /** Ancho del documento menos el de la ventana: debe ser 0 (sin scroll horizontal, UI_UX 14). */
  readonly horizontalOverflowPx: number;
  readonly serious: number;
  readonly critical: number;
  readonly ids: string[];
}

runMain(async () => {
  loadLocalEnv();
  const baseUrl = (getArg("base-url") ?? "http://localhost:3000").replace(/\/$/, "");
  const shots = !hasFlag("no-shots");
  const code = process.env.EVAL_ACCESS_CODE;
  if (!code) {
    console.log("EVAL_ACCESS_CODE: ausente");
    return 1;
  }
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
  const browser = await chromium.launch();
  const axe: AxeRow[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: baseUrl });
    const page = await context.newPage();
    const step = async (label: string, action: () => Promise<void>) => {
      const started = Date.now();
      try {
        await action();
      } catch (error) {
        const shot = getArg("fail-shot");
        if (shot) await page.screenshot({ path: shot, fullPage: true });
        console.log(`FAIL ${label}: ${page.url()}`);
        throw error;
      }
      console.log(`OK   ${label} (${Date.now() - started} ms)`);
    };

    await step("landing", async () => {
      await page.goto("/");
      await page.getByRole("heading", { name: /Tuition that arrives/ }).waitFor();
    });
    await capture(browser, baseUrl, context, "landing", "/", shots, axe);
    await capture(browser, baseUrl, context, "system", "/system", shots, axe);

    await step("acceso con el código de evaluación (escenario base)", async () => {
      await page.getByLabel("Evaluation code").fill(code);
      await page.getByRole("radio", { name: /Base scenario/ }).check();
      await page.getByRole("button", { name: "Open the demo" }).click();
      await page.waitForURL(/\/w\/[0-9a-f-]+\?as=student/);
      await page.getByRole("heading", { name: "Tuition invoice" }).waitFor();
    });
    const workspaceUrl = new URL(page.url());
    const workspacePath = workspaceUrl.pathname;
    await capture(browser, baseUrl, context, "student-empty", `${workspacePath}?as=student`, shots, axe);

    await step("Plan my payment (48 h): ruta B", async () => {
      await page.getByRole("button", { name: "Plan my payment" }).last().click();
      await page.getByText("Plan ready").first().waitFor();
      await page.getByText("Lowest cost that meets every rule").or(page.getByText("Selected").first()).first().waitFor();
    });

    await step("Request approval", async () => {
      await journey(page).getByRole("button", { name: "Request approval" }).click();
      await page.getByText("Approval requested from Carlos").first().waitFor();
    });
    await capture(browser, baseUrl, context, "student-waiting", `${workspacePath}?as=student`, shots, axe);

    await step("Carlos abre la solicitud", async () => {
      await page.getByRole("tab", { name: /Carlos, payer/ }).click();
      await page.waitForURL(/as=payer/);
      await page.getByRole("link", { name: "Review and approve" }).click();
      await page.getByRole("heading", { name: "Payment approval" }).waitFor();
    });
    const approvalPath = new URL(page.url()).pathname;
    await capture(browser, baseUrl, context, "approval-pending", approvalPath, shots, axe);

    await step("Approve this payment: aparece el sello", async () => {
      await page.getByRole("button", { name: "Approve this payment" }).click();
      await page.getByText(/Approved by Carlos Ramos/).waitFor();
      await page.getByRole("img", { name: /Consent seal, fingerprint/ }).first().waitFor();
    });
    await capture(browser, baseUrl, context, "approval-approved", approvalPath, shots, axe);
    await capture(browser, baseUrl, context, "payer", `${workspacePath}?as=payer`, shots, axe);

    await step("Sofía envía el pago", async () => {
      await page.goto(`${workspacePath}?as=student`);
      await journey(page).getByRole("button", { name: "Send payment" }).click();
      await page.getByText(/Waiting for the university/).first().waitFor();
    });

    await step("El evaluador avanza 24 horas", async () => {
      await page.getByRole("tab", { name: "Evaluator" }).click();
      await page.waitForURL(/as=evaluator/);
      await page.getByRole("button", { name: "24 hours" }).click();
      await page.getByText(/Virtual time moved to/).first().waitFor();
    });
    await capture(browser, baseUrl, context, "console", `${workspacePath}?as=evaluator`, shots, axe, ["dark"]);

    await step("Check this payment: CREDITED", async () => {
      await page.goto(`${workspacePath}?as=student`);
      const check = journey(page).getByRole("button", { name: "Check this payment" });
      if (await check.isVisible()) await check.click();
      await page.getByText("Credited by the university").first().waitFor();
    });
    await capture(browser, baseUrl, context, "student-credited", `${workspacePath}?as=student`, shots, axe);

    fs.writeFileSync(EVIDENCE, `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, screens: axe }, null, 2)}\n`);
    const serious = axe.reduce((n, r) => n + r.serious + r.critical, 0);
    console.log(`axe: ${axe.length} capturas revisadas, ${serious} violaciones serias o críticas (${path.relative(process.cwd(), EVIDENCE)})`);
    const wide = axe.filter((r) => r.horizontalOverflowPx > 0);
    console.log(`scroll horizontal: ${wide.length === 0 ? "ninguno" : wide.map((r) => `${r.screen} (+${r.horizontalOverflowPx} px)`).join(", ")}`);
    if (wide.length > 0) return 1;
    console.log("ui:check: OK (T1 CREDITED solo con clics)");
    return 0;
  } finally {
    await browser.close();
  }
});

/** El panel "Payment journey" de la zona B: ahí vive el siguiente paso (el acordeón de la zona A repite los nombres). */
function journey(page: Page) {
  return page.locator("section", { has: page.getByRole("heading", { name: "Payment journey" }) });
}

/** Captura una pantalla en cada tamaño y tema con la misma sesión (cookies) y corre axe en cada una. */
async function capture(
  browser: Browser,
  baseUrl: string,
  source: BrowserContext,
  name: string,
  url: string,
  shots: boolean,
  axe: AxeRow[],
  themes: readonly (typeof THEMES)[number][] = THEMES,
): Promise<void> {
  const state = await source.storageState();
  for (const size of SIZES) {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, baseURL: baseUrl, storageState: state, colorScheme: theme, reducedMotion: "reduce" });
      const page: Page = await context.newPage();
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      if (shots) await page.screenshot({ path: path.join(SCREENS_DIR, `${name}-${size.name}-${theme}.png`), fullPage: false });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const bad = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      axe.push({
        screen: `${name}-${size.name}-${theme}`,
        horizontalOverflowPx: overflow,
        serious: bad.filter((v) => v.impact === "serious").length,
        critical: bad.filter((v) => v.impact === "critical").length,
        ids: bad.map((v) => v.id),
      });
      await context.close();
    }
  }
}
