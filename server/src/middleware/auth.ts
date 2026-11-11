import type { NextFunction, Request, Response } from 'express';
import type { Role, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/jwt';
import { AppError, forbidden } from '../lib/errors';

export type AuthUser = Pick<User, 'id' | 'username' | 'name' | 'nameLocal' | 'role' | 'office'>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Login required');

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, name: true, nameLocal: true, role: true, office: true },
    });
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists');
    req.user = user;
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(401, 'UNAUTHENTICATED', 'Session expired, please log in again'));
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };

/** Use inside handlers after requireAuth. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Login required');
  return req.user;
}
