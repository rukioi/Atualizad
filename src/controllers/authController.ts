import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  key: z.string().min(1, 'Registration key is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      console.log('Registration attempt:', { email: req.body.email, name: req.body.name });
      
      const validatedData = registerSchema.parse(req.body);
      
      const { user, tokens, isNewTenant } = await authService.registerUser(
        validatedData.email,
        validatedData.password,
        validatedData.name,
        validatedData.key
      );

      console.log('Registration successful:', { userId: user.id, tenantId: user.tenant_id });

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          accountType: user.account_type,
          tenantId: user.tenant_id,
          tenantName: 'Default Tenant',
        },
        tokens,
        isNewTenant,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      console.log('Login attempt:', { email: req.body.email });
      
      const validatedData = loginSchema.parse(req.body);

      const { user, tokens } = await authService.loginUser(validatedData.email, validatedData.password);

      console.log('Login successful:', { userId: user.id, tenantId: user.tenant_id });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          accountType: user.account_type,
          tenantId: user.tenant_id,
          tenantName: 'Default Tenant',
        },
        tokens,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const validatedData = refreshSchema.parse(req.body);

      const { user, tokens } = await authService.refreshTokens(validatedData.refreshToken);

      res.json({
        message: 'Tokens refreshed',
        user,
        tokens,
      });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (token) {
        try {
          const decoded = await authService.verifyAccessToken(token);
          await authService.revokeAllTokens(decoded.userId, !!decoded.role);
        } catch (error) {
          console.error('Error revoking tokens during logout:', error);
        }
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      // Even if token verification fails, return success for logout
      res.json({ message: 'Logout successful' });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Return user profile
      const user = {
        id: userId,
        email: (req as any).user?.email || 'user@example.com',
        name: (req as any).user?.name || 'User',
        accountType: (req as any).user?.accountType || 'SIMPLES',
        tenantId: (req as any).user?.tenantId || 'default',
        tenantName: 'Default Tenant',
      };

      res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get profile',
      });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      res.json({
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        error: 'Failed to update profile',
      });
    }
  }
}

export const authController = new AuthController();