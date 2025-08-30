import z from "zod";
import { createEnv, nonEmpty } from "./env";

const schema = z.object({
  GOOGLE_GENAI_USE_VERTEXAI: z
    .string()
    .trim()
    .optional()
    .transform((v) => v?.toLowerCase() === "true"),
  GOOGLE_CLOUD_PROJECT: nonEmpty.optional(),
  GOOGLE_CLOUD_LOCATION: nonEmpty.default("us-central1"),
  GEMINI_API_KEY: nonEmpty.optional(),
  GEMINI_MCP_TIMEOUT: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60 * 1000), // 10 minutes
});

export const env = createEnv(schema);
