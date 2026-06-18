import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { and, eq, ne, gt } from "drizzle-orm";
import { logActivity } from "../lib/logActivity";
import { requireAuth } from "../middlewares/requireAuth";
import { supabase, supabaseAdmin, decodeJwtPayload } from "../lib/supabase";

const router = Router();
const COOKIE_NAME = "emi_token";

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

// Store a Supabase session in our sessions table using the JWT session_id
async function trackSupabaseSession(
  userId: string,
  accessToken: string,
  req: any
): Promise<string | null> {
  const payload = decodeJwtPayload(accessToken);
  const sessionId = payload.session_id as string | undefined;
  if (!sessionId) return null;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db
    .insert(sessionsTable)
    .values({
      id: sessionId,
      userId,
      deviceInfo: getDeviceInfo(req),
      ipAddress: getIp(req),
      expiresAt,
    })
    .onConflictDoNothing();
  return sessionId;
}

// Create a custom session (PIN / biometric logins)
async function createCustomSession(userId: string, req: any): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [session] = await db
    .insert(sessionsTable)
    .values({ userId, deviceInfo: getDeviceInfo(req), ipAddress: getIp(req), expiresAt })
    .returning({ id: sessionsTable.id });
  return session.id;
}

function signCustomToken(userId: string, sessionId: string): string {
  const secret = process.env.SESSION_SECRET!;
  return jwt.sign({ userId, sessionId }, secret, { expiresIn: "7d" });
}

// ---------------------------------------------------------------------------
// POST /auth/signup
// ---------------------------------------------------------------------------
router.post("/auth/signup", async (req, res) => {
  const { email, password, name, phone, address } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  // Create Supabase auth user (email_confirm:true skips email verification)
  const { data: createData, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

  if (createErr || !createData.user) {
    const msg = createErr?.message ?? "Signup failed";
    const status = msg.toLowerCase().includes("already") ? 409 : 400;
    res.status(status).json({ error: msg });
    return;
  }

  const supabaseUserId = createData.user.id;

  // Check if user already exists in our table
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  // Insert into our users table using the Supabase UUID as the ID
  await db.insert(usersTable).values({
    id: supabaseUserId,
    email: email.toLowerCase(),
    passwordHash: "supabase_auth",
    name: name ?? null,
    phone: phone ?? null,
    address: address ?? null,
    lastActiveAt: new Date(),
  });

  // Sign in to get a session
  const { data: signInData, error: signInErr } =
    await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

  if (signInErr || !signInData.session) {
    res.status(201).json({ message: "Account created. Please log in." });
    return;
  }

  const { access_token, refresh_token } = signInData.session;
  await trackSupabaseSession(supabaseUserId, access_token, req);
  logActivity(supabaseUserId, "signup", "Account created");
  res.status(201).json({
    id: supabaseUserId,
    email: email.toLowerCase(),
    name: name ?? null,
    token: access_token,
    refresh_token,
    hasPinLogin: false,
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error || !data.session) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const { access_token, refresh_token } = data.session;
  const userId = data.user.id;

  // Ensure user exists in our users table (first login after migration)
  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!dbUser) {
    res.status(401).json({ error: "Account not found. Please sign up." });
    return;
  }

  await db
    .update(usersTable)
    .set({ lastActiveAt: new Date() })
    .where(eq(usersTable.id, userId));

  await trackSupabaseSession(userId, access_token, req);
  logActivity(userId, "login", "Logged in");
  res.json({
    id: userId,
    email: dbUser.email,
    name: dbUser.name,
    hasPinLogin: Boolean(dbUser.pinHash),
    token: access_token,
    refresh_token,
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh — exchange refresh_token for a new access_token
// ---------------------------------------------------------------------------
router.post("/auth/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400).json({ error: "refresh_token required" });
    return;
  }

  const { data, error } = await supabase.auth.refreshSession({ refreshToken: refresh_token });
  if (error || !data.session) {
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  const { access_token, refresh_token: new_refresh } = data.session;
  const userId = data.user!.id;

  // Update session tracking (same session_id, extended)
  const payload = decodeJwtPayload(access_token);
  const sessionId = payload.session_id as string | undefined;
  if (sessionId) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db
      .update(sessionsTable)
      .set({ expiresAt, lastUsedAt: new Date(), isRevoked: false })
      .where(eq(sessionsTable.id, sessionId));
  }

  res.json({ token: access_token, refresh_token: new_refresh, userId });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
router.post("/auth/logout", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) :
    (req as any).cookies?.[COOKIE_NAME] ?? null;

  if (token) {
    // Try Supabase token
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      const payload = decodeJwtPayload(token);
      const sessionId = payload.session_id as string | undefined;
      if (sessionId) {
        await db
          .update(sessionsTable)
          .set({ isRevoked: true })
          .where(eq(sessionsTable.id, sessionId));
      }
      logActivity(user.id, "logout", "Logged out");
    } else {
      // Try custom JWT
      const secret = process.env.SESSION_SECRET;
      if (secret) {
        try {
          const payload = jwt.verify(token, secret) as { userId: string; sessionId?: string };
          if (payload.sessionId) {
            await db
              .update(sessionsTable)
              .set({ isRevoked: true })
              .where(eq(sessionsTable.id, payload.sessionId));
          }
          logActivity(payload.userId, "logout", "Logged out");
        } catch {}
      }
    }
  }

  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /auth/me  (protected)
// ---------------------------------------------------------------------------
router.get("/auth/me", requireAuth, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const userId = (req as any).userId as string;
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
    .where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ ...user, hasPinLogin: Boolean(user.hasPinLogin) });
});

// ---------------------------------------------------------------------------
// PIN Login — set/update/delete (protected)
// ---------------------------------------------------------------------------
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

router.delete("/auth/pin-login", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  await db.update(usersTable).set({ pinHash: null }).where(eq(usersTable.id, userId));
  logActivity(userId, "pin_removed", "PIN login disabled");
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// PIN Login — login with email + PIN (public)
// ---------------------------------------------------------------------------
router.post("/auth/pin-login", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, pin } = req.body;
  if (!email || !pin) {
    res.status(400).json({ error: "email and pin required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
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
  const sessionId = await createCustomSession(user.id, req);
  const token = signCustomToken(user.id, sessionId);
  logActivity(user.id, "pin_login", "Logged in via PIN");
  res.json({ id: user.id, email: user.email, name: user.name, hasPinLogin: true, token });
});

// ---------------------------------------------------------------------------
// Biometric Login (protected: set/delete)
// ---------------------------------------------------------------------------
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

router.delete("/auth/biometric-token", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  await db.update(usersTable).set({ biometricTokenHash: null }).where(eq(usersTable.id, userId));
  logActivity(userId, "biometric_token_removed", "Biometric login disabled");
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Biometric Login — login with email + token (public)
// ---------------------------------------------------------------------------
router.post("/auth/biometric-login", async (req, res) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) { res.status(500).json({ error: "Server misconfigured" }); return; }

  const { email, token } = req.body;
  if (!email || !token) {
    res.status(400).json({ error: "email and token required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
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
  const sessionId = await createCustomSession(user.id, req);
  const jwtToken = signCustomToken(user.id, sessionId);
  logActivity(user.id, "biometric_login", "Logged in via biometric");
  res.json({ id: user.id, email: user.email, name: user.name, hasPinLogin: Boolean(user.pinHash), token: jwtToken });
});

// ---------------------------------------------------------------------------
// Forgot Password — verify email + phone, reset via Supabase Admin
// ---------------------------------------------------------------------------
router.post("/auth/reset-password", async (req, res) => {
  const { email, phone, newPassword } = req.body;
  if (!email || !phone || !newPassword) {
    res.status(400).json({ error: "email, phone and newPassword required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(404).json({ error: "No account found with this email" });
    return;
  }

  const userPhone = (user.phone ?? "").trim().replace(/\s+/g, "");
  const inputPhone = phone.trim().replace(/\s+/g, "");
  if (!userPhone || userPhone !== inputPhone) {
    res.status(401).json({ error: "Phone number does not match our records" });
    return;
  }

  // Update password in Supabase Auth
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updateErr) {
    res.status(500).json({ error: "Failed to reset password" });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordChangedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  // Revoke all sessions so user must log in again with new password
  await db
    .update(sessionsTable)
    .set({ isRevoked: true })
    .where(eq(sessionsTable.userId, user.id));

  logActivity(user.id, "password_reset", "Password reset via phone verification");
  res.json({ ok: true });
});

export default router;
