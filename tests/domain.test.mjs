import assert from "node:assert/strict";
import test from "node:test";
import { can, assertPermission } from "../lib/permissions.ts";
import { calculateAnalytics } from "../lib/analytics.ts";
import { createActivity } from "../lib/activity.ts";
import { seedState } from "../lib/seed.ts";

test("permission matrix keeps role boundaries", () => {
  assert.equal(can("owner", "manage_roles"), true);
  assert.equal(can("admin", "manage_roles"), false);
  assert.equal(can("member", "delete_records"), false);
  assert.throws(() => assertPermission("member", "manage_workspace"), /Недостатньо прав/);
});

test("analytics are derived from workspace records", () => {
  const result = calculateAnalytics(seedState);
  assert.equal(result.openCount, 4);
  assert.equal(result.pipelineValue, 1_066_000);
  assert.equal(result.wonValue, 228_000);
  assert.equal(result.conversion, 50);
});

test("activity metadata is generated for mutations", () => {
  const event = createActivity("u_owner", "створив угоду", "deal", "d_1", "Нова угода");
  assert.equal(event.actorId, "u_owner");
  assert.equal(event.entity, "deal");
  assert.ok(event.id.length > 10);
  assert.ok(Number.isFinite(Date.parse(event.at)));
});

test("pipeline stage configuration is complete and editable", () => {
  assert.deepEqual(seedState.pipelineStages.map((stage) => stage.id), ["new", "contacted", "proposal", "negotiation", "won", "lost"]);
  assert.equal(new Set(seedState.pipelineStages.map((stage) => stage.id)).size, seedState.pipelineStages.length);
  assert.ok(seedState.pipelineStages.every((stage) => stage.name.trim().length > 0));
});
