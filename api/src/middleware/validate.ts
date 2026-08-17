import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

type Target = 'body' | 'params' | 'query';

/**
 * Zod validator factory. Parses the chosen request part, replaces it with the
 * parsed (coerced/stripped) data, and forwards Zod errors to the central error
 * handler (→ 422 with field errors). Default target is the body.
 */
export function validate(schema: ZodTypeAny, target: Target = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // query is a getter-only in some Express versions; assign defensively.
    if (target === 'query') {
      Object.assign(req.query, result.data as Record<string, unknown>);
    } else {
      req[target] = result.data;
    }
    next();
  };
}
