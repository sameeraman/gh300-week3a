import { z } from "zod";

const positiveIntegerQuery = z
  .string()
  .regex(/^[0-9]+$/, "Must contain only digits")
  .transform(Number)
  .pipe(z.number().int().min(1).max(Number.MAX_SAFE_INTEGER));

export const taskQuerySchema = z.object({
  page: positiveIntegerQuery.default(1),
  limit: positiveIntegerQuery.pipe(z.number().max(100)).default(20),
});
