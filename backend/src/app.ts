import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { generalRateLimit } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import apiRouter from './routes';

export function createApp(): Application {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxies
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // API server
    })
  );

  // CORS configuration
  const configuredOrigins = (env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Guarantee production Vercel origin is always permitted
  if (!configuredOrigins.includes('https://aarigo-capital-front-end.vercel.app')) {
    configuredOrigins.push('https://aarigo-capital-front-end.vercel.app');
  }

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!requestOrigin) return callback(null, true);
        if (
          env.CORS_ORIGIN === '*' ||
          configuredOrigins.includes('*') ||
          configuredOrigins.includes(requestOrigin)
        ) {
          return callback(null, true);
        }
        // Allow any Vercel preview branch deployment for this frontend project
        if (/^https:\/\/aarigo-capital-front-end.*\.vercel\.app$/.test(requestOrigin)) {
          return callback(null, true);
        }
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Custom request ID middleware
  app.use(requestIdMiddleware);

  // Apply general rate limiter
  app.use(generalRateLimit);

  // Static files for uploads (documents/receipts)
  const uploadPath = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadPath));

  // Root API welcome endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Aarigo Capital — Loan & EMI Management Backend API',
      version: '1.0.0',
      status: 'UP',
      docs: {
        health: '/health',
        api: '/api',
        endpoints: [
          '/api/auth',
          '/api/customers',
          '/api/loan-products',
          '/api/loans',
          '/api/installments',
          '/api/payments',
          '/api/collections',
          '/api/receipts',
          '/api/visits',
          '/api/routes',
          '/api/reports',
          '/api/dashboard',
          '/api/daily-closing',
        ],
      },
      frontendApp: 'http://localhost:8082',
    });
  });

  // Health check endpoint directly on root and /api/health
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'aarigo-capital-backend',
    });
  });

  // Mount API router under /api
  app.use('/api', apiRouter);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
