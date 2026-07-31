"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateAnalytics, formatMoney } from "../lib/analytics";
import { createActivity } from "../lib/activity";
import { seedState } from "../lib/seed";
import { can } from "../lib/permissions";
import { stageLabels, taskStatusLabels, type DealStage, type TaskStatus, type WorkspaceState } from "../lib/types";

const nav = [
  ["dashboard", "Огляд", "⌂"], ["clients", "Клієнти", "◎"], ["deals", "Угоди", "◇"], ["tasks", "Завдання", "✓"],
  ["analytics", "Аналітика", "↗"], ["activity", "Активність", "◷"], ["team", "Команда", "♙"], ["settings", "Налаштування", "⚙"],
];

const titleMap: Record<string, [string, string]> = {
  dashboard: ["Огляд", "Фокус команди на сьогодні"], clients: ["Клієнти", "Єдина база компаній і контактів"], deals: ["Угоди", "Керуйте рухом продажів"],
  tasks: ["Завдання", "Наступні дії без втрат"], analytics: ["Аналітика", "Рішення на основі живих даних"], activity: ["Активність", "Прозора історія роботи"],
  team: ["Команда", "Учасники, ролі та доступ"], settings: ["Налаштування", "Робочий простір і персоналізація"],
};

function Avatar({ initials }: { initials: string }) { return <span className="avatar">{initials}</span>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="empty"><span>◇</span><p>{children}</p></div>; }

export function CrmApp({ section }: { section: string }) {
  const safeSection = titleMap[section] ? section : "dashboard";
  const [state, setState] = useState<WorkspaceState>(seedState);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"client" | "deal" | "task" | null>(null);
  const [notice, setNotice] = useState("");
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [dark, setDark] = useState(false);
  const analytics = useMemo(() => calculateAnalytics(state), [state]);
  const me = state.members.find((member) => member.id === state.currentUserId) ?? state.members[0];

  useEffect(() => {
    fetch("/api/workspace").then((r) => r.ok ? r.json() : Promise.reject()).then(setState).catch(() => setNotice("Демо-дані відкрито локально")).finally(() => setLoaded(true));
  }, []);

  async function persist(next: WorkspaceState, message: string) {
    const previous = state;
    setState(next); setNotice(message);
    const response = await fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }).catch(() => null);
    if (!response?.ok) { setState(previous); setNotice("Не вдалося зберегти. Зміни скасовано."); }
    window.setTimeout(() => setNotice(""), 2600);
  }

  function moveDeal(id: string, stage: DealStage) {
    const deal = state.deals.find((item) => item.id === id); if (!deal || deal.stage === stage) return;
    const next = { ...state, deals: state.deals.map((item) => item.id === id ? { ...item, stage, probability: stage === "won" ? 100 : stage === "lost" ? 0 : item.probability } : item), activities: [createActivity(me.id, "перемістив угоду", "deal", id, `${stageLabels[deal.stage]} → ${stageLabels[stage]}`), ...state.activities] };
    void persist(next, `Угоду переміщено: ${stageLabels[stage]}`);
  }

  function changeTask(id: string, status: TaskStatus) {
    const task = state.tasks.find((item) => item.id === id); if (!task) return;
    const next = { ...state, tasks: state.tasks.map((item) => item.id === id ? { ...item, status } : item), activities: [createActivity(me.id, status === "done" ? "завершив завдання" : "змінив статус завдання", "task", id, task.title), ...state.activities] };
    void persist(next, status === "done" ? "Завдання завершено" : "Статус оновлено");
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get("name") || "").trim(); if (!name) return;
    if (modal === "client") {
      const id = crypto.randomUUID(); const next = { ...state, clients: [{ id, name, industry: String(data.get("industry") || "Послуги"), contact: String(data.get("contact") || "—"), email: String(data.get("email") || ""), phone: "", status: "lead" as const, ownerId: me.id, updatedAt: new Date().toISOString() }, ...state.clients], activities: [createActivity(me.id, "додав клієнта", "client", id, name), ...state.activities] }; void persist(next, "Клієнта додано");
    }
    if (modal === "deal") {
      const id = crypto.randomUUID(); const next = { ...state, deals: [{ id, title: name, clientId: String(data.get("clientId") || state.clients[0].id), stage: "new" as const, value: Number(data.get("value") || 0), probability: 20, ownerId: me.id, source: "Вручну", nextAction: "Уточнити потребу", closeDate: new Date(Date.now() + 30 * 86400000).toISOString() }, ...state.deals], activities: [createActivity(me.id, "створив угоду", "deal", id, name), ...state.activities] }; void persist(next, "Угоду створено");
    }
    if (modal === "task") {
      const id = crypto.randomUUID(); const next = { ...state, tasks: [{ id, title: name, status: "todo" as const, priority: String(data.get("priority") || "medium") as "low" | "medium" | "high", assigneeId: me.id, dueDate: String(data.get("dueDate") || new Date().toISOString()) }, ...state.tasks], activities: [createActivity(me.id, "створив завдання", "task", id, name), ...state.activities] }; void persist(next, "Завдання створено");
    }
    setModal(null);
  }

  return <div className={`app-shell ${dark ? "dark" : ""}`}>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">F</span><span>FlowDesk</span></Link>
      <button className="workspace-switch"><span><small>Робочий простір</small><strong>{state.workspace.name}</strong></span><span>⌄</span></button>
      <nav>{nav.map(([slug, label, icon]) => <Link key={slug} className={safeSection === slug ? "active" : ""} href={`/app/${slug}`}><span>{icon}</span>{label}{slug === "tasks" && analytics.overdue > 0 ? <b>{analytics.overdue}</b> : null}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="usage"><div><span>Командний план</span><b>4 з 10 місць</b></div><i><em style={{ width: "40%" }} /></i></div><button className="profile"><Avatar initials={me.initials}/><span><strong>{me.name}</strong><small>{me.title}</small></span><span>•••</span></button></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div><h1>{titleMap[safeSection][0]}</h1><p>{titleMap[safeSection][1]}</p></div><div className="top-actions"><label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук…" /></label><button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Змінити тему">{dark ? "☀" : "◐"}</button><button className="icon-btn" aria-label="Сповіщення">♢<i /></button>{["clients", "deals", "tasks"].includes(safeSection) && <button className="primary" onClick={() => setModal(safeSection === "clients" ? "client" : safeSection === "deals" ? "deal" : "task")}>＋ Додати</button>}</div></header>
      <div className={`content ${loaded ? "loaded" : "loading"}`}>
        {safeSection === "dashboard" && <Dashboard state={state} analytics={analytics} changeTask={changeTask} />}
        {safeSection === "clients" && <Clients state={state} query={query} />}
        {safeSection === "deals" && <Deals state={state} moveDeal={moveDeal} />}
        {safeSection === "tasks" && <Tasks state={state} view={taskView} setView={setTaskView} changeTask={changeTask} />}
        {safeSection === "analytics" && <Analytics state={state} analytics={analytics} />}
        {safeSection === "activity" && <ActivityFeed state={state} />}
        {safeSection === "team" && <Team state={state} canManage={can(me.role, "manage_members")} />}
        {safeSection === "settings" && <Settings state={state} dark={dark} setDark={setDark} />}
      </div>
    </main>
    {notice && <div className="toast">✓ {notice}</div>}
    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><small>Northline Studio</small><h2>{modal === "client" ? "Новий клієнт" : modal === "deal" ? "Нова угода" : "Нове завдання"}</h2></div><button onClick={() => setModal(null)}>×</button></div><form onSubmit={addRecord}><label>{modal === "client" ? "Назва компанії" : modal === "deal" ? "Назва угоди" : "Назва завдання"}<input name="name" autoFocus required placeholder="Введіть назву" /></label>{modal === "client" && <><label>Галузь<input name="industry" placeholder="Наприклад, консалтинг" /></label><label>Контактна особа<input name="contact" placeholder="Ім’я та прізвище" /></label><label>Email<input name="email" type="email" placeholder="name@company.ua" /></label></>}{modal === "deal" && <><label>Клієнт<select name="clientId">{state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Бюджет, ₴<input name="value" type="number" min="0" defaultValue="100000" /></label></>}{modal === "task" && <><label>Пріоритет<select name="priority"><option value="low">Низький</option><option value="medium">Середній</option><option value="high">Високий</option></select></label><label>Дедлайн<input name="dueDate" type="date" required /></label></>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => setModal(null)}>Скасувати</button><button className="primary">Створити</button></div></form></div></div>}
  </div>;
}

function Dashboard({ state, analytics, changeTask }: { state: WorkspaceState; analytics: ReturnType<typeof calculateAnalytics>; changeTask: (id: string, status: TaskStatus) => void }) {
  const urgent = state.tasks.filter((t) => t.status !== "done").slice(0, 4);
  return <><section className="welcome"><div><span className="eyebrow">П’ятниця, 31 липня</span><h2>Добрий день, Олександре.</h2><p>У фокусі — 3 активні угоди та {urgent.length} наступні дії команди.</p></div><div className="pulse"><span>Темп тижня</span><strong>+18%</strong><small>до минулого тижня</small></div></section><section className="metrics"><Metric label="Активний pipeline" value={formatMoney(analytics.pipelineValue)} note={`${analytics.openCount} угоди у роботі`} tone="violet"/><Metric label="Прогнозований дохід" value={formatMoney(analytics.weightedForecast)} note="з урахуванням імовірності" tone="blue"/><Metric label="Конверсія" value={`${analytics.conversion}%`} note="за закритими угодами" tone="green"/><Metric label="Прострочені завдання" value={String(analytics.overdue)} note="потребують уваги" tone="orange"/></section><div className="dashboard-grid"><section className="panel focus-panel"><PanelHead title="Фокус на сьогодні" link="/app/tasks"/><div className="focus-list">{urgent.map((task) => <div className="focus-row" key={task.id}><button onClick={() => changeTask(task.id, "done")} className="check" aria-label="Завершити завдання"/><div><strong>{task.title}</strong><small>{state.clients.find((c) => c.id === task.clientId)?.name ?? "Внутрішнє завдання"}</small></div><span className={`priority ${task.priority}`}>{task.priority === "high" ? "Високий" : task.priority === "medium" ? "Середній" : "Низький"}</span><time>{new Date(task.dueDate).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</time></div>)}</div></section><section className="panel pipeline-card"><PanelHead title="Воронка продажів" link="/app/deals"/><div className="funnel">{(["new", "contacted", "proposal", "negotiation"] as DealStage[]).map((stage, index) => { const list = state.deals.filter((d) => d.stage === stage); return <div key={stage}><span style={{ width: `${100 - index * 12}%` }}><b>{stageLabels[stage]}</b><em>{list.length}</em></span><small>{formatMoney(list.reduce((s, d) => s + d.value, 0))}</small></div>})}</div></section></div><section className="panel recent"><PanelHead title="Остання активність" link="/app/activity"/><ActivityRows state={state} limit={4}/></section></>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) { return <div className={`metric ${tone}`}><div><span>{label}</span><i>↗</i></div><strong>{value}</strong><small>{note}</small></div> }
function PanelHead({ title, link }: { title: string; link: string }) { return <div className="panel-head"><h3>{title}</h3><Link href={link}>Переглянути все →</Link></div> }

function Clients({ state, query }: { state: WorkspaceState; query: string }) {
  const clients = state.clients.filter((c) => `${c.name} ${c.contact} ${c.industry}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel table-panel"><div className="table-tools"><div className="tabs"><button className="selected">Усі <b>{state.clients.length}</b></button><button>Активні</button><button>Ліди</button><button>Архів</button></div><button className="secondary">☷ Фільтри</button></div>{clients.length ? <div className="data-table"><div className="tr th"><span>Компанія</span><span>Контакт</span><span>Статус</span><span>Відповідальний</span><span>Оновлено</span></div>{clients.map((client) => { const owner = state.members.find((m) => m.id === client.ownerId); return <Link href={`/app/clients?client=${client.id}`} className="tr" key={client.id}><span className="company"><i>{client.name.slice(0, 2).toUpperCase()}</i><span><strong>{client.name}</strong><small>{client.industry}</small></span></span><span><strong>{client.contact}</strong><small>{client.email}</small></span><span><b className={`status ${client.status}`}>{client.status === "active" ? "Активний" : client.status === "lead" ? "Лід" : "Архів"}</b></span><span className="owner"><Avatar initials={owner?.initials ?? "—"}/>{owner?.name}</span><span>{new Date(client.updatedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}<b className="row-menu">•••</b></span></Link>})}</div> : <Empty>Клієнтів за цим запитом не знайдено</Empty>}</section>;
}

function Deals({ state, moveDeal }: { state: WorkspaceState; moveDeal: (id: string, stage: DealStage) => void }) {
  const stages: DealStage[] = ["new", "contacted", "proposal", "negotiation", "won"];
  const [dragId, setDragId] = useState<string | null>(null);
  return <><div className="kanban-summary"><div><span>Pipeline value</span><strong>{formatMoney(calculateAnalytics(state).pipelineValue)}</strong></div><div><span>Weighted forecast</span><strong>{formatMoney(calculateAnalytics(state).weightedForecast)}</strong></div><div className="tabs"><button className="selected">Kanban</button><button>Список</button></div></div><section className="kanban">{stages.map((stage) => { const deals = state.deals.filter((deal) => deal.stage === stage); return <div className="kanban-column" key={stage} onDragOver={(e) => e.preventDefault()} onDrop={() => dragId && moveDeal(dragId, stage)}><header><span><i className={`dot ${stage}`}/>{stageLabels[stage]} <b>{deals.length}</b></span><em>{formatMoney(deals.reduce((sum, deal) => sum + deal.value, 0))}</em></header><div className="deal-list">{deals.map((deal) => { const client = state.clients.find((c) => c.id === deal.clientId); const owner = state.members.find((m) => m.id === deal.ownerId); return <article draggable onDragStart={() => setDragId(deal.id)} className="deal-card" key={deal.id}><div className="deal-client"><i>{client?.name.slice(0,2).toUpperCase()}</i><span>{client?.name}</span><b>•••</b></div><h3>{deal.title}</h3><strong>{formatMoney(deal.value)}</strong><div className="deal-meta"><span>{deal.probability}%</span><span>◇ {new Date(deal.closeDate).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span><Avatar initials={owner?.initials ?? "—"}/></div><p>→ {deal.nextAction || "Наступна дія не вказана"}</p></article>})}{deals.length === 0 && <div className="dropzone">Перетягніть угоду сюди</div>}</div></div>})}</section></>;
}

function Tasks({ state, view, setView, changeTask }: { state: WorkspaceState; view: "list" | "board"; setView: (v: "list" | "board") => void; changeTask: (id: string, status: TaskStatus) => void }) {
  return <><div className="task-toolbar"><div className="tabs"><button className="selected">Мої завдання <b>{state.tasks.filter((t) => t.status !== "done").length}</b></button><button>Усі</button><button>Прострочені</button></div><div className="view-toggle"><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>☷ Список</button><button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>▦ Дошка</button></div></div>{view === "list" ? <section className="panel tasks-list">{state.tasks.map((task) => <TaskRow key={task.id} task={task} state={state} changeTask={changeTask}/>)}</section> : <section className="task-board">{(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => <div className="kanban-column" key={status}><header><span>{taskStatusLabels[status]}</span><b>{state.tasks.filter((t) => t.status === status).length}</b></header>{state.tasks.filter((t) => t.status === status).map((task) => <article className="task-card" key={task.id}><span className={`priority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3><small>{state.clients.find((c) => c.id === task.clientId)?.name ?? "Внутрішнє"}</small><button onClick={() => changeTask(task.id, status === "done" ? "todo" : "done")}>{status === "done" ? "Повернути" : "Завершити"}</button></article>)}</div>)}</section>}</>;
}

function TaskRow({ task, state, changeTask }: { task: WorkspaceState["tasks"][number]; state: WorkspaceState; changeTask: (id: string, status: TaskStatus) => void }) { const assignee = state.members.find((m) => m.id === task.assigneeId); const overdue = task.status !== "done" && new Date(task.dueDate) < new Date(); return <div className={`task-row ${task.status === "done" ? "done" : ""}`}><button className="check" onClick={() => changeTask(task.id, task.status === "done" ? "todo" : "done")}>{task.status === "done" ? "✓" : ""}</button><div><strong>{task.title}</strong><small>{state.clients.find((c) => c.id === task.clientId)?.name ?? "Внутрішнє завдання"}</small></div><span className={`priority ${task.priority}`}>{task.priority}</span><span className={overdue ? "overdue" : ""}>◷ {new Date(task.dueDate).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span><span className="owner"><Avatar initials={assignee?.initials ?? "—"}/>{assignee?.name}</span><b>•••</b></div> }

function Analytics({ state, analytics }: { state: WorkspaceState; analytics: ReturnType<typeof calculateAnalytics> }) { const stages: DealStage[] = ["new", "contacted", "proposal", "negotiation", "won"]; const max = Math.max(...stages.map((s) => state.deals.filter((d) => d.stage === s).length), 1); return <><section className="metrics"><Metric label="Виграний дохід" value={formatMoney(analytics.wonValue)} note="за весь період" tone="green"/><Metric label="Зважений прогноз" value={formatMoney(analytics.weightedForecast)} note="відкриті угоди" tone="violet"/><Metric label="Конверсія" value={`${analytics.conversion}%`} note="виграно / закрито" tone="blue"/><Metric label="Середній чек" value={formatMoney(state.deals.reduce((s,d)=>s+d.value,0)/state.deals.length)} note="за всіма угодами" tone="orange"/></section><div className="analytics-grid"><section className="panel chart-panel"><PanelHead title="Конверсія воронки" link="/app/deals"/><div className="bar-chart">{stages.map((stage) => { const count = state.deals.filter((d) => d.stage === stage).length; return <div key={stage}><span>{count}</span><i><em style={{ height: `${Math.max(12, count/max*100)}%` }}/></i><small>{stageLabels[stage]}</small></div>})}</div></section><section className="panel sources"><h3>Джерела угод</h3>{Object.entries(state.deals.reduce<Record<string,number>>((acc,d)=>({ ...acc,[d.source]:(acc[d.source]||0)+1}),{})).map(([source,count])=><div key={source}><span>{source}</span><i><em style={{width:`${count/state.deals.length*100}%`}}/></i><b>{Math.round(count/state.deals.length*100)}%</b></div>)}</section></div></> }

function ActivityFeed({ state }: { state: WorkspaceState }) { return <section className="panel activity-page"><div className="activity-filter"><div className="tabs"><button className="selected">Усі події</button><button>Угоди</button><button>Клієнти</button><button>Завдання</button></div><button className="secondary">Експорт CSV</button></div><ActivityRows state={state}/></section> }
function ActivityRows({ state, limit }: { state: WorkspaceState; limit?: number }) { return <div className="activity-list">{state.activities.slice(0, limit).map((activity) => { const actor = state.members.find((m) => m.id === activity.actorId); return <div key={activity.id}><Avatar initials={actor?.initials ?? "—"}/><span><strong>{actor?.name}</strong> {activity.action}<small>{activity.detail}</small></span><time>{new Date(activity.at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</time></div>})}</div> }

function Team({ state, canManage }: { state: WorkspaceState; canManage: boolean }) { return <section className="panel team-panel"><div className="panel-head"><div><h3>Учасники робочого простору</h3><p>Керуйте доступом команди до клієнтських даних.</p></div>{canManage && <button className="primary">＋ Запросити учасника</button>}</div>{state.members.map((member) => <div className="member-row" key={member.id}><Avatar initials={member.initials}/><span><strong>{member.name}{member.id === state.currentUserId && <small> Ви</small>}</strong><small>{member.email}</small></span><span>{member.title}</span><b className={`role ${member.role}`}>{member.role === "owner" ? "Власник" : member.role === "admin" ? "Адмін" : "Учасник"}</b><button>•••</button></div>)}</section> }
function Settings({ state, dark, setDark }: { state: WorkspaceState; dark: boolean; setDark: (v: boolean) => void }) { return <div className="settings-grid"><section className="panel settings-card"><h3>Робочий простір</h3><label>Назва<input defaultValue={state.workspace.name}/></label><label>Часовий пояс<select defaultValue="Europe/Kyiv"><option>Europe/Kyiv</option><option>Europe/Chisinau</option></select></label><button className="primary">Зберегти зміни</button></section><section className="panel settings-card"><h3>Вигляд</h3><div className="setting-row"><span><strong>Темна тема</strong><small>Зменшує яскравість інтерфейсу</small></span><button className={`switch ${dark ? "on" : ""}`} onClick={() => setDark(!dark)}><i/></button></div><div className="setting-row"><span><strong>Щільний режим</strong><small>Більше даних на екрані</small></span><button className="switch"><i/></button></div></section><section className="panel settings-card danger"><h3>Небезпечна зона</h3><p>Видалення робочого простору незворотне.</p><button>Видалити простір</button></section></div> }
