import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeSslMode } from "@/infrastructure/db/connection";

// VC5: las migraciones generadas se aplican sobre una base vacía (esquema temporal en la rama dev) y sobre la
// existente sin pérdida de datos. Solo usa la cadena directa de dev.

const folder = path.join(process.cwd(), "drizzle");
const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8")) as { entries: { tag: string }[] };
const statements = journal.entries.flatMap((entry) =>
  fs
    .readFileSync(path.join(folder, `${entry.tag}.sql`), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean),
);

const schema = `vc5_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: normalizeSslMode(process.env.DATABASE_URL_UNPOOLED ?? ""), connectionTimeoutMillis: 15_000 });
  await client.connect();
});

afterAll(async () => {
  await client.query(`drop schema if exists "${schema}" cascade`);
  await client.end();
});

describe("VC5: migraciones", { concurrent: false }, () => {
  it("el SQL generado no tiene operaciones destructivas", () => {
    for (const sql of statements) expect(sql, sql.slice(0, 80)).not.toMatch(/\bDROP\b|\bRENAME\b|ALTER COLUMN .* TYPE/i);
  });

  it("se aplica completo sobre un esquema vacío", async () => {
    await client.query(`create schema "${schema}"`);
    await client.query(`set search_path to "${schema}"`);
    for (const sql of statements) await client.query(sql.replaceAll('"public".', `"${schema}".`));
    const tables = await client.query<{ count: string }>("select count(*)::text as count from information_schema.tables where table_schema = $1", [schema]);
    expect(tables.rows[0]?.count).toBe("29");
    const partial = await client.query<{ indexname: string }>(
      "select indexname from pg_indexes where schemaname = $1 and indexdef like '%WHERE%' order by indexname",
      [schema],
    );
    expect(partial.rows.map((r) => r.indexname)).toEqual([
      "conversations_one_active_uq",
      "payment_attempts_one_active_per_subject_uq",
      "payment_attempts_one_credited_per_obligation_uq",
    ]);
    await client.query("set search_path to public");
  });

  it("se vuelve a aplicar sobre la base existente sin perder datos", async () => {
    const before = await client.query<{ workspaces: string; events: string }>(
      "select (select count(*) from public.workspaces)::text as workspaces, (select count(*) from public.domain_events)::text as events",
    );
    await migrate(drizzle(client), { migrationsFolder: folder });
    const after = await client.query<{ workspaces: string; events: string }>(
      "select (select count(*) from public.workspaces)::text as workspaces, (select count(*) from public.domain_events)::text as events",
    );
    expect(BigInt(after.rows[0]!.workspaces)).toBeGreaterThanOrEqual(BigInt(before.rows[0]!.workspaces));
    expect(BigInt(after.rows[0]!.events)).toBeGreaterThanOrEqual(BigInt(before.rows[0]!.events));
    const applied = await client.query<{ count: string }>("select count(*)::text as count from drizzle.__drizzle_migrations");
    expect(applied.rows[0]?.count).toBe(String(journal.entries.length));
  });
});
