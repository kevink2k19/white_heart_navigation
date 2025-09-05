import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export type AuthedRequest = Request & { userId?: string };

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const raw = String(req.headers?.authorization || "");
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
}
