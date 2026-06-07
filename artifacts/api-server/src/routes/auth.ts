import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken, verifyToken, COOKIE_NAME, COOKIE_OPTIONS } from "../lib/auth";

const router: IRouter = Router();

// In-memory OTP store for local dev (code expires in 10 minutes)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/request-code", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const normalizedEmail = email.toLowerCase();
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user) {
    res.status(404).json({ error: "No account found with that email. Please register first." });
    return;
  }
  const code = generateCode();
  otpStore.set(normalizedEmail, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  // Log to console for local dev — replace with email sending in production
  console.log(`\n🔑 Sign-in code for ${normalizedEmail}: ${code}\n`);
  res.json({ ok: true });
});

router.post("/auth/verify-code", async (req, res): Promise<void> => {
  const { email, code } = req.body ?? {};
  if (!email || !code) {
    res.status(400).json({ error: "Email and code are required" });
    return;
  }
  const normalizedEmail = email.toLowerCase();
  const entry = otpStore.get(normalizedEmail);
  if (!entry || entry.code !== String(code) || Date.now() > entry.expiresAt) {
    res.status(401).json({ error: "Invalid or expired code." });
    return;
  }
  otpStore.delete(normalizedEmail);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const token = signToken({ userId: String(user.id), email: user.email, name: user.name });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({ id: user.id, email: user.email, name: user.name });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { email, password, name } = parsed.data;
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({ email: email.toLowerCase(), name, passwordHash }).returning();
  const token = signToken({ userId: String(user.id), email: user.email, name: user.name });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.status(201).json({ id: user.id, email: user.email, name: user.name });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ userId: String(user.id), email: user.email, name: user.name });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({ id: user.id, email: user.email, name: user.name });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", (req, res): void => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json({ id: payload.userId, email: payload.email, name: payload.name });
});

export default router;
