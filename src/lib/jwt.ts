import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  id?: string;
  email: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: {
  userId?: string;
  id?: string;
  email: string;
  name: string;
  role?: string;
}): string {
  const tokenPayload: JwtPayload = {
    userId: payload.userId || payload.id || '',
    id: payload.id || payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };

  return jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  return decoded as JwtPayload;
}

export function extractTokenFromHeader(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') return null;
  return parts[1] ?? null;
}
