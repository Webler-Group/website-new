import { Request } from "express";
import { ZodType } from "zod";

export function parseWithZod<T extends ZodType<any, any, any>>(schema: T, req: Request) {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers,
    cookies: req.cookies,
    file: req.file
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
