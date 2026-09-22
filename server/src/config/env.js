import dotenv from 'dotenv';

dotenv.config();

const required = (key) => {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${key}. Copy server/.env.example to server/.env and fill it in.`
    );
  }
  return value.trim();
};

const optional = (key, fallback = '') => (process.env[key] ?? fallback).trim();

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '4000')),
  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

  adminUsername: optional('ADMIN_USERNAME', 'admin'),
  adminPassword: optional('ADMIN_PASSWORD'),

  clientOrigins: optional('CLIENT_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // WhatsApp Cloud API stays dormant until every credential is present.
  whatsapp: {
    phoneNumberId: optional('WHATSAPP_PHONE_NUMBER_ID'),
    accessToken: optional('WHATSAPP_ACCESS_TOKEN'),
    verifyToken: optional('WHATSAPP_VERIFY_TOKEN'),
  },
};

export const isProduction = env.nodeEnv === 'production';

export const isWhatsAppApiConfigured = Boolean(
  env.whatsapp.phoneNumberId && env.whatsapp.accessToken
);

if (isProduction && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
