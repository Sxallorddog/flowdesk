# FlowDesk architecture

## Routes

- `/` — public product page.
- `/login` — demo access and sign-in entry.
- `/onboarding` — workspace creation flow.
- `/app` — overview dashboard.
- `/app/clients`, `/app/clients/:id` — client directory and profile.
- `/app/deals`, `/app/deals/:id` — sales pipeline and deal drawer.
- `/app/tasks` — list and board task views.
- `/app/analytics` — funnel, revenue, sources and team activity.
- `/app/activity` — immutable action history.
- `/app/team`, `/app/settings` — membership, roles and workspace preferences.
- `/case-study` — portfolio case study.
- `/api/workspace` — workspace snapshot read/write boundary.

## Information architecture and main flow

`Workspace → Clients → Contacts → Deals → Tasks → Activities → Analytics`.

The primary workflow is: create a workspace, add a client, open a deal, move it through the pipeline, assign and complete a task, inspect the activity trail, invite a member and review the recalculated dashboard.

## Roles and permission matrix

| Capability | Owner | Admin | Member |
| --- | --- | --- | --- |
| View workspace data | Yes | Yes | Yes |
| Create/edit clients, deals and tasks | Yes | Yes | Yes |
| Delete clients or deals | Yes | Yes | No |
| Invite/remove members | Yes | Yes | No |
| Change member roles | Yes | No | No |
| Change workspace settings | Yes | Yes | No |
| Transfer ownership/delete workspace | Yes | No | No |
| Export data and view analytics | Yes | Yes | Yes |

Permissions are evaluated server-side from the membership bound to the authenticated user and active workspace. Client controls only improve UX; they never grant access.

## Multi-tenancy

Every business row carries `workspace_id`. Reads and mutations always include the active workspace predicate. Membership is resolved before record access. IDs are opaque, and knowing an ID from another workspace does not bypass the workspace predicate. Hosted persistence uses D1 with server-side checks; the included Supabase migration expresses the equivalent model with Row Level Security.

## Data model

```text
users 1──* members *──1 workspaces
workspaces 1──* clients 1──* contacts
workspaces 1──* deals *──1 clients
workspaces 1──* tasks *──0..1 deals
workspaces 1──* activities
```

Indexes follow actual access patterns: workspace-scoped lists, pipeline stage filtering, task status/due date and entity activity history.

## Project structure

- `app/` — routes, route handlers and UI.
- `components/` — product components and shell.
- `lib/` — domain types, permissions, analytics, seed and activity helpers.
- `db/` — Drizzle schema and database access.
- `drizzle/` — D1 migrations.
- `supabase/migrations/` — portable PostgreSQL schema and RLS policies.
- `tests/` — unit and rendered-output tests.

## Security controls

- Workspace-scoped authorization on every server mutation.
- Explicit role checks for destructive and administrative actions.
- Schema validation at API boundaries.
- Prepared statements through D1/Drizzle.
- No private CRM routes in sitemap; app pages carry `noindex` metadata.
- Activity metadata contains intentional event fields, not arbitrary secrets.
- Optimistic UI changes are rolled back when persistence fails.
