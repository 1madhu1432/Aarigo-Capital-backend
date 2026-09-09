import { prisma } from '../../lib/prisma';
import { verifyPassword, hashPassword } from '../../lib/password';
import { signToken } from '../../lib/jwt';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { LoginInput } from '../../validators/auth.validator';

export class AuthService {
  static async ensureInitialAdmin(): Promise<void> {
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@aarigocapital.com').trim().toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
    const adminName = (process.env.SEED_ADMIN_NAME || 'System Administrator').trim();
    const adminMobile = (process.env.SEED_ADMIN_MOBILE || '9876543210').trim();

    // Check if an administrative user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { mobile: adminMobile },
        ],
      },
    });

    if (!existing) {
      // Initial admin user is required but not yet created
      if (!adminPassword) {
        logger.error(
          'Security configuration error: Initial administrative user does not exist and SEED_ADMIN_PASSWORD environment variable is not configured. Server startup aborted.'
        );
        throw new Error('SEED_ADMIN_PASSWORD_REQUIRED');
      }

      const passwordHash = await hashPassword(adminPassword);
      await prisma.user.create({
        data: {
          email: adminEmail,
          mobile: adminMobile,
          name: adminName,
          passwordHash,
          isActive: true,
        },
      });
      logger.info('Initial administrative user provisioned successfully from environment configuration.');
      return;
    }

    // Admin exists: ensure account is active (idempotent)
    if (!existing.isActive) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      logger.info('Existing administrative user account reactivated.');
    }

    // If SEED_ADMIN_PASSWORD is provided and differs from stored hash, sync credentials
    if (adminPassword) {
      const isMatch = await verifyPassword(adminPassword, existing.passwordHash);
      if (!isMatch) {
        const newHash = await hashPassword(adminPassword);
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash: newHash, isActive: true },
        });
        logger.info('Administrative user credentials updated from SEED_ADMIN_PASSWORD configuration.');
      }
    }
  }

  static async login(input: LoginInput) {
    const identifier = (input.username || input.email || input.mobile || '').trim();
    if (!identifier) {
      throw ApiError.badRequest('Username, email, or mobile required');
    }

    // Search user by email, mobile, or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { email: identifier.toLowerCase() },
          { mobile: identifier },
          { name: identifier },
        ],
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated. Please contact the administrator.');
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const token = signToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
      token,
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  }
}
