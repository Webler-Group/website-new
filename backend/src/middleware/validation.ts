import { ZodObject } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    });

    let errorMessage = "";

    if (!result.success) {
      result.error?.issues.forEach((issue, i) => {
        errorMessage += i > 0 ? `${issue.message}, `: `${issue.message}`;
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }

    next();
  };
