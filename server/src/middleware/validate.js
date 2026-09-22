import { badRequest } from '../utils/errors.js';

/// Validates req[source] with a zod schema and replaces it with the parsed
/// result, so controllers always receive clean, typed input.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(badRequest('Please check the highlighted fields.', details));
  }

  req[source] = result.data;
  return next();
};
