import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getMe(req.user!.id);
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract token from Authorization header and add to blacklist
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1]; // Bearer <token>
        if (token) {
          // Add token to in‑memory blacklist
          const { addTokenToBlacklist } = await import('../utils/tokenBlacklist');
          addTokenToBlacklist(token);
        }
      }
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }
}
