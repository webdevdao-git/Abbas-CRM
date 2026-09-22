import { PrismaClient } from '@prisma/client';
import { isProduction } from './env.js';

// Reuse one client across hot reloads and serverless invocations.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__abbasPrisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['error', 'warn'],
  });

if (!isProduction) globalForPrisma.__abbasPrisma = prisma;

/// Used by /api/health so the UI can show a real "database unreachable" state
/// instead of pretending writes succeeded.
export async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error) {
    return { connected: false, message: error.message };
  }
}
