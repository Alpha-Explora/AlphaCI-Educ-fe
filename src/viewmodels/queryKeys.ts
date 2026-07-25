// VIEWMODEL LAYER — centralized React Query cache keys.
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", id] as const,
    adminOverview: (id: string) => ["organizations", id, "admin-overview"] as const,
  },
  users: {
    detail: (id: string) => ["users", id] as const,
    repositories: (id: string) => ["users", id, "repositories"] as const,
  },
  courses: {
    list: (filters?: Record<string, string | undefined>) =>
      ["courses", filters ?? {}] as const,
    managed: (orgId: string) => ["courses", "managed", orgId] as const,
  },
  classes: {
    list: (filters?: Record<string, string | undefined>) =>
      ["classes", filters ?? {}] as const,
    detail: (id: string) => ["classes", id] as const,
    roster: (id: string) => ["classes", id, "roster"] as const,
    assignments: (id: string) => ["classes", id, "assignments"] as const,
    joinCode: (id: string) => ["classes", id, "join-code"] as const,
  },
  students: {
    classes: (id: string) => ["students", id, "classes"] as const,
  },
  assignments: {
    detail: (id: string) => ["assignments", id] as const,
    repositories: (id: string) => ["assignments", id, "repositories"] as const,
  },
  repositories: {
    detail: (id: string) => ["repositories", id] as const,
    runs: (id: string) => ["repositories", id, "runs"] as const,
    // ADDENDUM M — live GitHub state (branches/commits/workflow runs).
    githubActivity: (id: string, branch?: string) =>
      ["repositories", id, "github-activity", branch ?? "all"] as const,
  },
  pipelineRuns: {
    detail: (id: string) => ["pipeline-runs", id] as const,
  },
  dashboards: {
    // ADDENDUM K — orgId (selected lab) is part of the key so switching labs refetches.
    teacher: (id: string, orgId?: string) =>
      ["dashboards", "teacher", id, orgId ?? "all"] as const,
    student: (id: string) => ["dashboards", "student", id] as const,
  },
};
