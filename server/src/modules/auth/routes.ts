import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';
import { AppError } from '../../lib/errors';
import { asyncHandler } from '../../lib/asyncHandler';
import { currentUser, requireAuth } from '../../middleware/auth';

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const loginSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong username or password');
    }
    const { passwordHash: _ph, ...safe } = user;
    res.json({ token: signToken({ sub: user.id, role: user.role }), user: safe });
  }),
);

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: currentUser(req) });
});
