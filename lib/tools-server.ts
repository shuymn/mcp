import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { HandlerMap, Tool } from "./type";

type ServerInfo = Pick<Implementation, "name" | "version">;

export function createToolsServer<T extends Tool[]>(serverInfo: ServerInfo, tools: T, handlers: HandlerMap<T>) {
  const server = new McpServer(serverInfo);

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => {
        const handler = handlers[tool.name as T[number]["name"]];
        const result = await handler(args as z.infer<z.ZodObject<T[number]["inputSchema"]>>);
        const validatedResult = tool.outputSchema.parse(result);
        return {
          content: [{ type: "text", text: JSON.stringify(validatedResult) }],
        };
      },
    );
  }

  return server;
}
