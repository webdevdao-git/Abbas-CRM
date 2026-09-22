export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
export const unauthorized = (message = 'Not authenticated') => new AppError(401, message);
export const notFound = (message = 'Not found') => new AppError(404, message);
export const conflict = (message, details) => new AppError(409, message, details);

/// Wraps an async route handler so rejected promises reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
