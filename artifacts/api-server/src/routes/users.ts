import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { supabaseAdmin, PHOTO_BUCKET, ensureBucket } from "../lib/supabase";
import { logActivity } from "../lib/logActivity";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const USER_SELECT = {
  id: usersTable.id,
  email: usersTable.email,
  name: usersTable.name,
  phone: usersTable.phone,
  address: usersTable.address,
  profilePhotoUrl: usersTable.profilePhotoUrl,
  themePreference: usersTable.themePreference,
  emailVerifiedAt: usersTable.emailVerifiedAt,
  passwordChangedAt: usersTable.passwordChangedAt,
  lastActiveAt: usersTable.lastActiveAt,
  createdAt: usersTable.createdAt,
};

router.get("/users/me", async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select(USER_SELECT).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.patch("/users/me", async (req, res) => {
  const userId = (req as any).userId;
  const { name, phone, address, profilePhotoUrl, themePreference } = req.body;
  const [user] = await db
    .update(usersTable)
    .set({
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(profilePhotoUrl !== undefined && { profilePhotoUrl }),
      ...(themePreference !== undefined && { themePreference }),
    })
    .where(eq(usersTable.id, userId))
    .returning(USER_SELECT);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  logActivity(userId, "profile_updated", "Profile information updated");
  res.json(user);
});

router.post("/users/me/change-password", async (req, res) => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "newPassword must be at least 8 characters" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(usersTable)
    .set({ passwordHash, passwordChangedAt: new Date() })
    .where(eq(usersTable.id, userId));

  logActivity(userId, "password_changed", "Password changed");
  res.json({ ok: true });
});

router.post("/users/me/photo", upload.single("photo"), async (req, res) => {
  const userId = (req as any).userId;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "No photo file provided" });
    return;
  }
  if (!file.mimetype.startsWith("image/")) {
    res.status(400).json({ error: "File must be an image" });
    return;
  }

  try {
    req.log.info({ userId, fileSize: file.size, mimetype: file.mimetype }, "Starting photo upload");

    const { data: bucketData, error: bucketErr } = await supabaseAdmin.storage.getBucket(PHOTO_BUCKET);
    if (bucketErr || !bucketData) {
      req.log.info("Bucket not found, creating...");
      const { error: createErr } = await supabaseAdmin.storage.createBucket(PHOTO_BUCKET, { public: true });
      if (createErr) {
        req.log.error({ err: createErr }, "Failed to create bucket");
        res.status(500).json({ error: "Failed to create storage bucket", detail: createErr.message });
        return;
      }
      req.log.info("Bucket created successfully");
    } else {
      req.log.info({ bucketPublic: bucketData.public }, "Bucket exists");
    }

    const ext = file.mimetype === "image/png" ? "png" : "jpg";
    const objectPath = `${userId}/avatar.${ext}`;

    const { error: removeErr } = await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([
      `${userId}/avatar.jpg`,
      `${userId}/avatar.png`,
    ]);
    if (removeErr) req.log.warn({ err: removeErr }, "Remove old photo warning (non-fatal)");
    else req.log.info("Old photos removed (or did not exist)");

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadErr) {
      req.log.error({ err: uploadErr }, "Supabase Storage upload failed");
      res.status(500).json({ error: "Failed to upload photo", detail: uploadErr.message });
      return;
    }

    req.log.info({ uploadData }, "Upload succeeded");

    const { data: publicUrlData } = supabaseAdmin.storage.from(PHOTO_BUCKET).getPublicUrl(objectPath);
    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    req.log.info({ publicUrl }, "Public URL generated");

    const [user] = await db
      .update(usersTable)
      .set({ profilePhotoUrl: publicUrl })
      .where(eq(usersTable.id, userId))
      .returning(USER_SELECT);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    logActivity(userId, "profile_updated", "Profile photo updated");
    res.json({ url: publicUrl, user });
  } catch (err) {
    req.log.error({ err }, "Photo upload unexpected error");
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

router.get("/users/me/photo", async (req, res) => {
  const userId = (req as any).userId;
  try {
    const [user] = await db
      .select({ profilePhotoUrl: usersTable.profilePhotoUrl })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user?.profilePhotoUrl) { res.status(404).json({ error: "No photo set" }); return; }

    if (user.profilePhotoUrl.startsWith("data:")) {
      const [meta, data] = user.profilePhotoUrl.split(",");
      const contentType = meta.split(":")[1]?.split(";")[0] ?? "image/jpeg";
      const buffer = Buffer.from(data, "base64");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.send(buffer);
      return;
    }

    res.redirect(user.profilePhotoUrl);
  } catch {
    res.status(500).json({ error: "Failed to serve photo" });
  }
});

export default router;
