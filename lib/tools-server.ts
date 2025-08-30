import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { HandlerMap, Tool } from "./type";

type ServerInfo = Pick<Implementation, "name" | "version">;

export type TimeoutConfig<T extends Tool[]> = {
  /** Default timeout for all tools in milliseconds */
  defaultTimeout?: number;
  /** Per-tool timeouts in milliseconds */
  perToolTimeout?: Record<T[number]["name"], number>;
};

export function createToolsServer<T extends Tool[]>(
  serverInfo: ServerInfo,
  tools: T,
  handlers: HandlerMap<T>,
  timeoutConfig?: TimeoutConfig<T>,
) {
  const server = new McpServer(serverInfo);

  for (const tool of tools) {
    const name = tool.name as T[number]["name"];

    server.registerTool(
      name,
      {
        title: name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => {
        const handler = handlers[name];

        // Determine the timeout for this tool
        const timeout = timeoutConfig?.perToolTimeout?.[name] ?? timeoutConfig?.defaultTimeout;

        let result: unknown;

        if (timeout !== undefined) {
          // Setup optional cancellation and a cleanup-able timer
          const controller = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;

          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error(`Tool '${tool.name}' execution timed out after ${timeout}ms`));
            }, timeout);
          });

          try {
            // Race between the handler and the timeout
            result = await Promise.race([
              Promise.resolve(
                handler(args as z.infer<z.ZodObject<T[number]["inputSchema"]>>, { signal: controller.signal }),
              ),
              timeoutPromise,
            ]);
          } finally {
            if (timer !== undefined) {
              clearTimeout(timer);
            }
          }
        } else {
          // No timeout configured, execute normally
          result = await handler(args as z.infer<z.ZodObject<T[number]["inputSchema"]>>);
        }

        const validatedResult = tool.outputSchema.parse(result);
        return {
          content: [{ type: "text", text: JSON.stringify(validatedResult) }],
        };
      },
    );
  }

  return server;
}
