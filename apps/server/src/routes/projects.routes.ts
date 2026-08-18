import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app";

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budgetHours: z.number().int().min(1),
});

const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    budgetHours: z.number().int().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

const pyramidSchema = z.object({
  rows: z.array(z.array(z.string().min(1))),
});

export function registerProjectRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/projects", async (request) => {
    request.requireUser();
    const projects = await ctx.db.project.findMany({
      where: { deletedAt: null },
      include: { tasks: { where: { deletedAt: null } } },
      orderBy: { createdAt: "asc" },
    });
    const { toApiProject } = await import("../services/storage/mappers");
    return projects.map(toApiProject);
  });

  app.post("/projects", async (request, reply) => {
    const pm = request.requirePM();
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    const project = await ctx.storage.createProject(parsed.data, pm.id);
    return reply.code(201).send(project);
  });

  app.put("/projects/:id", async (request, reply) => {
    const pm = request.requirePM();
    const { id } = request.params as { id: string };
    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    const project = await ctx.storage.updateProject(id, parsed.data, pm.id);
    return reply.send(project);
  });

  app.delete("/projects/:id", async (request, reply) => {
    const pm = request.requirePM();
    const { id } = request.params as { id: string };
    await ctx.storage.deleteProject(id, pm.id);
    return reply.send({ ok: true });
  });

  app.put("/projects/:id/pyramid", async (request, reply) => {
    const pm = request.requirePM();
    const { id } = request.params as { id: string };
    const parsed = pyramidSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    await ctx.storage.savePyramid(id, parsed.data.rows, pm.id);
    return reply.send({ ok: true });
  });
}