import type { Tool as _Tool } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

export type Tool = Required<Pick<_Tool, "name" | "description">> & {
  inputSchema: z.ZodRawShape;
  outputSchema: z.ZodType;
};

export type ToolContext = {
  /** Abort signal that is triggered when a tool times out */
  signal?: AbortSignal;
};

export type HandlerMap<T extends Tool[]> = {
  [K in T[number]["name"]]: (
    params: z.infer<z.ZodObject<Extract<T[number], { name: K }>["inputSchema"]>>,
    context?: ToolContext,
  ) =>
    | z.infer<Extract<T[number], { name: K }>["outputSchema"]>
    | Promise<z.infer<Extract<T[number], { name: K }>["outputSchema"]>>;
};
