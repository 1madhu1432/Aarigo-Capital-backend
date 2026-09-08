import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';
import { AuthService } from './services/auth/auth.service';
import http from 'http';

let server: http.Server;

async function startServer(): Promise<void> {
  try {
    // Attempt DB connection
    logger.info('Connecting to database...');
    try {
      await prisma.$connect();
      logger.info('Database connection established successfully');
      await AuthService.ensureInitialAdmin();
    } catch (dbErr: any) {
      logger.warn(`Database connection warning: ${dbErr.message}. Starting HTTP server anyway...`);
    }

    server = app.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`  Aarigo Capital API running on port ${env.PORT}`);
      logger.info(`  Environment: ${env.NODE_ENV}`);
      logger.info(`  Health check: http://localhost:${env.PORT}/health`);
      logger.info(`  API endpoint: http://localhost:${env.PORT}/api`);
      logger.info(`=======================================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed');
          await prisma.$disconnect();
          logger.info('Database client disconnected');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
