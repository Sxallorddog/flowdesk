export type Role = "owner" | "admin" | "member";
export type DealStage = "new" | "contacted" | "proposal" | "negotiation" | "won" | "lost";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Person { id: string; name: string; initials: string; role: Role; title: string; email: string }
export interface Client { id: string; name: string; industry: string; contact: string; email: string; phone: string; status: "active" | "lead" | "archived"; ownerId: string; updatedAt: string }
export interface Deal { id: string; clientId: string; title: string; stage: DealStage; value: number; probability: number; ownerId: string; source: string; nextAction: string; closeDate: string; lossReason?: string }
export interface Task { id: string; title: string; status: TaskStatus; priority: "low" | "medium" | "high"; assigneeId: string; dealId?: string; clientId?: string; dueDate: string }
export interface Activity { id: string; actorId: string; action: string; entity: string; entityId: string; detail: string; at: string }
export interface WorkspaceState { workspace: { id: string; name: string; plan: string }; currentUserId: string; members: Person[]; clients: Client[]; deals: Deal[]; tasks: Task[]; activities: Activity[] }

export const stageLabels: Record<DealStage, string> = {
  new: "Новий лід",
  contacted: "Зв’язалися",
  proposal: "Пропозиція",
  negotiation: "Переговори",
  won: "Виграно",
  lost: "Програно",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "До виконання",
  in_progress: "У роботі",
  done: "Завершено",
};
