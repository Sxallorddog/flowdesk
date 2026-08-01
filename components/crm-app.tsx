"use client";

import Link from "next/link";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createActivity } from "../lib/activity";
import { calculateAnalytics, formatMoney } from "../lib/analytics";
import { can } from "../lib/permissions";
import { seedState } from "../lib/seed";
import { stageLabels, taskStatusLabels, type Client, type DealStage, type TaskStatus, type WorkspaceState } from "../lib/types";

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
function Empty({ children }: { children: ReactNode }) { return <div className="empty"><span>◇</span><p>{children}</p></div>; }
function stageName(state: WorkspaceState, id: DealStage) { return state.pipelineStages.find((stage) => stage.id === id)?.name ?? stageLabels[id]; }

export function CrmApp({ section }: { section: string }) {
  const safeSection = titleMap[section] ? section : "dashboard";
  const [state, setState] = useState<WorkspaceState>(seedState);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"client" | "deal" | "task" | "member" | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [dark, setDark] = useState(false);
  const analytics = useMemo(() => calculateAnalytics(state), [state]);
  const me = state.members.find((member) => member.id === state.currentUserId) ?? state.members[0];

  useEffect(() => {
    fetch("/api/workspace")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((remote: WorkspaceState) => setState({ ...remote, pipelineStages: remote.pipelineStages ?? seedState.pipelineStages }))
      .catch(() => setNotice("Демо-дані відкрито локально"))
      .finally(() => setLoaded(true));
  }, []);

  async function persist(next: WorkspaceState, message: string) {
    const previous = state;
    setState(next);
    setNotice(message);
    const response = await fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }).catch(() => null);
    if (!response?.ok) { setState(previous); setNotice("Не вдалося зберегти. Зміни скасовано."); }
    window.setTimeout(() => setNotice(""), 2600);
  }

  function moveDeal(id: string, stage: DealStage) {
    const deal = state.deals.find((item) => item.id === id);
    if (!deal || deal.stage === stage) return;
    const next = {
      ...state,
      deals: state.deals.map((item) => item.id === id ? { ...item, stage, probability: stage === "won" ? 100 : stage === "lost" ? 0 : item.probability } : item),
      activities: [createActivity(me.id, "перемістив угоду", "deal", id, `${stageName(state, deal.stage)} → ${stageName(state, stage)}`), ...state.activities],
    };
    void persist(next, `Угоду переміщено: ${stageName(state, stage)}`);
  }

  function changeTask(id: string, status: TaskStatus) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    const next = {
      ...state,
      tasks: state.tasks.map((item) => item.id === id ? { ...item, status } : item),
      activities: [createActivity(me.id, status === "done" ? "завершив завдання" : "змінив статус завдання", "task", id, task.title), ...state.activities],
    };
    void persist(next, status === "done" ? "Завдання завершено" : "Статус оновлено");
  }

  function saveClient(updated: Client) {
    const next = {
      ...state,
      clients: state.clients.map((client) => client.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : client),
      activities: [createActivity(me.id, "оновив картку клієнта", "client", updated.id, updated.name), ...state.activities],
    };
    void persist(next, "Картку клієнта збережено");
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    if (modal === "client") {
      const id = crypto.randomUUID();
      const next = { ...state, clients: [{ id, name, industry: String(data.get("industry") || "Послуги"), contact: String(data.get("contact") || "—"), email: String(data.get("email") || ""), phone: String(data.get("phone") || ""), status: "lead" as const, ownerId: me.id, updatedAt: new Date().toISOString() }, ...state.clients], activities: [createActivity(me.id, "додав клієнта", "client", id, name), ...state.activities] };
      void persist(next, "Клієнта додано");
    } else if (modal === "deal") {
      const id = crypto.randomUUID();
      const next = { ...state, deals: [{ id, title: name, clientId: String(data.get("clientId") || state.clients[0].id), stage: "new" as const, value: Number(data.get("value") || 0), probability: 20, ownerId: me.id, source: "Вручну", nextAction: "Уточнити потребу", closeDate: new Date(Date.now() + 30 * 86400000).toISOString() }, ...state.deals], activities: [createActivity(me.id, "створив угоду", "deal", id, name), ...state.activities] };
      void persist(next, "Угоду створено");
    } else if (modal === "task") {
      const id = crypto.randomUUID();
      const next = { ...state, tasks: [{ id, title: name, status: "todo" as const, priority: String(data.get("priority") || "medium") as "low" | "medium" | "high", assigneeId: me.id, dueDate: String(data.get("dueDate") || new Date().toISOString()) }, ...state.tasks], activities: [createActivity(me.id, "створив завдання", "task", id, name), ...state.activities] };
      void persist(next, "Завдання створено");
    } else if (modal === "member") {
      const id = crypto.randomUUID();
      const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
      const next = { ...state, members: [...state.members, { id, name, initials, role: String(data.get("role") || "member") as "admin" | "member", title: String(data.get("title") || "Учасник"), email: String(data.get("email") || "") }], activities: [createActivity(me.id, "запросив учасника", "member", id, name), ...state.activities] };
      void persist(next, "Учасника додано до демо-команди");
    }
    setModal(null);
  }

  return <div className={`app-shell ${dark ? "dark" : ""}`}>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">F</span><span>FlowDesk</span></Link>
      <button className="workspace-switch"><span><small>Робочий простір</small><strong>{state.workspace.name}</strong></span><span>⌄</span></button>
      <nav>{nav.map(([slug, label, icon]) => <Link key={slug} className={safeSection === slug ? "active" : ""} href={`/app/${slug}`}><span>{icon}</span>{label}{slug === "tasks" && analytics.overdue > 0 ? <b>{analytics.overdue}</b> : null}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="usage"><div><span>Командний план</span><b>{state.members.length} з 10 місць</b></div><i><em style={{ width: `${state.members.length * 10}%` }} /></i></div><button className="profile"><Avatar initials={me.initials}/><span><strong>{me.name}</strong><small>{me.title}</small></span><span>•••</span></button></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div><h1>{titleMap[safeSection][0]}</h1><p>{titleMap[safeSection][1]}</p></div><div className="top-actions"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пошук…" /></label><button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Змінити тему">{dark ? "☀" : "◐"}</button><div className="notification-wrap"><button className="icon-btn" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Сповіщення" aria-expanded={notificationsOpen}>♢<i /></button>{notificationsOpen ? <Notifications state={state} onClose={() => setNotificationsOpen(false)} /> : null}</div>{["clients", "deals", "tasks"].includes(safeSection) ? <button className="primary" onClick={() => setModal(safeSection === "clients" ? "client" : safeSection === "deals" ? "deal" : "task")}>＋ Додати</button> : null}</div></header>
      <div className={`content ${loaded ? "loaded" : "loading"}`}>
        {safeSection === "dashboard" ? <Dashboard state={state} analytics={analytics} changeTask={changeTask} /> : null}
        {safeSection === "clients" ? <Clients state={state} query={query} onSelect={setSelectedClientId} /> : null}
        {safeSection === "deals" ? <Deals state={state} moveDeal={moveDeal} /> : null}
        {safeSection === "tasks" ? <Tasks state={state} view={taskView} setView={setTaskView} changeTask={changeTask} /> : null}
        {safeSection === "analytics" ? <Analytics state={state} analytics={analytics} /> : null}
        {safeSection === "activity" ? <ActivityFeed state={state} /> : null}
        {safeSection === "team" ? <Team state={state} canManage={can(me.role, "manage_members")} onInvite={() => setModal("member")} /> : null}
        {safeSection === "settings" ? <Settings state={state} dark={dark} setDark={setDark} /> : null}
      </div>
    </main>
    {notice ? <div className="toast">✓ {notice}</div> : null}
    {selectedClientId ? <ClientDrawer key={selectedClientId} state={state} clientId={selectedClientId} onClose={() => setSelectedClientId(null)} onSave={saveClient} /> : null}
    {modal ? <RecordModal modal={modal} state={state} onClose={() => setModal(null)} onSubmit={addRecord} /> : null}
  </div>;
}

function Notifications({ state, onClose }: { state: WorkspaceState; onClose: () => void }) {
  const overdue = state.tasks.filter((task) => task.status !== "done" && new Date(task.dueDate) < new Date());
  return <aside className="notifications" aria-label="Сповіщення"><header><strong>Сповіщення</strong><button onClick={onClose}>×</button></header>{overdue.length ? overdue.slice(0, 3).map((task) => <Link key={task.id} href="/app/tasks" onClick={onClose}><span>!</span><div><strong>Прострочене завдання</strong><small>{task.title}</small></div></Link>) : <p>Нових сповіщень немає.</p>}<Link className="notifications-all" href="/app/tasks" onClick={onClose}>Переглянути всі завдання →</Link></aside>;
}

function RecordModal({ modal, state, onClose, onSubmit }: { modal: "client" | "deal" | "task" | "member"; state: WorkspaceState; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const titles = { client: "Новий клієнт", deal: "Нова угода", task: "Нове завдання", member: "Запросити учасника" };
  const labels = { client: "Назва компанії", deal: "Назва угоди", task: "Назва завдання", member: "Ім’я та прізвище" };
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><small>Northline Studio</small><h2>{titles[modal]}</h2></div><button onClick={onClose} aria-label="Закрити">×</button></div><form onSubmit={onSubmit}><label>{labels[modal]}<input name="name" autoFocus required placeholder="Введіть значення" /></label>
    {modal === "client" ? <><label>Галузь<input name="industry" placeholder="Наприклад, консалтинг" /></label><label>Контактна особа<input name="contact" placeholder="Ім’я та прізвище" /></label><label>Email<input name="email" type="email" placeholder="name@company.ua" /></label><label>Телефон<input name="phone" type="tel" placeholder="+380…" /></label></> : null}
    {modal === "deal" ? <><label>Клієнт<select name="clientId">{state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Бюджет, ₴<input name="value" type="number" min="0" defaultValue="100000" /></label></> : null}
    {modal === "task" ? <><label>Пріоритет<select name="priority"><option value="low">Низький</option><option value="medium">Середній</option><option value="high">Високий</option></select></label><label>Дедлайн<input name="dueDate" type="date" required /></label></> : null}
    {modal === "member" ? <><label>Робочий email<input name="email" type="email" required placeholder="name@company.ua" /></label><label>Посада<input name="title" placeholder="Наприклад, Sales Manager" /></label><label>Роль<select name="role"><option value="member">Учасник</option><option value="admin">Адмін</option></select></label><p className="form-note">У демо-режимі учасник одразу з’явиться в команді. Реальна email-відправка не підключена.</p></> : null}
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Скасувати</button><button className="primary">{modal === "member" ? "Додати учасника" : "Створити"}</button></div></form></div></div>;
}

function ClientDrawer({ state, clientId, onClose, onSave }: { state: WorkspaceState; clientId: string; onClose: () => void; onSave: (client: Client) => void }) {
  const source = state.clients.find((client) => client.id === clientId);
  const [draft, setDraft] = useState<Client | null>(source ?? null);
  if (!draft) return null;
  const deals = state.deals.filter((deal) => deal.clientId === draft.id);
  const tasks = state.tasks.filter((task) => task.clientId === draft.id);
  const activities = state.activities.filter((activity) => activity.entityId === draft.id || deals.some((deal) => deal.id === activity.entityId));
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="client-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div className="client-title"><i>{draft.name.slice(0, 2).toUpperCase()}</i><span><small>Картка клієнта</small><h2>{draft.name}</h2></span></div><button onClick={onClose} aria-label="Закрити картку">×</button></header><div className="drawer-body"><section className="client-overview"><div><span>Угоди</span><strong>{deals.length}</strong></div><div><span>Сума</span><strong>{formatMoney(deals.reduce((sum, deal) => sum + deal.value, 0))}</strong></div><div><span>Завдання</span><strong>{tasks.filter((task) => task.status !== "done").length}</strong></div></section><section className="drawer-section"><h3>Основна інформація</h3><div className="client-form"><label>Компанія<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Галузь<input value={draft.industry} onChange={(event) => setDraft({ ...draft, industry: event.target.value })} /></label><label>Контактна особа<input value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} /></label><label>Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label>Телефон<input type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label><label>Статус<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Client["status"] })}><option value="active">Активний</option><option value="lead">Лід</option><option value="archived">Архів</option></select></label></div></section><section className="drawer-section"><h3>Угоди</h3>{deals.length ? deals.map((deal) => <div className="drawer-row" key={deal.id}><span><strong>{deal.title}</strong><small>{stageName(state, deal.stage)}</small></span><b>{formatMoney(deal.value)}</b></div>) : <p className="drawer-empty">Угод поки немає.</p>}</section><section className="drawer-section"><h3>Остання активність</h3>{activities.length ? activities.slice(0, 4).map((activity) => <div className="drawer-row" key={activity.id}><span><strong>{activity.action}</strong><small>{activity.detail}</small></span><time>{new Date(activity.at).toLocaleDateString("uk-UA")}</time></div>) : <p className="drawer-empty">Подій поки немає.</p>}</section></div><footer><button className="secondary" onClick={onClose}>Закрити</button><button className="primary" onClick={() => { onSave(draft); onClose(); }}>Зберегти зміни</button></footer></aside></div>;
}

function Dashboard({ state, analytics, changeTask }: { state: WorkspaceState; analytics: ReturnType<typeof calculateAnalytics>; changeTask: (id: string, status: TaskStatus) => void }) {
  const urgent = state.tasks.filter((task) => task.status !== "done").slice(0, 4);
  return <><section className="welcome"><div><span className="eyebrow">Сьогодні</span><h2>Добрий день, Олександре.</h2><p>У фокусі — {analytics.openCount} активні угоди та {urgent.length} наступні дії команди.</p></div><div className="pulse"><span>Темп тижня</span><strong>+18%</strong><small>до минулого тижня</small></div></section><section className="metrics"><Metric label="Активний pipeline" value={formatMoney(analytics.pipelineValue)} note={`${analytics.openCount} угоди у роботі`} tone="violet"/><Metric label="Прогнозований дохід" value={formatMoney(analytics.weightedForecast)} note="з урахуванням імовірності" tone="blue"/><Metric label="Конверсія" value={`${analytics.conversion}%`} note="за закритими угодами" tone="green"/><Metric label="Прострочені завдання" value={String(analytics.overdue)} note="потребують уваги" tone="orange"/></section><div className="dashboard-grid"><section className="panel focus-panel"><PanelHead title="Фокус на сьогодні" link="/app/tasks"/><div className="focus-list">{urgent.map((task) => <div className="focus-row" key={task.id}><button onClick={() => changeTask(task.id, "done")} className="check" aria-label="Завершити завдання"/><div><strong>{task.title}</strong><small>{state.clients.find((client) => client.id === task.clientId)?.name ?? "Внутрішнє завдання"}</small></div><span className={`priority ${task.priority}`}>{task.priority === "high" ? "Високий" : task.priority === "medium" ? "Середній" : "Низький"}</span><time>{new Date(task.dueDate).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</time></div>)}</div></section><section className="panel pipeline-card"><PanelHead title="Воронка продажів" link="/app/deals"/><div className="funnel">{state.pipelineStages.filter((stage) => !["won", "lost"].includes(stage.id)).map((stage, index) => { const list = state.deals.filter((deal) => deal.stage === stage.id); return <div key={stage.id}><span style={{ width: `${100 - index * 12}%` }}><b>{stage.name}</b><em>{list.length}</em></span><small>{formatMoney(list.reduce((sum, deal) => sum + deal.value, 0))}</small></div>})}</div></section></div><section className="panel recent"><PanelHead title="Остання активність" link="/app/activity"/><ActivityRows state={state} activities={state.activities.slice(0, 4)}/></section></>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) { return <div className={`metric ${tone}`}><div><span>{label}</span><i>↗</i></div><strong>{value}</strong><small>{note}</small></div>; }
function PanelHead({ title, link }: { title: string; link: string }) { return <div className="panel-head"><h3>{title}</h3><Link href={link}>Переглянути все →</Link></div>; }

function Clients({ state, query, onSelect }: { state: WorkspaceState; query: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<"all" | Client["status"]>("all");
  const clients = state.clients.filter((client) => (filter === "all" || client.status === filter) && `${client.name} ${client.contact} ${client.industry}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel table-panel"><div className="table-tools"><div className="tabs"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Усі <b>{state.clients.length}</b></button><button className={filter === "active" ? "selected" : ""} onClick={() => setFilter("active")}>Активні</button><button className={filter === "lead" ? "selected" : ""} onClick={() => setFilter("lead")}>Ліди</button><button className={filter === "archived" ? "selected" : ""} onClick={() => setFilter("archived")}>Архів</button></div><button className="secondary">☷ Фільтри</button></div>{clients.length ? <div className="data-table"><div className="tr th"><span>Компанія</span><span>Контакт</span><span>Статус</span><span>Відповідальний</span><span>Оновлено</span></div>{clients.map((client) => { const owner = state.members.find((member) => member.id === client.ownerId); return <button type="button" className="tr client-row" key={client.id} onClick={() => onSelect(client.id)}><span className="company"><i>{client.name.slice(0, 2).toUpperCase()}</i><span><strong>{client.name}</strong><small>{client.industry}</small></span></span><span><strong>{client.contact}</strong><small>{client.email}</small></span><span><b className={`status ${client.status}`}>{client.status === "active" ? "Активний" : client.status === "lead" ? "Лід" : "Архів"}</b></span><span className="owner"><Avatar initials={owner?.initials ?? "—"}/>{owner?.name}</span><span>{new Date(client.updatedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}<b className="row-menu">•••</b></span></button>})}</div> : <Empty>Клієнтів за цим запитом не знайдено</Empty>}</section>;
}

function Deals({ state, moveDeal }: { state: WorkspaceState; moveDeal: (id: string, stage: DealStage) => void }) {
  const stages = state.pipelineStages.filter((stage) => stage.id !== "lost");
  const [dragId, setDragId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  return <><div className="kanban-summary"><div><span>Pipeline value</span><strong>{formatMoney(calculateAnalytics(state).pipelineValue)}</strong></div><div><span>Weighted forecast</span><strong>{formatMoney(calculateAnalytics(state).weightedForecast)}</strong></div><div className="tabs"><button className={view === "kanban" ? "selected" : ""} onClick={() => setView("kanban")}>Kanban</button><button className={view === "list" ? "selected" : ""} onClick={() => setView("list")}>Список</button></div></div>{view === "kanban" ? <section className="kanban">{stages.map((stage) => { const deals = state.deals.filter((deal) => deal.stage === stage.id); return <div className="kanban-column" key={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={() => dragId && moveDeal(dragId, stage.id)}><header><span><i className={`dot ${stage.id}`}/>{stage.name} <b>{deals.length}</b></span><em>{formatMoney(deals.reduce((sum, deal) => sum + deal.value, 0))}</em></header><div className="deal-list">{deals.map((deal) => { const client = state.clients.find((item) => item.id === deal.clientId); const owner = state.members.find((member) => member.id === deal.ownerId); return <article draggable onDragStart={() => setDragId(deal.id)} className="deal-card" key={deal.id}><div className="deal-client"><i>{client?.name.slice(0,2).toUpperCase()}</i><span>{client?.name}</span><b>•••</b></div><h3>{deal.title}</h3><strong>{formatMoney(deal.value)}</strong><div className="deal-meta"><span>{deal.probability}%</span><span>◇ {new Date(deal.closeDate).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span><Avatar initials={owner?.initials ?? "—"}/></div><p>→ {deal.nextAction || "Наступна дія не вказана"}</p></article>})}{deals.length === 0 ? <div className="dropzone">Перетягніть угоду сюди</div> : null}</div></div>})}</section> : <section className="panel deal-table">{state.deals.map((deal) => <div key={deal.id}><span><strong>{deal.title}</strong><small>{state.clients.find((client) => client.id === deal.clientId)?.name}</small></span><b>{stageName(state, deal.stage)}</b><strong>{formatMoney(deal.value)}</strong></div>)}</section>}</>;
}

function Tasks({ state, view, setView, changeTask }: { state: WorkspaceState; view: "list" | "board"; setView: (view: "list" | "board") => void; changeTask: (id: string, status: TaskStatus) => void }) {
  return <><div className="task-toolbar"><div className="tabs"><button className="selected">Мої завдання <b>{state.tasks.filter((task) => task.status !== "done").length}</b></button><button>Усі</button><button>Прострочені</button></div><div className="view-toggle"><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>☷ Список</button><button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>▦ Дошка</button></div></div>{view === "list" ? <section className="panel tasks-list">{state.tasks.map((task) => <TaskRow key={task.id} task={task} state={state} changeTask={changeTask}/>)}</section> : <section className="task-board">{(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => <div className="kanban-column" key={status}><header><span>{taskStatusLabels[status]}</span><b>{state.tasks.filter((task) => task.status === status).length}</b></header>{state.tasks.filter((task) => task.status === status).map((task) => <article className="task-card" key={task.id}><span className={`priority ${task.priority}`}>{task.priority}</span><h3>{task.title}</h3><small>{state.clients.find((client) => client.id === task.clientId)?.name ?? "Внутрішнє"}</small><button onClick={() => changeTask(task.id, status === "done" ? "todo" : "done")}>{status === "done" ? "Повернути" : "Завершити"}</button></article>)}</div>)}</section>}</>;
}

function TaskRow({ task, state, changeTask }: { task: WorkspaceState["tasks"][number]; state: WorkspaceState; changeTask: (id: string, status: TaskStatus) => void }) {
  const assignee = state.members.find((member) => member.id === task.assigneeId);
  const overdue = task.status !== "done" && new Date(task.dueDate) < new Date();
  return <div className={`task-row ${task.status === "done" ? "done" : ""}`}><button className="check" onClick={() => changeTask(task.id, task.status === "done" ? "todo" : "done")}>{task.status === "done" ? "✓" : ""}</button><div><strong>{task.title}</strong><small>{state.clients.find((client) => client.id === task.clientId)?.name ?? "Внутрішнє завдання"}</small></div><span className={`priority ${task.priority}`}>{task.priority}</span><span className={overdue ? "overdue" : ""}>◷ {new Date(task.dueDate).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span><span className="owner"><Avatar initials={assignee?.initials ?? "—"}/>{assignee?.name}</span><b>•••</b></div>;
}

function Analytics({ state, analytics }: { state: WorkspaceState; analytics: ReturnType<typeof calculateAnalytics> }) {
  const stages = state.pipelineStages.filter((stage) => stage.id !== "lost");
  const max = Math.max(...stages.map((stage) => state.deals.filter((deal) => deal.stage === stage.id).length), 1);
  return <><section className="metrics"><Metric label="Виграний дохід" value={formatMoney(analytics.wonValue)} note="за весь період" tone="green"/><Metric label="Зважений прогноз" value={formatMoney(analytics.weightedForecast)} note="відкриті угоди" tone="violet"/><Metric label="Конверсія" value={`${analytics.conversion}%`} note="виграно / закрито" tone="blue"/><Metric label="Середній чек" value={formatMoney(state.deals.reduce((sum, deal) => sum + deal.value, 0) / state.deals.length)} note="за всіма угодами" tone="orange"/></section><div className="analytics-grid"><section className="panel chart-panel"><PanelHead title="Конверсія воронки" link="/app/deals"/><div className="bar-chart">{stages.map((stage) => { const count = state.deals.filter((deal) => deal.stage === stage.id).length; return <div key={stage.id}><span>{count}</span><i><em style={{ height: `${Math.max(12, count / max * 100)}%` }}/></i><small>{stage.name}</small></div>})}</div></section><section className="panel sources"><h3>Джерела угод</h3>{Object.entries(state.deals.reduce<Record<string,number>>((accumulator, deal) => ({ ...accumulator, [deal.source]: (accumulator[deal.source] || 0) + 1 }), {})).map(([source, count]) => <div key={source}><span>{source}</span><i><em style={{ width: `${count / state.deals.length * 100}%` }}/></i><b>{Math.round(count / state.deals.length * 100)}%</b></div>)}</section></div></>;
}

function ActivityFeed({ state }: { state: WorkspaceState }) {
  const [filter, setFilter] = useState<"all" | "deal" | "client" | "task">("all");
  const activities = filter === "all" ? state.activities : state.activities.filter((activity) => activity.entity === filter);
  function exportCsv() {
    const rows = [["date", "actor", "action", "detail"], ...activities.map((activity) => [activity.at, state.members.find((member) => member.id === activity.actorId)?.name ?? "", activity.action, activity.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `flowdesk-activity-${filter}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="panel activity-page"><div className="activity-filter"><div className="tabs"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Усі події <b>{state.activities.length}</b></button><button className={filter === "deal" ? "selected" : ""} onClick={() => setFilter("deal")}>Угоди</button><button className={filter === "client" ? "selected" : ""} onClick={() => setFilter("client")}>Клієнти</button><button className={filter === "task" ? "selected" : ""} onClick={() => setFilter("task")}>Завдання</button></div><button className="secondary" onClick={exportCsv}>Експорт CSV</button></div>{activities.length ? <ActivityRows state={state} activities={activities}/> : <Empty>Подій цього типу ще немає</Empty>}</section>;
}

function ActivityRows({ state, activities }: { state: WorkspaceState; activities: WorkspaceState["activities"] }) {
  return <div className="activity-list">{activities.map((activity) => { const actor = state.members.find((member) => member.id === activity.actorId); return <div key={activity.id}><Avatar initials={actor?.initials ?? "—"}/><span><strong>{actor?.name}</strong> {activity.action}<small>{activity.detail}</small></span><time>{new Date(activity.at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</time></div>})}</div>;
}

function Team({ state, canManage, onInvite }: { state: WorkspaceState; canManage: boolean; onInvite: () => void }) {
  return <section className="panel team-panel"><div className="panel-head"><div><h3>Учасники робочого простору</h3><p>Керуйте доступом команди до клієнтських даних.</p></div>{canManage ? <button className="primary" onClick={onInvite}>＋ Запросити учасника</button> : null}</div>{state.members.map((member) => <div className="member-row" key={member.id}><Avatar initials={member.initials}/><span><strong>{member.name}{member.id === state.currentUserId ? <small> Ви</small> : null}</strong><small>{member.email}</small></span><span>{member.title}</span><b className={`role ${member.role}`}>{member.role === "owner" ? "Власник" : member.role === "admin" ? "Адмін" : "Учасник"}</b><button aria-label={`Меню ${member.name}`}>•••</button></div>)}</section>;
}

function Settings({ state, dark, setDark }: { state: WorkspaceState; dark: boolean; setDark: (value: boolean) => void }) {
  return <div className="settings-grid"><section className="panel settings-card"><h3>Робочий простір</h3><label>Назва<input defaultValue={state.workspace.name}/></label><label>Часовий пояс<select defaultValue="Europe/Kyiv"><option>Europe/Kyiv</option><option>Europe/Chisinau</option></select></label><Link className="secondary" href="/onboarding">Налаштувати цикл продажів</Link></section><section className="panel settings-card"><h3>Вигляд</h3><div className="setting-row"><span><strong>Темна тема</strong><small>Зменшує яскравість інтерфейсу</small></span><button className={`switch ${dark ? "on" : ""}`} onClick={() => setDark(!dark)}><i/></button></div><div className="setting-row"><span><strong>Щільний режим</strong><small>Більше даних на екрані</small></span><button className="switch"><i/></button></div></section><section className="panel settings-card danger"><h3>Небезпечна зона</h3><p>Видалення робочого простору незворотне.</p><button>Видалити простір</button></section></div>;
}
