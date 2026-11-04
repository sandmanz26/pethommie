// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * backend/supabase/setup.sql is what the owner pastes into Supabase's SQL Editor: every migration in one file, then the
 * checks of verify.sql. These tests prove it is current, that it builds exactly the database the migrations build, that
 * its checks all pass, and that running it a second time changes nothing.
 */

const supabaseDir = new URL("../../../../backend/supabase/", import.meta.url);
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, supabaseDir)), "utf8");
const migrationFiles = readdirSync(fileURLToPath(new URL("migrations/", supabaseDir))).filter((f) => f.endsWith(".sql")).sort();
const migrations = migrationFiles.map((f) => read(`migrations/${f}`));
const setupSql = read("setup.sql");
const verifySql = read("verify.sql");

// Supabase's pieces, as schema.test.ts stubs them.
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;
// A real Supabase project also hands every new table and function in `public` to the API roles by default. The checks
// must pass there too.
const SUPABASE_DEFAULT_GRANTS = `
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

type Row = Record<string, unknown>;
type Check = { no: number; pemeriksaan: string; diharapkan: string; hasil: string; status: string };

async function freshDb(extra = "") {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SUPABASE_STUB + extra);
  return db;
}

/** Everything a migration defines, as text, in a stable order. */
async function catalog(db: PGlite) {
  const rows = async (sql: string) => (await db.query<Row>(sql)).rows;
  return {
    columns: await rows(`select table_name, column_name, data_type, column_default, is_nullable from information_schema.columns
      where table_schema = 'public' order by table_name, ordinal_position`),
    constraints: await rows(`select conrelid::regclass::text as tbl, conname, pg_get_constraintdef(oid) as def from pg_constraint
      where connamespace = 'public'::regnamespace order by 1, 2`),
    indexes: await rows(`select indexname, indexdef from pg_indexes where schemaname = 'public' order by 1`),
    policies: await rows(`select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2`),
    rls: await rows(`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`),
    functions: await rows(`select p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_functiondef(p.oid) as def, p.proacl::text as acl
      from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1, 2`),
    triggers: await rows(`select tgname, pg_get_triggerdef(t.oid) as def from pg_trigger t join pg_class c on c.oid = t.tgrelid
      where c.relnamespace = 'public'::regnamespace and not t.tgisinternal order by 1`),
    grants: await rows(`select grantee, table_name, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated') order by 1, 2, 3`),
    extensions: await rows(`select extname from pg_extension order by 1`),
  };
}

/** The rows of the last statement of a script (setup.sql ends with the checks). */
async function runScript(db: PGlite, sql: string) {
  const results = await db.exec(sql);
  return results[results.length - 1].rows as unknown as Check[];
}

let fromMigrations: PGlite;
let fromSetup: PGlite;
let setupChecks: Check[];

beforeAll(async () => {
  fromMigrations = await freshDb();
  for (const m of migrations) await fromMigrations.exec(m);
  fromSetup = await freshDb();
  setupChecks = await runScript(fromSetup, setupSql);
}, 120_000);

afterAll(async () => {
  await fromMigrations.close();
  await fromSetup.close();
});

describe("setup.sql", () => {
  it("is up to date with the migrations (else run `npm run build:setup-sql`)", () => {
    const script = fileURLToPath(new URL("../../../scripts/build-setup-sql.mjs", import.meta.url));
    expect(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" })).not.toThrow();
  });

  it("holds every migration, whole and in order, inside one transaction, then the checks", () => {
    let from = setupSql.indexOf("\nbegin;\n");
    expect(from).toBeGreaterThan(0);
    for (const m of migrations) {
      const at = setupSql.indexOf(m.trimEnd(), from);
      expect(at, "a migration is missing or out of order").toBeGreaterThan(from);
      from = at + m.trimEnd().length;
    }
    const commit = setupSql.indexOf("\ncommit;\n", from);
    expect(commit).toBeGreaterThan(from);
    expect(setupSql.indexOf(verifySql.trimEnd(), commit)).toBeGreaterThan(commit);
  });

  it("builds exactly the database the migrations build", async () => {
    expect(await catalog(fromSetup)).toEqual(await catalog(fromMigrations));
  });

  it("ends with checks that all pass, and says so in the same words as verify.sql", async () => {
    expect(setupChecks.length).toBe(11);
    expect(setupChecks.filter((c) => c.status !== "OK")).toEqual([]);
    expect(await runScript(fromMigrations, verifySql)).toEqual(setupChecks);
  });

  it("passes its checks on a project with Supabase's default grants too", async () => {
    const db = await freshDb(SUPABASE_DEFAULT_GRANTS);
    try {
      const checks = await runScript(db, setupSql);
      expect(checks.filter((c) => c.status !== "OK")).toEqual([]);
    } finally {
      await db.close();
    }
  }, 60_000);

  it("a second run stops at once, with a clear message, and changes nothing", async () => {
    const before = await catalog(fromSetup);
    await expect(fromSetup.exec(setupSql)).rejects.toThrow(/SIOMOFU SUDAH TERPASANG/);
    await fromSetup.exec("rollback"); // what the SQL Editor does with a failed transaction
    expect(await catalog(fromSetup)).toEqual(before);
  });

  it("the checks run on an empty project too, and say what is missing", async () => {
    const db = await freshDb();
    try {
      const checks = await runScript(db, verifySql);
      expect(checks).toHaveLength(11);
      expect(checks.filter((c) => c.status === "OK").map((c) => c.no)).toEqual([]);
    } finally {
      await db.close();
    }
  }, 60_000);
});
