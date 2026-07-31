import type { WorkspaceState } from "./types";

const now = new Date();
const date = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString();

export const seedState: WorkspaceState = {
  workspace: { id: "ws_northline", name: "Northline Studio", plan: "Команда" },
  currentUserId: "u_owner",
  members: [
    { id: "u_owner", name: "Олександр Марченко", initials: "ОМ", role: "owner", title: "Власник", email: "oleksandr@northline.studio" },
    { id: "u_sales", name: "Марія Бондар", initials: "МБ", role: "admin", title: "Sales Manager", email: "maria@northline.studio" },
    { id: "u_pm", name: "Ірина Коваль", initials: "ІК", role: "member", title: "Project Manager", email: "iryna@northline.studio" },
    { id: "u_design", name: "Андрій Левченко", initials: "АЛ", role: "member", title: "Designer", email: "andrii@northline.studio" },
  ],
  clients: [
    { id: "c_horizon", name: "Horizon Development", industry: "Нерухомість", contact: "Наталія Савчук", email: "n.savchuk@horizon.dev", phone: "+380 67 410 28 91", status: "active", ownerId: "u_sales", updatedAt: date(-1) },
    { id: "c_solis", name: "Solis Coffee", industry: "HoReCa", contact: "Максим Руденко", email: "max@soliscoffee.ua", phone: "+380 93 221 44 18", status: "active", ownerId: "u_owner", updatedAt: date(-2) },
    { id: "c_forma", name: "Forma Interior", industry: "Дизайн інтер’єру", contact: "Олена Романюк", email: "hello@forma.interior", phone: "+380 50 729 16 42", status: "lead", ownerId: "u_sales", updatedAt: date(-4) },
    { id: "c_urban", name: "Urban Dental", industry: "Медицина", contact: "Дмитро Кравець", email: "office@urbandental.ua", phone: "+380 68 550 90 12", status: "active", ownerId: "u_pm", updatedAt: date(-5) },
    { id: "c_greenway", name: "Greenway Logistics", industry: "Логістика", contact: "Ігор Ткаченко", email: "igor@greenway.ua", phone: "+380 63 889 14 20", status: "lead", ownerId: "u_sales", updatedAt: date(-7) },
    { id: "c_atelier", name: "Atelier No. 7", industry: "Fashion", contact: "Софія Мельник", email: "sofia@atelier7.ua", phone: "+380 97 713 33 09", status: "active", ownerId: "u_owner", updatedAt: date(-8) },
    { id: "c_peak", name: "North Peak Consulting", industry: "Консалтинг", contact: "Роман Лисенко", email: "roman@northpeak.io", phone: "+380 66 230 18 70", status: "active", ownerId: "u_pm", updatedAt: date(-12) },
    { id: "c_bright", name: "Bright Education", industry: "Освіта", contact: "Аліна Горбач", email: "alina@bright.education", phone: "+380 73 902 45 51", status: "archived", ownerId: "u_sales", updatedAt: date(-20) },
  ],
  deals: [
    { id: "d_horizon", clientId: "c_horizon", title: "Лендінг житлового комплексу", stage: "new", value: 185000, probability: 20, ownerId: "u_sales", source: "Рекомендація", nextAction: "Уточнити технічне завдання", closeDate: date(24) },
    { id: "d_greenway", clientId: "c_greenway", title: "CRM для відділу продажів", stage: "contacted", value: 420000, probability: 35, ownerId: "u_sales", source: "Сайт", nextAction: "Провести демо командам", closeDate: date(32) },
    { id: "d_solis", clientId: "c_solis", title: "Брендинг нової кав’ярні", stage: "proposal", value: 146000, probability: 60, ownerId: "u_owner", source: "Повторне звернення", nextAction: "Отримати фідбек щодо кошторису", closeDate: date(12) },
    { id: "d_atelier", clientId: "c_atelier", title: "Розробка інтернет-магазину", stage: "negotiation", value: 315000, probability: 75, ownerId: "u_owner", source: "Instagram", nextAction: "Узгодити склад другого етапу", closeDate: date(8) },
    { id: "d_urban", clientId: "c_urban", title: "Редизайн корпоративного сайту", stage: "won", value: 228000, probability: 100, ownerId: "u_pm", source: "Партнер", nextAction: "Передати в delivery", closeDate: date(-14) },
    { id: "d_peak", clientId: "c_peak", title: "Підтримка digital-продукту", stage: "lost", value: 198000, probability: 0, ownerId: "u_pm", source: "LinkedIn", nextAction: "", closeDate: date(-25), lossReason: "Зміна пріоритетів клієнта" },
  ],
  tasks: [
    { id: "t_1", title: "Надіслати оновлену пропозицію Solis", status: "todo", priority: "high", assigneeId: "u_owner", dealId: "d_solis", clientId: "c_solis", dueDate: date(1) },
    { id: "t_2", title: "Підготувати демо CRM", status: "in_progress", priority: "high", assigneeId: "u_pm", dealId: "d_greenway", clientId: "c_greenway", dueDate: date(3) },
    { id: "t_3", title: "Погодити структуру каталогу", status: "todo", priority: "medium", assigneeId: "u_design", dealId: "d_atelier", clientId: "c_atelier", dueDate: date(-2) },
    { id: "t_4", title: "Зателефонувати Horizon Development", status: "todo", priority: "medium", assigneeId: "u_sales", dealId: "d_horizon", clientId: "c_horizon", dueDate: date(0) },
    { id: "t_5", title: "Передати матеріали в розробку", status: "done", priority: "low", assigneeId: "u_pm", dealId: "d_urban", clientId: "c_urban", dueDate: date(-4) },
  ],
  activities: [
    { id: "a1", actorId: "u_sales", action: "створила угоду", entity: "deal", entityId: "d_horizon", detail: "Лендінг житлового комплексу · 185 000 ₴", at: date(-1) },
    { id: "a2", actorId: "u_owner", action: "перемістив угоду", entity: "deal", entityId: "d_solis", detail: "Зв’язалися → Пропозиція", at: date(-2) },
    { id: "a3", actorId: "u_pm", action: "завершила завдання", entity: "task", entityId: "t_5", detail: "Передати матеріали в розробку", at: date(-4) },
    { id: "a4", actorId: "u_sales", action: "додала клієнта", entity: "client", entityId: "c_greenway", detail: "Greenway Logistics", at: date(-7) },
  ],
};
