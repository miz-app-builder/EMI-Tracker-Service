import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

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

  res.json({ ok: true });
});

router.post("/users/me/photo/request-url", async (req, res) => {
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate upload URL" });
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

    const objectPath = user.profilePhotoUrl.startsWith("/objects/")
      ? user.profilePhotoUrl
      : `/objects/${user.profilePhotoUrl}`;

    const file = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(file);
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");

    const reader = (response.body as any).getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(value);
      await pump();
    };
    await pump();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Photo not found" });
    } else {
      res.status(500).json({ error: "Failed to serve photo" });
    }
  }
});

export default router;
