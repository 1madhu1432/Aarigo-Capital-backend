import { prisma } from '../../lib/prisma';
import { verifyPassword, hashPassword } from '../../lib/password';
import { signToken } from '../../lib/jwt';
import { ApiError } from '../../utils/apiError';
import { LoginInput } from '../../validators/auth.validator';

export class AuthService {
  static async ensureInitialAdmin(): Promise<void> {
    try {
      const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@aarigocapital.com';
      const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Aarigo@2026';
      const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';
      const adminMobile = process.env.SEED_ADMIN_MOBILE || '9876543210';

      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: adminEmail },
            { mobile: adminMobile },
          ],
        },
      });

      if (!existing) {
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
      } else {
        const isMatch = await verifyPassword(adminPassword, existing.passwordHash);
        if (!isMatch && (process.env.SEED_ADMIN_PASSWORD || (await prisma.user.count()) <= 1)) {
          const newHash = await hashPassword(adminPassword);
          await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash: newHash, isActive: true },
          });
        } else if (!existing.isActive) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        }
      }
    } catch {
      // Non-blocking initialization check
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
