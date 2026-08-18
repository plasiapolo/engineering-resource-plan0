import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../app";

const updateEntrySchema = z
  .object({
    userId: z.string().min(1).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    hours: z.number().int().min(1).max(8).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

const lockSchema = z.object({
  locked: z.boolean(),
});

export function registerPlanEntryRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.put("/plan-entries/:id", async (request, reply) => {
    const pm = request.requirePM();
    const { id } = request.params as { id: string };
    const parsed = updateEntrySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    try {
      const entry = await ctx.storage.updatePlanEntry(id, parsed.data, pm.id);
      return reply.send(entry);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Invalid entry update" });
    }
  });

  app.put("/plan-entries/:id/lock", async (request, reply) => {
    const pm = request.requirePM();
    const { id } = request.params as { id: string };
    const parsed = lockSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    }
    const entry = await ctx.storage.setPlanEntryLock(id, parsed.data.locked, pm.id);
    return reply.send(entry);
  });

  app.delete("/plan-entries/:id", async (request, reply) => {
    const pm = request.requirePM();
    const { id } = request.params as { id: string };
    await ctx.storage.deletePlanEntry(id, pm.id);
    return reply.send({ ok: true });
  });
}