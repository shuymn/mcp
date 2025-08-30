import z from "zod";
import { createEnv, nonEmpty } from "./env";

const schema = z.object({
  SEARCH_CONTEXT_SIZE: z.enum(["low", "medium", "high"]).default("high"),
  REASONING_EFFORT: z.enum(["low", "medium", "high"]).default("high"),
  TEXT_VERBOSITY: z.enum(["low", "medium", "high"]).default("high"),
  OPENAI_API_KEY: nonEmpty,
  OPENAI_MAX_TOKENS: z.coerce.number().int().positive().optional(),
  OPENAI_MCP_TIMEOUT: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60 * 1000), // 10 minutes
});

export const env = createEnv(schema);
