/**
 * Custom error classes for the Services Layer.
 * These are caught by route handlers and converted to HTTP responses.
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = "No autorizado") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = "No tienes permiso") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends ServiceError {
  constructor(message: string) {
    super(message, "RATE_LIMITED", 429);
    this.name = "RateLimitError";
  }
}

export class ConfigurationError extends ServiceError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR", 400);
    this.name = "ConfigurationError";
  }
}

/**
 * Convert a ServiceError to an HTTP-friendly error response payload.
 */
export function toErrorResponse(error: unknown): {
  error: { code: string; message: string };
  statusCode: number;
} {
  if (error instanceof ServiceError) {
    return {
      error: { code: error.code, message: error.message },
      statusCode: error.statusCode,
    };
  }

  const message = error instanceof Error ? error.message : "Error interno del servidor";
  return {
    error: { code: "INTERNAL_ERROR", message },
    statusCode: 500,
  };
}
