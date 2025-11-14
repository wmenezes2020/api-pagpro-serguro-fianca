import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET ?? 'change-me',
    accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
    refreshTokenSecret:
      process.env.JWT_REFRESH_TOKEN_SECRET ?? 'change-me-refresh',
    refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '7d',
  },
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '3306', 10),
    username: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? 'root',
    name: process.env.DATABASE_NAME ?? 'pagpro',
  },
  metrics: {
    defaultCoverageMultiplier: parseFloat(
      process.env.COVERAGE_MULTIPLIER ?? '3',
    ),
    monthlyPremiumRate: parseFloat(process.env.MONTHLY_PREMIUM_RATE ?? '0.15'),
    adhesionFeeRate: parseFloat(process.env.ADHESION_FEE_RATE ?? '1'),
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
}));
