import { prisma } from '../../lib/prisma';
import { verifyPassword } from '../../lib/password';
import { signToken } from '../../lib/jwt';
import { ApiError } from '../../utils/apiError';
import { LoginInput } from '../../validators/auth.validator';

export class AuthService {
  static async login(input: LoginInput) {
    const identifier = input.username || input.email || input.mobile;
    if (!identifier) {
      throw ApiError.badRequest('Username, email, or mobile required');
    }

    // Search user by email, mobile, or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
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
