import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("marketing surface contains the core FlowDesk conversion path", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Ведіть клієнтів/);
  assert.match(page, /Створити робочий простір/);
  assert.match(page, /Відкрити демо/);
  assert.match(layout, /FlowDesk — CRM для невеликих команд/);
  assert.doesNotMatch(page + layout, /codex-preview|react-loading-skeleton|Starter Project/);
});

test("private CRM route is excluded from search indexing", async () => {
  const [appPage, robots, sitemap] = await Promise.all([
    readFile(new URL("../app/app/[[...section]]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);
  assert.match(appPage, /index: false, follow: false/);
  assert.match(robots, /disallow: \["\/app\/", "\/api\/"\]/);
  assert.doesNotMatch(sitemap, /\/app/);
});

test("requested CRM interactions are wired to real state changes", async () => {
  const [onboarding, crm] = await Promise.all([
    readFile(new URL("../app/onboarding/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/crm-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(onboarding, /draggable/);
  assert.match(onboarding, /reorderStage/);
  assert.match(onboarding, /pipelineStages: \[\.\.\.stages, lost\]/);
  assert.match(crm, /function ClientDrawer/);
  assert.match(crm, /оновив картку клієнта/);
  assert.match(crm, /setFilter\("deal"\)/);
  assert.match(crm, /function Notifications/);
  assert.match(crm, /setModal\("member"\)/);
});
