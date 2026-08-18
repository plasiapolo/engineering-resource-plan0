import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { buildApp, resetDatabaseToSeed } from "../../src/app";
import { loadConfig } from "../../src/config";
import { TEST_DATABASE_URL } from "./globalSetup";
import { passwordForLogin } from "../../prisma/seed";
import { addWorkingDays, warsawToday } from "../../src/services/calendar/polishCalendar";

let app: FastifyInstance;
let db: PrismaClient;

beforeAll(async () => {
  db = new PrismaClient();
  app = await buildApp({
    databaseUrl: TEST_DATABASE_URL,
    logger: false,
    registerStatic: false,
    config: loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      COOKIE_SECURE: "false",
      AUTH_RATE_LIMIT_MAX: "10000",
      CORS_ORIGINS: "",
    }),
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

beforeEach(async () => {
  await resetDatabaseToSeed(db);
});

interface Session {
  token: string;
  user: { id: string; login: string; role: string };
}

async function login(login: string, password?: string): Promise<Session> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { login, password: password ?? passwordForLogin(login) },
  });
  expect(res.statusCode).toBe(200);
  const setCookie = String(res.headers["set-cookie"] ?? "");
  const token = setCookie.match(/erp_session=([^;]+)/)?.[1] ?? "";
  const body = res.json() as Session["user"] & { user: Session["user"] };
  return { token, user: body.user ?? body };
}

function headers(session: Session) {
  return { cookie: `erp_session=${session.token}` };
}

async function userIdByLogin(login: string): Promise<string> {
  const user = await db.user.findUnique({ where: { login } });
  if (!user) throw new Error(`No seeded user ${login}`);
  return user.id;
}

async function pmSession(): Promise<Session> {
  return login("pm");
}

const futureWorkingDay = (offset = 2) => addWorkingDays(warsawToday(), offset);

describe("Authentication and roles", () => {
  it("logs a project manager in and serves app data", async () => {
    const session = await pmSession();
    expect(session.user.role).toBe("PROJECT_MANAGER");

    const res = await app.inject({ method: "GET", url: "/api/app-data", headers: headers(session) });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.projects).toHaveLength(3);
    expect(data.tasks.length).toBeGreaterThan(0);
    expect(data.team.length).toBe(12);
  });

  it("rejects bad credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { login: "pm", password: "wrong-password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects unauthenticated access", async () => {
    const res = await app.inject({ method: "GET", url: "/api/app-data" });
    expect(res.statusCode).toBe(401);
  });

  it("forbids specialists from managing projects", async () => {
    const specialist = await login("a1");
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(specialist),
      payload: { name: "Nope", deadline: futureWorkingDay(), budgetHours: 100 },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("Project management", () => {
  it("creates, updates and soft-deletes a project", async () => {
    const pm = await pmSession();
    const created = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "New Factory", deadline: futureWorkingDay(), budgetHours: 500 },
    });
    expect(created.statusCode).toBe(201);
    const project = created.json();
    expect(project.code).toBe("P4");
    expect(project.name).toBe("New Factory");

    const updated = await app.inject({
      method: "PUT",
      url: `/api/projects/${project.id}`,
      headers: headers(pm),
      payload: { budgetHours: 600 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().budgetHours).toBe(600);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/projects/${project.id}`,
      headers: headers(pm),
    });
    expect(deleted.statusCode).toBe(200);

    const list = await app.inject({ method: "GET", url: "/api/projects", headers: headers(pm) });
    expect(list.json().map((p: { code: string }) => p.code)).not.toContain("P4");
  });
});

describe("Task management and task codes", () => {
  it("creates tasks with stable 6-digit numbers and updated row codes", async () => {
    const pm = await pmSession();
    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(), budgetHours: 500 },
    });
    const project = projectRes.json();

    const t1 = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: project.id, requiredSkill: "A", estimatedHours: 8 },
    });
    expect(t1.statusCode).toBe(201);
    expect(t1.json().taskCode).toBe("P4-AX-1.000001");
    expect(t1.json().codePart).toBe("P4-AX-1");

    const t2 = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: project.id, requiredSkill: "B", estimatedHours: 16 },
    });
    expect(t2.json().taskCode).toBe("P4-BX-1.000002");

    const moved = await app.inject({
      method: "PUT",
      url: `/api/tasks/${t2.json().id}`,
      headers: headers(pm),
      payload: { rowIndex: 1 },
    });
    expect(moved.json().taskCode).toBe("P4-BX-2.000002");
    expect(moved.json().taskCode.split(".")[1]).toBe("000002");
  });

  it("reports hours worked and computes remaining hours", async () => {
    const pm = await pmSession();
    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(), budgetHours: 500 },
    });
    const project = projectRes.json();
    const taskRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: project.id, requiredSkill: "A", estimatedHours: 10 },
    });
    const task = taskRes.json();
    const a1 = await userIdByLogin("a1");
    const a2 = await userIdByLogin("a2");

    await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/assignments`,
      headers: headers(pm),
      payload: {
        assignments: [
          { userId: a1, date: futureWorkingDay(1), hours: 4 },
          { userId: a2, date: futureWorkingDay(1), hours: 2 },
        ],
      },
    });

    const updated = await app.inject({
      method: "PUT",
      url: `/api/tasks/${task.id}/status`,
      headers: headers(pm),
      payload: { status: "WORK_IN_PROGRESS", actualWorkedHours: 6 },
    });
    expect(updated.statusCode).toBe(200);
    const body = updated.json();
    expect(body.actualWorkedHours).toBe(6);
    expect(body.remainingHours).toBe(4);
  });
});

describe("Pyramid and dependencies", () => {
  it("builds dependencies from rows and updates row codes", async () => {
    const pm = await pmSession();
    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(30), budgetHours: 500 },
    });
    const project = projectRes.json();

    const ids: string[] = [];
    for (const skill of ["A", "B", "S"] as const) {
      const res = await app.inject({
        method: "POST",
        url: "/api/tasks",
        headers: headers(pm),
        payload: { projectId: project.id, requiredSkill: skill, estimatedHours: 8 },
      });
      ids.push(res.json().id);
    }

    const saved = await app.inject({
      method: "PUT",
      url: `/api/projects/${project.id}/pyramid`,
      headers: headers(pm),
      payload: { rows: [[ids[0]], [ids[1], ids[2]]] },
    });
    expect(saved.statusCode).toBe(200);

    const tasksRes = await app.inject({ method: "GET", url: "/api/tasks", headers: headers(pm) });
    const tasks = tasksRes.json() as Array<{ id: string; projectId: string; taskCode: string }>;
    const tasksForProject = tasks.filter((t) => t.projectId === project.id);
    const byId = new Map(tasksForProject.map((t) => [t.id, t]));
    expect(byId.get(ids[0])?.taskCode).toBe("P4-AX-1.000001");
    expect(byId.get(ids[1])?.taskCode).toBe("P4-BX-2.000002");
    expect(byId.get(ids[2])?.taskCode).toBe("P4-SX-2.000003");

    const deps = await db.taskDependency.findMany({
      where: { deletedAt: null, predecessorTaskId: ids[0] },
    });
    expect(deps.map((d) => d.successorTaskId).sort()).toEqual([ids[1], ids[2]].sort());
  });
});

describe("Assignments and plan entries", () => {
  it("assigns a specialist and updates the task code skill part", async () => {
    const pm = await pmSession();
    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(30), budgetHours: 500 },
    });
    const project = projectRes.json();
    const taskRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: project.id, requiredSkill: "A", estimatedHours: 8 },
    });
    const task = taskRes.json();
    const a1 = await userIdByLogin("a1");

    const assign = await app.inject({
      method: "POST",
      url: `/api/tasks/${task.id}/assignments`,
      headers: headers(pm),
      payload: { assignments: [{ userId: a1, date: futureWorkingDay(), hours: 4 }] },
    });
    expect(assign.statusCode).toBe(201);
    expect(assign.json()[0].locked).toBe(true);

    const tasksRes = await app.inject({ method: "GET", url: "/api/tasks", headers: headers(pm) });
    const updated = tasksRes.json().find((t: { id: string }) => t.id === task.id);
    expect(updated.taskCode).toBe("P4-A1-1.000001");
  });

  it("rejects assignments to users without the required skill", async () => {
    const pm = await pmSession();
    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(30), budgetHours: 500 },
    });
    const project = projectRes.json();
    const taskRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: project.id, requiredSkill: "A", estimatedHours: 8 },
    });
    const c1 = await userIdByLogin("c1");

    const assign = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskRes.json().id}/assignments`,
      headers: headers(pm),
      payload: { assignments: [{ userId: c1, date: futureWorkingDay(), hours: 4 }] },
    });
    expect(assign.statusCode).toBe(400);
  });

  it("moves a plan entry and locks it", async () => {
    const pm = await pmSession();
    const a1 = await userIdByLogin("a1");
    const a2 = await userIdByLogin("a2");
    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(30), budgetHours: 500 },
    });
    const taskRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: projectRes.json().id, requiredSkill: "A", estimatedHours: 8 },
    });
    await app.inject({
      method: "POST",
      url: `/api/tasks/${taskRes.json().id}/assignments`,
      headers: headers(pm),
      payload: { assignments: [{ userId: a1, date: futureWorkingDay(), hours: 4 }] },
    });

    const dataRes = await app.inject({ method: "GET", url: "/api/app-data", headers: headers(pm) });
    const entry = dataRes.json().planEntries.find(
      (e: { taskId: string; userId: string }) => e.taskId === taskRes.json().id && e.userId === a1,
    );

    const moved = await app.inject({
      method: "PUT",
      url: `/api/plan-entries/${entry.id}`,
      headers: headers(pm),
      payload: { userId: a2, date: futureWorkingDay(2), hours: 6 },
    });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().userId).toBe(a2);
    expect(moved.json().hours).toBe(6);
    expect(moved.json().locked).toBe(true);

    const tasksAfter = (await app.inject({ method: "GET", url: "/api/tasks", headers: headers(pm) })).json();
    const updatedTask = tasksAfter.find((t: { id: string }) => t.id === taskRes.json().id);
    expect(updatedTask.taskCode).toMatch(/^P4-A2-1\.\d{6}$/);
  });
});

describe("Automatic plan generation", () => {
  it("generates entries, persists versions and records audit", async () => {
    const pm = await pmSession();
    const gen = await app.inject({
      method: "POST",
      url: "/api/planner/generate",
      headers: headers(pm),
    });
    expect(gen.statusCode).toBe(200);
    const summary = gen.json();
    expect(summary.entriesCreated).toBeGreaterThan(0);

    const data = (await app.inject({ method: "GET", url: "/api/app-data", headers: headers(pm) })).json();
    expect(data.planEntries.length).toBeGreaterThan(0);
    expect(data.versions.length).toBeGreaterThanOrEqual(1);

    const autoEntries = data.planEntries.filter((e: { locked: boolean }) => !e.locked);
    const autoTaskIds = [...new Set(autoEntries.map((e: { taskId: string }) => e.taskId))];
    for (const taskId of autoTaskIds) {
      const task = data.tasks.find((t: { id: string }) => t.id === taskId);
      const assignedLogins = [
        ...new Set(
          autoEntries
            .filter((e: { taskId: string }) => e.taskId === taskId)
            .map((e: { userName: string }) => e.userName.replace("Specialist ", "").toUpperCase()),
        ),
      ];
      const codePart = task.taskCode.split(".")[0].split("-")[1];
      expect(codePart).not.toBe(`${task.requiredSkill}X`);
      expect(assignedLogins).toContain(codePart);
    }

    const versions = (await app.inject({ method: "GET", url: "/api/versions", headers: headers(pm) })).json();
    expect(versions[0].planEntriesCount).toBe(data.planEntries.length);

    const detail = (await app.inject({ method: "GET", url: `/api/versions/${versions[0].id}`, headers: headers(pm) })).json();
    expect(detail.planEntries.length).toBe(data.planEntries.length);

    const audit = (await app.inject({ method: "GET", url: "/api/audit", headers: headers(pm) })).json();
    expect(audit.some((a: { action: string }) => a.action === "PLAN_GENERATED")).toBe(true);
  });

  it("generates a second plan idempotently (replaces auto entries, keeps locked)", async () => {
    const pm = await pmSession();
    await app.inject({ method: "POST", url: "/api/planner/generate", headers: headers(pm) });
    const data1 = (await app.inject({ method: "GET", url: "/api/app-data", headers: headers(pm) })).json();
    const locked1 = data1.planEntries.filter((e: { locked: boolean }) => e.locked);

    await app.inject({ method: "POST", url: "/api/planner/generate", headers: headers(pm) });
    const data2 = (await app.inject({ method: "GET", url: "/api/app-data", headers: headers(pm) })).json();
    const autoCount2 = data2.planEntries.filter((e: { locked: boolean }) => !e.locked).length;
    const locked2 = data2.planEntries.filter((e: { locked: boolean }) => e.locked);

    expect(autoCount2).toBeGreaterThanOrEqual(1);
    // locked entries survived regeneration
    expect(locked2).toEqual(locked1);
  });
});

describe("Conflict detection", () => {
  it("exposes seeded conflicts of several types", async () => {
    const pm = await pmSession();
    const conflicts = (await app.inject({ method: "GET", url: "/api/conflicts", headers: headers(pm) })).json();
    const types = new Set(conflicts.map((c: { type: string }) => c.type));
    expect(types.has("PROJECT_BUDGET")).toBe(true);
    expect(types.has("EMPLOYEE_OVERLOAD")).toBe(true);
    expect(types.has("NO_AVAILABLE_EMPLOYEE")).toBe(true);
    expect(types.has("DEPENDENCY_VIOLATION")).toBe(true);
    expect(types.has("TASK_DEADLINE")).toBe(true);
  });

  it("recomputes conflicts after data changes", async () => {
    const pm = await pmSession();
    const data = (await app.inject({ method: "GET", url: "/api/app-data", headers: headers(pm) })).json();
    const before = data.conflicts.length;
    const overload = data.conflicts.find((c: { type: string }) => c.type === "EMPLOYEE_OVERLOAD");
    expect(overload).toBeDefined();

    // Remove the availability restriction that caused the overload
    const a1 = await userIdByLogin("a1");
    await app.inject({
      method: "POST",
      url: "/api/availability",
      headers: headers(pm),
      payload: { userId: a1, startDate: warsawToday(), endDate: addWorkingDays(warsawToday(), 1), availableHours: 8 },
    });
    const after = (await app.inject({ method: "GET", url: "/api/conflicts", headers: headers(pm) })).json();
    expect(after.some((c: { type: string }) => c.type === "EMPLOYEE_OVERLOAD")).toBe(false);
    expect(before).toBeGreaterThan(0);
  });
});

describe("Availability", () => {
  it("lets a specialist update their own availability but not others", async () => {
    const a1 = await login("a1");
    const a1Id = await userIdByLogin("a1");
    const a2Id = await userIdByLogin("a2");

    const own = await app.inject({
      method: "POST",
      url: "/api/availability",
      headers: headers(a1),
      payload: { userId: a1Id, startDate: warsawToday(), endDate: addWorkingDays(warsawToday(), 4), availableHours: 6 },
    });
    expect(own.statusCode).toBe(201);

    const other = await app.inject({
      method: "POST",
      url: "/api/availability",
      headers: headers(a1),
      payload: { userId: a2Id, startDate: warsawToday(), endDate: addWorkingDays(warsawToday(), 1), availableHours: 8 },
    });
    expect(other.statusCode).toBe(403);
  });
});

describe("Task status transitions", () => {
  it("lets an assigned specialist advance a task and forbids reopening DONE", async () => {
    const pm = await pmSession();
    const a1 = await login("a1");
    const a1Id = await userIdByLogin("a1");

    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(30), budgetHours: 500 },
    });
    const taskRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: projectRes.json().id, requiredSkill: "A", estimatedHours: 8 },
    });
    await app.inject({
      method: "POST",
      url: `/api/tasks/${taskRes.json().id}/assignments`,
      headers: headers(pm),
      payload: { assignments: [{ userId: a1Id, date: futureWorkingDay(), hours: 4 }] },
    });

    const start = await app.inject({
      method: "PUT",
      url: `/api/tasks/${taskRes.json().id}/status`,
      headers: headers(a1),
      payload: { status: "WORK_IN_PROGRESS", actualWorkedHours: 4 },
    });
    expect(start.statusCode).toBe(200);
    expect(start.json().status).toBe("WORK_IN_PROGRESS");

    const done = await app.inject({
      method: "PUT",
      url: `/api/tasks/${taskRes.json().id}/status`,
      headers: headers(a1),
      payload: { status: "DONE", actualWorkedHours: 8 },
    });
    expect(done.statusCode).toBe(200);

    const reopen = await app.inject({
      method: "PUT",
      url: `/api/tasks/${taskRes.json().id}/status`,
      headers: headers(a1),
      payload: { status: "WORK_IN_PROGRESS" },
    });
    expect(reopen.statusCode).toBe(400);

    const pmReopen = await app.inject({
      method: "PUT",
      url: `/api/tasks/${taskRes.json().id}/status`,
      headers: headers(pm),
      payload: { status: "WORK_IN_PROGRESS" },
    });
    expect(pmReopen.statusCode).toBe(200);
  });

  it("forbids a specialist from updating an unassigned task", async () => {
    const a1 = await login("a1");
    const pm = await pmSession();
    const projectRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Plant", deadline: futureWorkingDay(30), budgetHours: 500 },
    });
    const taskRes = await app.inject({
      method: "POST",
      url: "/api/tasks",
      headers: headers(pm),
      payload: { projectId: projectRes.json().id, requiredSkill: "A", estimatedHours: 8 },
    });
    const res = await app.inject({
      method: "PUT",
      url: `/api/tasks/${taskRes.json().id}/status`,
      headers: headers(a1),
      payload: { status: "WORK_IN_PROGRESS" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Versions", () => {
  it("keeps one snapshot per business day and updates it in place", async () => {
    const pm = await pmSession();
    const before = (await app.inject({ method: "GET", url: "/api/versions", headers: headers(pm) })).json();
    expect(before).toHaveLength(1);

    await app.inject({ method: "POST", url: "/api/planner/generate", headers: headers(pm) });
    const afterGen = (await app.inject({ method: "GET", url: "/api/versions", headers: headers(pm) })).json();
    expect(afterGen).toHaveLength(1);
    expect(afterGen[0].planEntriesCount).toBeGreaterThan(0);

    const detail = (await app.inject({ method: "GET", url: `/api/versions/${afterGen[0].id}`, headers: headers(pm) })).json();
    expect(detail.snapshotDate).toBeDefined();
    expect(detail.conflicts.length).toBeGreaterThan(0);
  });
});

describe("Admin", () => {
  it("resets the database to seed and wipes projects", async () => {
    const pm = await pmSession();
    await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: headers(pm),
      payload: { name: "Temp", deadline: futureWorkingDay(), budgetHours: 100 },
    });

    const wipe = await app.inject({ method: "POST", url: "/api/admin/wipe", headers: headers(pm) });
    expect(wipe.statusCode).toBe(200);
    const afterWipe = (await app.inject({ method: "GET", url: "/api/projects", headers: headers(pm) })).json();
    expect(afterWipe).toHaveLength(0);

    const reset = await app.inject({ method: "POST", url: "/api/admin/reset", headers: headers(pm) });
    expect(reset.statusCode).toBe(200);

    // Reset clears sessions, so log in again
    const freshPm = await pmSession();
    const afterReset = (await app.inject({ method: "GET", url: "/api/projects", headers: headers(freshPm) })).json();
    expect(afterReset).toHaveLength(3);
  });
});