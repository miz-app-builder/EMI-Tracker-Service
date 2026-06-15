import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "emi_token";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfigured: SESSION_SECRET missing" });
    return;
  }
  const token = (req as any).cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as { userId: string; email: string };
    (req as any).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
