# FlowDesk

FlowDesk is a portfolio SaaS concept and a working CRM for small teams. It brings clients, contacts, deals, a sales pipeline, tasks, activity history and internal analytics into one workspace.

The product UI is Ukrainian. Technical identifiers and documentation are English where that improves maintainability.

## Product concept

Small B2B teams often split client work between spreadsheets, notes and messengers. FlowDesk keeps the complete customer context and the next action together. The reference demo workspace is the fictional digital agency **Northline Studio**.

## Main features

- Public marketing page and product case study.
- Three-step workspace onboarding.
- Responsive application shell with light and dark themes.
- Client directory with search, statuses and ownership.
- Deal Kanban with native drag-and-drop and optimistic persistence.
- Task list and board views with overdue logic.
- Immutable activity events for meaningful actions.
- Analytics derived from current deals and tasks.
- Team directory and role-aware administrative controls.
- D1-backed durable demo workspace with automatic seed data.
- Optional Supabase/PostgreSQL schema with Row Level Security.
- SEO metadata, Open Graph card, sitemap, robots and web manifest.

## User roles

- **Owner** — full CRM access, member and role management, workspace lifecycle.
- **Admin** — CRM access, record deletion, invitations and workspace settings.
- **Member** — daily work with clients, deals and tasks; no destructive or administrative access.

See [`docs/architecture.md`](docs/architecture.md) for the permission matrix and architectural rationale.

## Tech stack

- React 19 and Next.js 16 App Router API.
- Vinext and Vite for Cloudflare Worker-compatible output.
- TypeScript and Tailwind CSS base processing with a custom product design system.
- Cloudflare D1 with Drizzle ORM migrations.
- Node test runner for domain and product-surface tests.
- Optional Supabase Auth/Postgres migration as a portable production path.

## Architecture

The primary hosted path is a full-stack Worker application. Public pages are statically renderable; application pages share a client shell and use `/api/workspace` as the persistence boundary. The API stores a versioned workspace snapshot for the interactive portfolio demo. The normalized Drizzle model documents and supports the production relational shape.

Every normalized business table contains `workspace_id`. Server queries must resolve a membership and include the active workspace predicate. UI permission checks are convenience only; server authorization remains authoritative.

## Database schema

Core tables:

- `users`
- `workspaces`
- `members`
- `clients`
- `contacts`
- `deals`
- `tasks`
- `activities`
- `workspace_snapshots`

Indexes cover workspace-scoped client search, pipeline stage views, task status/due-date lists and entity activity history.

## Multi-tenancy

The relational model uses shared tables with mandatory workspace ownership:

1. Resolve the authenticated user.
2. Resolve membership for the requested workspace.
3. Check the role required by the action.
4. Query or mutate with `workspace_id` in the predicate.
5. Write an activity event for meaningful changes.

Opaque IDs alone never grant access.

## Row Level Security

The optional Supabase migration in `supabase/migrations/202607310001_flowdesk.sql` enables RLS for every tenant-owned table. Its policies use `is_workspace_member()` for isolation and `has_workspace_role()` for administrative mutations. Role transitions and workspace deletion must additionally pass Owner-only server checks.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing page |
| `/login` | Sign-in and demo entry |
| `/onboarding` | Workspace setup |
| `/app` | Dashboard |
| `/app/clients` | Client directory |
| `/app/deals` | Sales Kanban |
| `/app/tasks` | Tasks list and board |
| `/app/analytics` | Workspace analytics |
| `/app/activity` | Activity trail |
| `/app/team` | Members and roles |
| `/app/settings` | Workspace settings |
| `/case-study` | Portfolio case study |
| `/api/workspace` | Demo state persistence |

Private app and API routes are excluded from indexing and the sitemap.

## Installation

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The D1 development binding is created by the included Vinext/Vite configuration.

## Environment variables

The default D1 demo requires no application secrets. `.openai/hosting.json` declares the logical `DB` binding.

For an optional Supabase deployment, provide server-managed values rather than committing them:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The current hosted implementation does not consume these optional values.

## Supabase setup

1. Create a Supabase project.
2. Apply `supabase/migrations/202607310001_flowdesk.sql` in the SQL editor or CLI.
3. Configure Site URL and allowed redirect URLs.
4. Create the first Auth user.
5. Insert its `profiles`, `workspaces` and Owner `members` rows in one trusted server transaction.
6. Point a repository implementation at the Supabase client and preserve the server-side role checks.

## D1 database migrations

Generate migrations after changing `db/schema.ts`:

```bash
npm run db:generate
```

Generated SQL is stored in `drizzle/`. The Sites hosting layer owns the real D1 resource and injects its binding.

## Seed data

The first `GET /api/workspace` creates the Northline Studio demo snapshot when none exists. Seed data lives in `lib/seed.ts` and includes realistic fictional clients, open/won/lost deals, overdue tasks and activity events.

## Demo account

Use **“Увійти в демо-простір”** on `/login`, or open `/app` directly. The active demo user is Олександр Марченко (Owner). No real password or external identity is required for the portfolio demo.

## Testing

```bash
npm test
npm run lint
npm run build
```

Tests cover the permission matrix, analytics calculations, activity metadata, public conversion surface and search-indexing safeguards.

## Deployment

The project builds to Cloudflare Worker-compatible ESM output through Vinext. Publishing through Sites provisions and binds D1 according to `.openai/hosting.json`.

## Screenshots

Add final desktop and mobile captures under `docs/screenshots/` after deployment. The generated social preview is stored at `public/og.png`.

## Known limitations

- Payment is not connected.
- External notifications are not connected.
- Calendar integrations are not connected.
- Plans and billing data are demonstrational.
- The default public portfolio demo uses a shared seeded workspace rather than production account registration.
- Supabase is provided as an optional migration path; the hosted build uses D1.

## Future improvements

- Connect a public identity provider and per-account workspace provisioning.
- Replace snapshot persistence with normalized CRUD repositories.
- Add invitations with expiring tokens.
- Add CSV import/export jobs and richer audit retention.
- Add Playwright end-to-end and automated accessibility suites in CI.

## Disclaimer

FlowDesk is a fictional SaaS concept created for a portfolio. Companies, people, clients, deals, tasks, plans and analytics are demonstrational.
