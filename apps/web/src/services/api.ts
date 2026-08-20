import type {
  ApiAvailability,
  ApiConflict,
  ApiPlanEntry,
  ApiProject,
  ApiTask,
  ApiUser,
  ApiVersionDetail,
  DateString,
  PlannerSummary,
  TaskStatus,
} from "../domain/types";

const BASE =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? "https://engineering-resource-planner.onrender.com" : "/api");

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface LoginResponse {
  user: ApiUser;
}

export const api = {
  login: (login: string, password: string) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ login, password }) }),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () => request<{ user: ApiUser }>("/auth/me"),

  getAppData: () => request<import("../domain/types").AppData>("/app-data"),

  createProject: (input: { name: string; deadline: DateString; budgetHours: number }) =>
    request<ApiProject>("/projects", { method: "POST", body: JSON.stringify(input) }),

  updateProject: (id: string, input: Partial<{ name: string; deadline: DateString; budgetHours: number }>) =>
    request<ApiProject>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteProject: (id: string) => request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),

  savePyramid: (projectId: string, rows: string[][]) =>
    request<{ ok: boolean }>(`/projects/${projectId}/pyramid`, { method: "PUT", body: JSON.stringify({ rows }) }),

  createTask: (input: { projectId: string; requiredSkill: string; estimatedHours: number; taskDeadline?: DateString | null }) =>
    request<ApiTask>("/tasks", { method: "POST", body: JSON.stringify(input) }),

  updateTask: (id: string, input: Partial<{ estimatedHours: number; taskDeadline: DateString | null; requiredSkill: string }>) =>
    request<ApiTask>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteTask: (id: string) => request<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),

  updateTaskStatus: (id: string, status: TaskStatus, actualWorkedHours?: number) =>
    request<ApiTask>(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, ...(actualWorkedHours !== undefined ? { actualWorkedHours } : {}) }),
    }),

  assignTask: (taskId: string, assignments: Array<{ userId: string; date: DateString; hours: number }>) =>
    request<ApiPlanEntry[]>(`/tasks/${taskId}/assignments`, {
      method: "POST",
      body: JSON.stringify({ assignments }),
    }),

  removeAssignment: (taskId: string, userId: string) =>
    request<{ ok: boolean }>(`/tasks/${taskId}/assignments/remove`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  updatePlanEntry: (id: string, input: { userId?: string; date?: DateString; hours?: number }) =>
    request<ApiPlanEntry>(`/plan-entries/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  setPlanEntryLock: (id: string, locked: boolean) =>
    request<ApiPlanEntry>(`/plan-entries/${id}/lock`, { method: "PUT", body: JSON.stringify({ locked }) }),

  deletePlanEntry: (id: string) => request<{ ok: boolean }>(`/plan-entries/${id}`, { method: "DELETE" }),

  upsertAvailability: (userId: string, startDate: DateString, endDate: DateString, availableHours: number) =>
    request<ApiAvailability[]>("/availability", {
      method: "POST",
      body: JSON.stringify({ userId, startDate, endDate, availableHours }),
    }),

  deleteAvailability: (userId: string, date: DateString) =>
    request<{ ok: boolean }>(`/availability/${userId}/${date}`, { method: "DELETE" }),

  generatePlan: () => request<PlannerSummary>("/planner/generate", { method: "POST" }),

  getConflicts: () => request<ApiConflict[]>("/conflicts"),

  getVersions: () => request<import("../domain/types").ApiVersionSummary[]>("/versions"),

  getVersion: (id: string) => request<ApiVersionDetail>(`/versions/${id}`),

  resetDatabase: () => request<{ ok: boolean }>("/admin/reset", { method: "POST" }),

  wipeAll: () => request<{ ok: boolean }>("/admin/wipe", { method: "POST" }),
};

export { BASE };