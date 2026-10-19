import { afterAll, describe, expect, it } from "vitest";
import * as scriptedTasks from "@/app/api/evaluation/scripted-tasks/route";
import { RoleNotAllowedError, RateLimitedError } from "@/application/errors/ApplicationError";
import { RunScriptedTasksUseCase } from "@/application/usecases/RunScriptedTasksUseCase";
import { closeDb, getDb } from "@/infrastructure/db/client";
import { DbRateLimiter } from "@/infrastructure/auth/DrizzleSessionStore";
import { openWorkspace } from "../support/apiFlow";
import { app, eventTypes, newWorkspace } from "../support/integration";
import { ScriptedModel, chatWith, say } from "../support/scriptedModel";

// Consola del evaluador, "Run T1 to T8" (UI_UX 11.5): las ocho tareas en espacios nuevos, juzgadas por el servidor.
// El modelo es guionado; con el modelo real la misma tarea T8 la mide eval:agent.

afterAll(async () => {
  await closeDb();
});

const runner = (prefix: string, perWorkspacePerHour = 3) =>
  new RunScriptedTasksUseCase(app().deps, () => ({ ...app(), chat: chatWith(new ScriptedModel([() => say("I can't invest your reserve. I can plan your tuition payment or project your funds.")])) }), new DbRateLimiter(getDb()), {
    keyPrefix: `${prefix}-${Date.now().toString(36)}`,
    perWorkspacePerHour,
    perDay: 100,
  });

describe("Run T1 to T8 desde la consola", () => {
  it("las ocho tareas pasan, cada una en su propio espacio, y el espacio del evaluador solo recibe el resumen", async () => {
    const t = await newWorkspace("base");
    const run = await runner("scripted-ok").execute(t.evaluator);
    expect(run.tasks.map((x) => [x.id, x.passed, x.error])).toEqual(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"].map((id) => [id, true, null]));
    expect(run.passed).toBe(8);
    const spaces = new Set(run.tasks.map((x) => x.workspaceId));
    expect(spaces.size).toBe(8);
    expect(spaces.has(t.workspaceId)).toBe(false);
    const events = await app().deps.uow.read.events.list(t.workspaceId);
    expect(events.find((e) => e.type === "SCRIPTED_TASKS_RUN")?.payload).toMatchObject({ passed: 8, total: 8, failed: [] });
    expect(await eventTypes(t.workspaceId)).not.toContain("ATTEMPT_CREATED");
    expect((await app().deps.uow.read.attempts.listAll(t.workspaceId)).length).toBe(0);
  });

  it("solo el evaluador lo corre y el límite por espacio se aplica antes de crear espacios", async () => {
    const t = await newWorkspace("base");
    const limited = runner("scripted-limit", 1);
    await expect(limited.execute(t.student)).rejects.toBeInstanceOf(RoleNotAllowedError);
    await expect(limited.execute(t.payer)).rejects.toBeInstanceOf(RoleNotAllowedError);
    await limited.execute(t.evaluator);
    await expect(limited.execute(t.evaluator)).rejects.toBeInstanceOf(RateLimitedError);
    expect((await eventTypes(t.workspaceId)).filter((e) => e === "SCRIPTED_TASKS_RUN")).toHaveLength(1);
  });

  it("por HTTP, la sesión del estudiante o del pagador recibe 403", async () => {
    const ws = await openWorkspace("base");
    for (const role of ["student", "payer"] as const) {
      const res = await ws.browser.call(scriptedTasks.POST, "POST", "/api/evaluation/scripted-tasks", { role, body: {} });
      expect(res.status).toBe(403);
    }
    expect(await eventTypes(ws.workspaceId)).not.toContain("SCRIPTED_TASKS_RUN");
  });
});
