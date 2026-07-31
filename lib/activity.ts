import type { Activity } from "./types";

export function createActivity(actorId: string, action: string, entity: string, entityId: string, detail: string): Activity {
  return { id: crypto.randomUUID(), actorId, action, entity, entityId, detail, at: new Date().toISOString() };
}
