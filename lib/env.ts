import z from "zod";

const nonEmpty = z.string().trim().min(1, "must be non-empty");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  GOOGLE_GENAI_USE_VERTEXAI: z
    .string()
    .trim()
    .optional()
    .transform((v) => v?.toLowerCase() === "true"),
  GOOGLE_CLOUD_PROJECT: nonEmpty.optional(),
  GOOGLE_CLOUD_LOCATION: nonEmpty.default("us-central1"),
  GEMINI_API_KEY: nonEmpty.optional(),

  SEARCH_CONTEXT_SIZE: z.enum(["low", "medium", "high"]).default("medium"),
  REASONING_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),
  OPENAI_API_KEY: nonEmpty,
  OPENAI_MAX_TOKENS: z.coerce.number().int().positive().optional(),
});

type Env = z.infer<typeof schema>;

export const env: Env = (() => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((iss) => `  - ${iss.path.join(".")}: ${iss.message}`).join("\n");
    console.error(`[env] Invalid environment variables:\n${details}`);
    process.exit(1);
  }
  return parsed.data;
})();
