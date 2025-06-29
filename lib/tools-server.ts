import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { HandlerMap, Tool } from "./type.ts";
import { z } from "zod";

type ServerInfo = Pick<Implementation, "name" | "version">;

export function createToolsServer<T extends Tool[]>(
  serverInfo: ServerInfo,
  tools: T,
  handlers: HandlerMap<T>,
) {
  const server = new McpServer(serverInfo);

  for (const tool of tools) {
    server.registerTool(tool.name, {
      title: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }, async (args) => {
      const handler = handlers[tool.name as T[number]["name"]];
      const result = await handler(args as z.infer<z.ZodObject<T[number]["inputSchema"]>>);
      const validatedResult = tool.outputSchema.parse(result);
      return { content: [{ type: "text", text: JSON.stringify(validatedResult) }] };
    });
  }

  return server;
}
