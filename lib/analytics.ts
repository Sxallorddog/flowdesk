import type { WorkspaceState } from "./types";

export function calculateAnalytics(state: WorkspaceState) {
  const open = state.deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const won = state.deals.filter((deal) => deal.stage === "won");
  const lost = state.deals.filter((deal) => deal.stage === "lost");
  const pipelineValue = open.reduce((sum, deal) => sum + deal.value, 0);
  const weightedForecast = open.reduce((sum, deal) => sum + deal.value * deal.probability / 100, 0);
  const wonValue = won.reduce((sum, deal) => sum + deal.value, 0);
  const conversion = won.length + lost.length ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
  const overdue = state.tasks.filter((task) => task.status !== "done" && new Date(task.dueDate) < new Date()).length;
  return { openCount: open.length, pipelineValue, weightedForecast, wonValue, conversion, overdue };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(value);
}
