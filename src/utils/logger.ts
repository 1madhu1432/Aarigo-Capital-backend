import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const devFormat = combine(
  errors({ stack: true }),
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, requestId, ...meta }) => {
    const rid = requestId ? ` [${requestId}]` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts}${rid} ${level}: ${message}${extra}`;
  }),
);

const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json(),
);

export const logger = winston.createLogger({
  level: env.IS_PRODUCTION ? 'info' : 'debug',
  format: env.IS_PRODUCTION ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

// Never log sensitive fields
export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE = new Set([
    'password',
    'passwordhash',
    'jwt_secret',
    'secret',
    'token',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'authorization',
    'jwt',
    'database_url',
    'seed_admin_password',
  ]);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = SENSITIVE.has(k.toLowerCase().replace(/[-_]/g, '')) || SENSITIVE.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return result;
}
