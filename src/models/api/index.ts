// MODEL LAYER — API surface barrel.
// ViewModels import from here; Views never import these directly.
export { ApiError, API_BASE_URL, getToken, setToken } from "./client";
export { authApi } from "./auth";
export { organizationsApi } from "./organizations";
export { usersApi } from "./users";
export { coursesApi } from "./courses";
export { classesApi } from "./classes";
export { assignmentsApi } from "./assignments";
export { repositoriesApi } from "./repositories";
export { pipelineApi } from "./pipeline";
export { dashboardsApi } from "./dashboards";
export { sessionApi } from "./session";
