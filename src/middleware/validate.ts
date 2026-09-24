import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

import { HttpError } from "../errors/http-error.js";

export function validateBody(schema: ZodType): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "Request body validation failed",
          result.error.flatten(),
        ),
      );
      return;
    }

    request.body = result.data;
    next();
  };
}