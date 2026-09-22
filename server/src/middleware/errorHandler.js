import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { isProduction } from '../config/env.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'value';
      return res.status(409).json({
        error: target.includes('phone')
          ? 'A guest with this mobile number already exists.'
          : `That ${target} is already taken.`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'That record no longer exists.' });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({ error: 'This record is still referenced by other data.' });
    }
  }

  // A database check constraint rejected the write.
  if (err instanceof Prisma.PrismaClientUnknownRequestError && /violates check constraint/i.test(err.message)) {
    return res.status(400).json({ error: 'That change breaks a data rule (check the counts).' });
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    /can't reach database server/i.test(err.message ?? '')
  ) {
    return res.status(503).json({
      error: 'Cannot reach the database right now. Your change was NOT saved. Please try again.',
    });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({
    error: 'Something went wrong on the server.',
    ...(isProduction ? {} : { detail: err.message }),
  });
}
