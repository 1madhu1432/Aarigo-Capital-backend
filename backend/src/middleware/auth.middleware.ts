import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/jwt';
import { ApiError } from '../utils/apiError';
import { prisma } from '../lib/prisma';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';

export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      throw ApiError.unauthorized('Authentication token is required');
    }

    // Check if token is blacklisted using in-memory store
    if (isTokenBlacklisted(token)) {
      throw ApiError.unauthorized('Token has been invalidated');
    }

    const payload = verifyToken(token);
    const userId = payload.userId || (payload as any).id;

    if (!userId) {
      throw ApiError.unauthorized('Invalid token payload');
    }

    // Verify user still exists and is active in DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User account is inactive or not found');
    }

    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'JsonWebTokenError' ||
        err.name === 'TokenExpiredError' ||
        err.name === 'NotBeforeError')
    ) {
      next(ApiError.unauthorized('Invalid or expired token'));
    } else {
      next(err);
    }
  }
}

export const authMiddleware = authenticate;
