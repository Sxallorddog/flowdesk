import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  avatar: text("avatar"),
  ...timestamps,
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  ...timestamps,
});

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "member"] }).notNull(),
  title: text("title").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("uq_members_workspace_user").on(table.workspaceId, table.userId)]);

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status", { enum: ["active", "lead", "archived"] }).notNull(),
  ownerId: text("owner_id").references(() => users.id),
  ...timestamps,
}, (table) => [index("idx_clients_workspace_name").on(table.workspaceId, table.name)]);

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  position: text("position"),
  ...timestamps,
});

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  stage: text("stage", { enum: ["new", "contacted", "proposal", "negotiation", "won", "lost"] }).notNull(),
  value: integer("value").notNull(),
  probability: integer("probability").notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  source: text("source").notNull(),
  nextAction: text("next_action"),
  closeDate: text("close_date"),
  lossReason: text("loss_reason"),
  ...timestamps,
}, (table) => [index("idx_deals_workspace_stage").on(table.workspaceId, table.stage)]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
  clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  status: text("status", { enum: ["todo", "in_progress", "done"] }).notNull(),
  priority: text("priority", { enum: ["low", "medium", "high"] }).notNull(),
  assigneeId: text("assignee_id").notNull().references(() => users.id),
  dueDate: text("due_date").notNull(),
  ...timestamps,
}, (table) => [index("idx_tasks_workspace_status_due").on(table.workspaceId, table.status, table.dueDate)]);

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  metadata: text("metadata", { mode: "json" }).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_activities_workspace_entity").on(table.workspaceId, table.entityType, table.entityId)]);

export const workspaceSnapshots = sqliteTable("workspace_snapshots", {
  workspaceId: text("workspace_id").primaryKey(),
  payload: text("payload", { mode: "json" }).notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});
