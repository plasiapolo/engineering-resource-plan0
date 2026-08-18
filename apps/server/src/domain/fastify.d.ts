import type { Role, User } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    requireUser(): User;
    requireRole(role: Role): User;
    requirePM(): User;
  }
}

export type {};