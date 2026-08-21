import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app";
import { toApiUser } from "../services/storage/mappers";

const skillSchema = z.enum(["A", "B", "C", "E", "P", "S"]);
const createSpecialistSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  skill: skillSchema,
});
const updateSpecialistSchema = createSpecialistSchema;

export function nextSpecialistLogin(skill: string, existingLogins: string[]): string {
  const prefix = skill.toLowerCase();
  const nextNumber = existingLogins.reduce((max, login) => {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(login.toLowerCase());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  return `${prefix}${nextNumber}`;
}

export function registerTeamRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/team", async (request) => {
    const user = request.requireUser();
    const data = await ctx.storage.loadAppData(user.id);
    return data.team;
  });

  app.post("/team", async (request, reply) => {
    request.requirePM();
    const parsed = createSpecialistSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Display name and competence are required." });
    }

    const existing = await ctx.db.user.findMany({
      where: { skill: parsed.data.skill },
      select: { login: true },
    });
    const login = nextSpecialistLogin(
      parsed.data.skill,
      existing.map((user) => user.login),
    );
    const user = await ctx.db.user.create({
      data: {
        login,
        displayName: parsed.data.displayName,
        role: "SPECIALIST",
        skill: parsed.data.skill,
        passwordHash: await ctx.auth.hashPassword(`${login}-Erp-2026!`),
      },
    });

    return reply.code(201).send(toApiUser(user));
  });

  app.put<{ Params: { id: string } }>("/team/:id", async (request, reply) => {
    request.requirePM();
    const parsed = updateSpecialistSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Display name and competence are required." });
    }

    const existing = await ctx.db.user.findUnique({ where: { id: request.params.id } });
    if (!existing || existing.role !== "SPECIALIST") {
      return reply.code(404).send({ error: "Specialist not found." });
    }

    const user = await ctx.db.user.update({
      where: { id: existing.id },
      data: { displayName: parsed.data.displayName, skill: parsed.data.skill },
    });
    return reply.send(toApiUser(user));
  });

  app.delete<{ Params: { id: string } }>("/team/:id", async (request, reply) => {
    request.requirePM();
    const existing = await ctx.db.user.findUnique({ where: { id: request.params.id } });
    if (!existing || existing.role !== "SPECIALIST") {
      return reply.code(404).send({ error: "Specialist not found." });
    }

    await ctx.db.user.delete({ where: { id: existing.id } });
    return reply.send({ ok: true });
  });
}
