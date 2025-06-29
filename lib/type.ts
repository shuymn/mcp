import { Tool as _Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export type Tool = Required<Pick<_Tool, "name" | "description">> & {
  inputSchema: z.ZodRawShape;
  outputSchema: z.ZodType;
};

export type HandlerMap<T extends Tool[]> = {
  [K in T[number]["name"]]: (
    params: z.infer<z.ZodObject<Extract<T[number], { name: K }>["inputSchema"]>>,
  ) =>
    | z.infer<Extract<T[number], { name: K }>["outputSchema"]>
    | Promise<z.infer<Extract<T[number], { name: K }>["outputSchema"]>>;
};
