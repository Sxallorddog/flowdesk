import { NextResponse } from "next/server";
import { seedState } from "../../../lib/seed";
import type { WorkspaceState } from "../../../lib/types";

export const dynamic = "force-dynamic";
const workspaceId = "ws_northline";

interface StatementLike {
  bind(...values: unknown[]): StatementLike;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface DatabaseLike {
  prepare(query: string): StatementLike;
}

let memoryState: WorkspaceState = structuredClone(seedState);

async function getDatabase(): Promise<DatabaseLike | null> {
  if (process.env.VERCEL) return null;

  // Vinext resolves this module at runtime on Cloudflare. Keeping the specifier
  // dynamic lets the same route compile for Vercel's Node.js runtime.
  const moduleName = "cloudflare:workers";
  const cloudflare = await import(/* @vite-ignore */ moduleName) as {
    env?: { DB?: DatabaseLike };
  };
  return cloudflare.env?.DB ?? null;
}

async function ensureStorage(database: DatabaseLike) {
  await database.prepare(`CREATE TABLE IF NOT EXISTS workspace_snapshots (
    workspace_id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`).run();
}

function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<WorkspaceState>;
  return !!state.workspace && Array.isArray(state.pipelineStages) && Array.isArray(state.clients) && Array.isArray(state.deals) && Array.isArray(state.tasks) && Array.isArray(state.activities) && Array.isArray(state.members);
}

export async function GET() {
  const database = await getDatabase();
  if (!database) return NextResponse.json(memoryState);

  await ensureStorage(database);
  const row = await database.prepare("SELECT payload FROM workspace_snapshots WHERE workspace_id = ?")
    .bind(workspaceId).first<{ payload: string }>();
  if (row) return NextResponse.json(JSON.parse(row.payload));
  const now = new Date().toISOString();
  await database.prepare("INSERT INTO workspace_snapshots (workspace_id, payload, version, updated_at) VALUES (?, ?, 1, ?)")
    .bind(workspaceId, JSON.stringify(seedState), now).run();
  return NextResponse.json(seedState);
}

export async function PUT(request: Request) {
  const state: unknown = await request.json();
  if (!isWorkspaceState(state) || state.workspace.id !== workspaceId) {
    return NextResponse.json({ error: "Некоректні дані робочого простору" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const database = await getDatabase();
  if (!database) {
    memoryState = structuredClone(state);
    return NextResponse.json({ ok: true, updatedAt: now });
  }

  await ensureStorage(database);
  await database.prepare(`INSERT INTO workspace_snapshots (workspace_id, payload, version, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(workspace_id) DO UPDATE SET payload = excluded.payload, version = version + 1, updated_at = excluded.updated_at`)
    .bind(workspaceId, JSON.stringify(state), now).run();
  return NextResponse.json({ ok: true, updatedAt: now });
}
