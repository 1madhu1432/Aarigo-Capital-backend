import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory and relative backend root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

export const env = {
  PORT: optionalNumber('PORT', 5000),
  NODE_ENV: optional('NODE_ENV', 'development'),
  IS_PRODUCTION: optional('NODE_ENV', 'development') === 'production',
  IS_DEVELOPMENT: optional('NODE_ENV', 'development') === 'development',

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '8h'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  CORS_ORIGIN: optional(
    'CORS_ORIGIN',
    'https://aarigo-capital-front-end.vercel.app,http://localhost:5173,http://localhost:8080,http://localhost:8082'
  ),

  UPLOAD_DIR: optional('UPLOAD_DIR', './uploads'),
  MAX_FILE_SIZE_MB: optionalNumber('MAX_FILE_SIZE_MB', 10),

  RATE_LIMIT_WINDOW_MS: optionalNumber('RATE_LIMIT_WINDOW_MS', 900_000),
  RATE_LIMIT_MAX_REQUESTS: optionalNumber('RATE_LIMIT_MAX_REQUESTS', 500),
  AUTH_RATE_LIMIT_MAX: optionalNumber('AUTH_RATE_LIMIT_MAX', 10),

  SEED_ADMIN_EMAIL: optional('SEED_ADMIN_EMAIL', 'admin@aarigocapital.com'),
  SEED_ADMIN_PASSWORD: optional('SEED_ADMIN_PASSWORD', ''),
} as const;
