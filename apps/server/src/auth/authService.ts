import crypto from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";
import * as argon2 from "argon2";

export const SESSION_COOKIE = "erp_session";

export class AuthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly sessionTtlHours: number,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async login(login: string, password: string): Promise<{ user: User; token: string } | null> {
    const user = await this.db.user.findUnique({ where: { login } });
    if (!user) return null;
    const ok = await this.verifyPassword(user.passwordHash, password);
    if (!ok) return null;
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + this.sessionTtlHours * 60 * 60 * 1000);
    await this.db.session.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    return { user, token };
  }

  async getUserByToken(token: string | undefined): Promise<User | null> {
    if (!token) return null;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await this.db.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.db.session.delete({ where: { id: session.id } });
      return null;
    }
    return session.user;
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await this.db.session.deleteMany({ where: { tokenHash } });
  }
}