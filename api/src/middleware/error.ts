import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Typed application error. The error envelope is always:
 *   { error: { message, code, fields? } }
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, string[]>;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Gone') {
    super(message, 410, 'GONE');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', fields?: Record<string, string[]>) {
    // 422 for semantic validation failures (UCD UC-O02 alt path).
    super(message, 422, 'VALIDATION_ERROR', fields);
  }
}

/** Wrap async route handlers so rejected promises reach the error handler. */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** 404 fallback for unmatched routes (registered after all routers). */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
};

function zodToFields(err: ZodError): Record<string, string[]> {
  const flat = err.flatten();
  const fields: Record<string, string[]> = {};
  for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
    if (msgs && msgs.length) fields[key] = msgs;
  }
  if (flat.formErrors.length) fields._ = flat.formErrors;
  return fields;
}

/** Central error handler — MUST be registered last. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Zod validation → 422
  if (err instanceof ZodError) {
    res.status(422).json({
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields: zodToFields(err) },
    });
    return;
  }

  // Mongoose document validation → 422
  if (err instanceof mongoose.Error.ValidationError) {
    const fields: Record<string, string[]> = {};
    for (const [path, e] of Object.entries(err.errors)) {
      fields[path] = [e.message];
    }
    res.status(422).json({
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', fields },
    });
    return;
  }

  // Mongoose cast (bad ObjectId etc.) → 400
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: { message: `Invalid value for ${err.path}`, code: 'BAD_REQUEST' },
    });
    return;
  }

  // Duplicate key (unique index) → 409
  if (err instanceof MongoServerError && err.code === 11000) {
    const keys = Object.keys((err as MongoServerError).keyValue ?? {});
    res.status(409).json({
      error: {
        message: 'Duplicate value violates a unique constraint',
        code: 'DUPLICATE_KEY',
        fields: keys.length ? { [keys[0] as string]: ['already exists'] } : undefined,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error('Operational/server error', { code: err.code, msg: err.message, path: req.path });
    }
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code, ...(err.fields ? { fields: err.fields } : {}) },
    });
    return;
  }

  // Unknown / unexpected error → 500
  const e = err as Error;
  logger.error('Unexpected error', { error: e?.message, stack: e?.stack, path: req.path });
  res.status(500).json({
    error: {
      message: env.isProd ? 'Something went wrong' : (e?.message ?? 'Internal error'),
      code: 'INTERNAL_ERROR',
    },
  });
};
