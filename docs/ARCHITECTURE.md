# AlphaCI Education Tier — Frontend Architecture (Strict MVVM)

This Next.js app is built with a **strict Model–View–ViewModel (MVVM)** separation.
The dependency rule is absolute and one-directional:

> **Views depend on ViewModels. ViewModels depend on Models. Models never import Views or ViewModels.**

```
┌─────────────────────────────────────────────────────────────┐
│  VIEW            src/app/**  +  src/components/**             │
│  (routes + presentational components — props in, events out) │
│        │ consumes hooks only                                 │
│        ▼                                                      │
│  VIEWMODEL       src/viewmodels/**                           │
│  (React hooks: state, data-fetching, derived/presentation)   │
│        │ calls typed API + owns types                        │
│        ▼                                                      │
│  MODEL           src/models/**                               │
│  (types.ts contract + per-resource typed API client)         │
│        │ HTTP                                                │
│        ▼                                                      │
│  Backend (AlphaCI-Educ-be)  http://localhost:4000/api        │
└─────────────────────────────────────────────────────────────┘
```

The layering is verifiable by import direction:
- Nothing in `src/models/**` imports from `src/viewmodels/**` or `src/components/**`/`src/app/**`.
- Nothing in `src/components/**` or `src/app/**` imports from `src/models/api/**` directly — Views only import ViewModels (and shared UI types).
- ViewModels are the only place the API client is called.

---

## Model layer — `src/models/`

**`types.ts`** — the shared type contract. It mirrors `CONTRACT.md` sections 1–3 exactly
(enums, entity DTOs, and aggregate response shapes). This is the single source of truth shared
with the NestJS backend. Field names and enum values are binding and must not be renamed.

**`api/`** — one typed client file per resource. Each function returns a typed `Promise<T>`:
- `client.ts` — base `fetch` wrapper. Reads `NEXT_PUBLIC_API_BASE_URL`
  (default `http://localhost:4000/api`), attaches the bearer token, and normalizes failures into
  a single `ApiError` with `kind: "network" | "http"`. Network failures (backend down / CORS)
  are distinguished from HTTP errors so the UI can show a dedicated "Backend not reachable" banner.
- `auth.ts`, `organizations.ts`, `users.ts`, `classes.ts`, `assignments.ts`,
  `repositories.ts`, `pipeline.ts`, `dashboards.ts` — resource clients.
- `index.ts` — barrel that ViewModels import from.

Models hold **no React** and **no UI** — they are pure data access + types.

---

## ViewModel layer — `src/viewmodels/`

React hooks that encapsulate **all** state, data-fetching (via `@tanstack/react-query`), and
derived/presentation logic. Views never compute business logic — they read it from a ViewModel.

| Hook | Responsibility |
|------|----------------|
| `useSession` | Mock-SSO session context: current user, token + user persisted to `localStorage`, `loginAs({role}\|{userId})`, `logout`. |
| `useRoleSwitcher` | Landing page: best-effort loads seeded personas grouped by role (fast-fail so landing renders even if backend is down). |
| `useTeacherDashboard` | Teacher class groups + derived totals (classes / students / pending grading). |
| `useClassRoster` | Class roster + derived class-wide rollups (submitted / graded / class avg). |
| `useClassAssignments` | Assignments for a class. |
| `useAssignmentRepositories` | Repositories under one assignment (teacher grading entry points). |
| `useStudentDashboard` | Student assignments split into active vs past. |
| `useRepositoryDetail` | Repo detail + branch selection + runs filtered to branch + trigger-run. |
| `useStartAssignment` | The VS Code handoff: reads the open session window (GET, mints nothing) and starts/re-opens one. Pressing Start twice reuses the launch already in flight rather than creating a second. |
| `usePipelineRun` | A run's 5-stage checks, grouped in canonical stage order; masks hidden-test messages for the `student` audience. |
| `useGrading` | Teacher grade form state + validation + grade/submit mutations. |
| `useAdminOverview` | Org overview + archive-semester action. |

Supporting files:
- `queryKeys.ts` — centralized React Query cache keys.
- `errors.ts` — `toPresentableError()` maps any thrown error to a small `{ message, isNetworkError, baseUrl }`
  shape that Views render directly.

Each ViewModel file starts with a comment marking it as the VM layer.

---

## View layer — `src/app/` + `src/components/`

**Routes (`src/app/`)** — App Router pages. Each page is a thin View that calls one or more
ViewModels and renders presentational components. Pages hold only view-local UI state
(e.g. which run is selected), never data-fetching or business rules.

| Route | Surface |
|-------|---------|
| `/` | Mock-SSO role switcher (sign in as persona → routes into role area). |
| `/teacher` | Class-group dashboard. |
| `/teacher/classes/[id]` | Class roster (student progress) + assignments & submissions. |
| `/teacher/repositories/[id]` | Grading view: assignment, people, branches, 5-stage pipeline (hidden tests revealed), plagiarism flag, grading panel. |
| `/student` | Assignment Hub (active + past, latest CI score). |
| `/student/repositories/[id]` | Workspace: branch toggle, Get Lab Token, Submit for grading, CI error logs (hidden tests masked), private grades & feedback. |
| `/admin` | Org overview: GitHub App / SSO / SCIM status, zero-footprint seat savings, lab inventory, archive semester. |

**Components (`src/components/`)** — presentational, prop-driven:
- `ui/` — design-system primitives (Button, Card, StatusPill, Banner, Stat, StateBoundary,
  Skeleton, EmptyState, Avatar, …). Padding is supplied by consumers, not baked into shared
  components.
- `layout/` — `AppShell` (sidebar + top bar + session guard) and `Brand`.
- `domain/` — feature components composed from `ui/` and a single ViewModel each
  (e.g. `PipelineStages`, `RepoRunsExplorer`, `GradingPanel`,
  `StartAssignmentPanel`, `PlagiarismCard`, `ArchiveSemesterCard`).

`providers.tsx` wires the React Query client and the `SessionProvider` (VM context) so every View
beneath can consume ViewModels.

---

## Robustness / graceful degradation

The prototype must be presentable even when the backend is not running:
- `client.ts` converts network-level failures into `ApiError { kind: "network" }`.
- `StateBoundary` renders a clear **"Backend not reachable at &lt;url&gt;"** banner (with Retry)
  instead of crashing, and handles loading (skeletons) and empty states uniformly.
- No mock data is duplicated on the frontend — the backend owns seed data. The UI simply renders
  clean loading / empty / error states when data is unavailable.

---

## Conventions

- **TypeScript strict** throughout; the wire contract lives only in `models/types.ts`.
- **Accessibility**: skip link, visible `:focus-visible` rings, semantic tables/labels,
  `aria-current` on nav, `prefers-reduced-motion` respected.
- **Motion language**: restrained enterprise SaaS — 8px fade-up on mount, `cubic-bezier(0.16,1,0.3,1)`
  ease-out, 150–250ms, subtle hover lift. No scroll-jacking.
- **Env**: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000/api`).
