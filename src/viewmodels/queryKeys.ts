// VIEWMODEL LAYER — centralized React Query cache keys.
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  organizations: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", id] as const,
    adminOverview: (id: string) => ["organizations", id, "admin-overview"] as const,
    teachers: (id: string) => ["organizations", id, "teachers"] as const,
    students: (id: string) => ["organizations", id, "students"] as const,
    transferableTeachers: (id: string) =>
      ["organizations", id, "teachers", "available"] as const,
  },
  platform: {
    overview: ["platform", "overview"] as const,
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
  hiddenTests: {
    summary: (assignmentId: string) =>
      ["assignments", assignmentId, "hidden-tests"] as const,
    content: (assignmentId: string) =>
      ["assignments", assignmentId, "hidden-tests", "content"] as const,
  },
  classes: {
    list: (filters?: Record<string, string | undefined>) =>
      ["classes", filters ?? {}] as const,
    detail: (id: string) => ["classes", id] as const,
    roster: (id: string) => ["classes", id, "roster"] as const,
    assignments: (id: string) => ["classes", id, "assignments"] as const,
    joinCode: (id: string) => ["classes", id, "join-code"] as const,
  },
  // The code on the board. Deliberately NOT nested under `classes`: the student
  // side has no class id to key on (it asks "am I in?", not "is CS101 open?"),
  // and hanging it off the classes key would make every roster mutation
  // invalidate a teacher's live code panel mid-class.
  classAccess: {
    /** Teacher: one class's code + arrivals. */
    forClass: (classId: string) => ["class-access", "class", classId] as const,
  },
  students: {
    classes: (id: string) => ["students", id, "classes"] as const,
  },
  assignments: {
    detail: (id: string) => ["assignments", id] as const,
    repositories: (id: string) => ["assignments", id, "repositories"] as const,
    // The starter catalogue: built-ins AND the caller's own custom projects.
    // Named here because writing a custom project has to invalidate it, and the
    // key was previously inlined at its single reader in useCreateProject.
    templates: ["assignments", "templates"] as const,
  },
  customProjects: {
    all: ["custom-projects"] as const,
    // Contents, which only the editor asks for — see customProjectsApi.get.
    detail: (id: string) => ["custom-projects", id] as const,
  },
  repositories: {
    detail: (id: string) => ["repositories", id] as const,
    runs: (id: string) => ["repositories", id, "runs"] as const,
    // ADDENDUM M — live GitHub state (branches/commits/workflow runs).
    githubActivity: (id: string, branch?: string) =>
      ["repositories", id, "github-activity", branch ?? "all"] as const,
    // Per-run, and NOT nested under githubActivity's key: the activity key
    // carries the branch filter, so nesting would throw away a run's cached
    // jobs the moment the student changed that filter.
    workflowRunJobs: (id: string, runId: number) =>
      ["repositories", id, "workflow-runs", runId, "jobs"] as const,
    pullRequests: (id: string) => ["repositories", id, "pull-requests"] as const,
    // path and ref are part of the key: browsing is a different query per
    // location, and caching them separately is what makes going back instant.
    files: (id: string, path: string, ref: string | null) =>
      ["repositories", id, "files", ref ?? "default", path] as const,
    pullRequestFiles: (id: string, number: number) =>
      ["repositories", id, "pull-requests", number, "files"] as const,
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
