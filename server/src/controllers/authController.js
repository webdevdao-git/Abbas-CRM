import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler, unauthorized } from '../utils/errors.js';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const admin = await prisma.admin.findUnique({
    where: { username: username.toLowerCase() },
  });

  // Compare against a dummy hash when the user is unknown so both branches
  // take the same time.
  const hash = admin?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
  const ok = await bcrypt.compare(password, hash);

  if (!admin || !ok) {
    throw unauthorized('Incorrect username or password.');
  }

  res.json({
    token: signToken(admin),
    admin: { id: admin.id, username: admin.username },
  });
});

export const me = asyncHandler(async (req, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.sub },
    select: { id: true, username: true, createdAt: true },
  });

  if (!admin) throw unauthorized('Account no longer exists.');
  res.json({ admin });
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.sub } });

  if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw unauthorized('Current password is incorrect.');
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });

  res.json({ success: true });
});
