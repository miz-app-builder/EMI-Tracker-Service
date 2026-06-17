import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logActivity } from "../lib/logActivity";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const COOKIE_NAME = "emi_token";

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
  };
}

function getDeviceInfo(req: any): string {
  const ua = req.headers["user-agent"] ?? "Unknown";
  return ua.slice(0, 200);
}

function getIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "Unknown"
  );
}

function extractTokenFromReq(req: any): string | null {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.[COOKIE_NAME] ?? null;
}

async function createSession(userId: string, req: any): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId,
      deviceInfo: getDeviceInfo(req),
      ipAddress: getIp(req),
      expiresAt,
    })
    .returning({ id: sessionsTable.id });
  return session.id;
}

router.post("/auth/signup", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, password, name, phone, address } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name: name ?? null,
      phone: phone ?? null,
      address: address ?? null,
      lastActiveAt: new Date(),
    })
    .returning();

  const sessionId = await createSession(user.id, req);
  const token = jwt.sign({ userId: user.id, email: user.email, sessionId }, secret, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, cookieOpts());
  logActivity(user.id, "signup", "Account created");
  res.status(201).json({ id: user.id, email: user.email, name: user.name, token });
});

router.post("/auth/login", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.email, email.toLowerCase()));
  const sessionId = await createSession(user.id, req);
  const token = jwt.sign({ userId: user.id, email: user.email, sessionId }, secret, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, cookieOpts());
  logActivity(user.id, "login", "Logged in");
  res.json({ id: user.id, email: user.email, name: user.name, hasPinLogin: Boolean(user.pinHash), token });
});

router.post("/auth/logout", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    try {
      const token = extractTokenFromReq(req);
      if (token) {
        const payload = jwt.verify(token, secret) as { userId: string; sessionId?: string };
        logActivity(payload.userId, "logout", "Logged out");
        if (payload.sessionId) {
          await db
            .update(sessionsTable)
            .set({ isRevoked: true })
            .where(eq(sessionsTable.id, payload.sessionId));
        }
      }
    } catch {}
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const token = extractTokenFromReq(req);
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const payload = jwt.verify(token, secret) as { userId: string; email: string };
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        phone: usersTable.phone,
        address: usersTable.address,
        profilePhotoUrl: usersTable.profilePhotoUrl,
        emailVerifiedAt: usersTable.emailVerifiedAt,
        passwordChangedAt: usersTable.passwordChangedAt,
        lastActiveAt: usersTable.lastActiveAt,
        createdAt: usersTable.createdAt,
        hasPinLogin: usersTable.pinHash,
      })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId));
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ ...user, hasPinLogin: Boolean(user.hasPinLogin) });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// PIN Login: set or update PIN (protected)
router.post("/auth/set-pin-login", requireAuth, async (req, res) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be 4–6 digits" });
    return;
  }
  const userId = (req as any).userId as string;
  const pinHash = await bcrypt.hash(pin, 10);
  await db.update(usersTable).set({ pinHash }).where(eq(usersTable.id, userId));
  logActivity(userId, "pin_set", "PIN login enabled");
  res.json({ ok: true });
});

// PIN Login: remove PIN (protected)
router.delete("/auth/pin-login", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  await db.update(usersTable).set({ pinHash: null }).where(eq(usersTable.id, userId));
  logActivity(userId, "pin_removed", "PIN login disabled");
  res.json({ ok: true });
});

// Biometric Login: store token hash (protected)
router.post("/auth/set-biometric-token", requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string" || token.length < 32) {
    res.status(400).json({ error: "Invalid biometric token" });
    return;
  }
  const userId = (req as any).userId as string;
  const biometricTokenHash = await bcrypt.hash(token, 10);
  await db.update(usersTable).set({ biometricTokenHash }).where(eq(usersTable.id, userId));
  logActivity(userId, "biometric_token_set", "Biometric login enabled");
  res.json({ ok: true });
});

// Biometric Login: remove token (protected)
router.delete("/auth/biometric-token", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  await db.update(usersTable).set({ biometricTokenHash: null }).where(eq(usersTable.id, userId));
  logActivity(userId, "biometric_token_removed", "Biometric login disabled");
  res.json({ ok: true });
});

// Biometric Login: login with email + token (public)
router.post("/auth/biometric-login", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, token } = req.body;
  if (!email || !token) {
    res.status(400).json({ error: "email and token required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || !user.biometricTokenHash) {
    res.status(401).json({ error: "Biometric login not set up for this account" });
    return;
  }

  const valid = await bcrypt.compare(token, user.biometricTokenHash);
  if (!valid) {
    res.status(401).json({ error: "Biometric token invalid" });
    return;
  }

  await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, user.id));
  const sessionId = await createSession(user.id, req);
  const jwtToken = jwt.sign({ userId: user.id, email: user.email, sessionId }, secret, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, jwtToken, cookieOpts());
  logActivity(user.id, "biometric_login", "Logged in via biometric");
  res.json({ id: user.id, email: user.email, name: user.name, hasPinLogin: Boolean(user.pinHash), token: jwtToken });
});

// PIN Login: login with email + PIN (public)
router.post("/auth/pin-login", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, pin } = req.body;
  if (!email || !pin) {
    res.status(400).json({ error: "email and pin required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || !user.pinHash) {
    res.status(401).json({ error: "PIN login not set up for this account" });
    return;
  }

  const valid = await bcrypt.compare(pin, user.pinHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect PIN" });
    return;
  }

  await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, user.id));
  const sessionId = await createSession(user.id, req);
  const token = jwt.sign({ userId: user.id, email: user.email, sessionId }, secret, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, cookieOpts());
  logActivity(user.id, "pin_login", "Logged in via PIN");
  res.json({ id: user.id, email: user.email, name: user.name, hasPinLogin: true, token });
});

export default router;
