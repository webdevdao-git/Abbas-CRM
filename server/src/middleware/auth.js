import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';

export function signToken(admin) {
  return jwt.sign({ sub: admin.id, username: admin.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Missing authentication token'));
  }

  try {
    req.admin = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return next(unauthorized('Session expired. Please sign in again.'));
  }
}
