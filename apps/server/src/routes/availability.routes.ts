import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app";

const availabilitySchema = z.object({
  userId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  availableHours: z.number().int().min(0).max(8),
});

export function registerAvailabilityRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/availability", async (request) => {
    request.requireUser();
    const records = await ctx.db.availability.findMany({ orderBy: { date: "asc" } });
    const { toApiAvailability } = await import("../services/storage/mappers");
    return records.map(toApiAvailability);
  });

  app.post("/availability", async (request, reply) => {
    const user = request.requireUser();
    const parsed = availabilitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    if (user.role !== "PROJECT_MANAGER" && parsed.data.userId !== user.id) {
      return reply.code(403).send({ error: "A specialist may only modify their own availability." });
    }
    const records = await ctx.storage.upsertAvailability(
      parsed.data.userId,
      parsed.data.startDate,
      parsed.data.endDate,
      parsed.data.availableHours,
      user.id,
    );
    return reply.code(201).send(records);
  });

  app.delete("/availability/:userId/:date", async (request, reply) => {
    const user = request.requireUser();
    const { userId, date } = request.params as { userId: string; date: string };
    if (user.role !== "PROJECT_MANAGER" && userId !== user.id) {
      return reply.code(403).send({ error: "A specialist may only modify their own availability." });
    }
    await ctx.storage.deleteAvailability(userId, date);
    return reply.send({ ok: true });
  });
}