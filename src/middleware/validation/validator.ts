import { NextFunction, Request, Response } from "express";
import { checkSchema, Schema, validationResult } from "express-validator";
import { authSchema, updateContributionsSchema, updateMetricsSchema } from "./validationSchemas.js";
export * from "./validationSchemas.js";

export const validateSchema = (schema: Schema, statusCode?: number) => {
  return [
    checkSchema(schema),
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(statusCode ?? 422).json({ errors: errors.mapped() });
      }

      next();
    }
  ];
};
export const validateAuth = validateSchema( authSchema, 401);

export const validateUpdateContributions = validateSchema(updateContributionsSchema);

export const validateUpdateMetrics = validateSchema(updateMetricsSchema);

