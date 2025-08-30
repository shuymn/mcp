import z from "zod";

export const nonEmpty = z.string().trim().min(1, "must be non-empty");

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const createEnv = <T extends z.ZodRawShape>(schema: z.ZodObject<T>): z.infer<z.ZodObject<T>> => {
  const mergedSchema = baseSchema.merge(schema);
  const parsed = mergedSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((iss) => `  - ${iss.path.join(".")}: ${iss.message}`).join("\n");
    console.error(`[env] Invalid environment variables:\n${details}`);
    process.exit(1);
  }
  return parsed.data;
};
