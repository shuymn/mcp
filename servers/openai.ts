#!/usr/bin/env -S deno run --allow-net --allow-env --allow-run --env

import { createOpenAI, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { generateText } from "ai";
import { z } from "zod";
import { createToolsServer } from "../lib/tools-server.ts";
import { Tool } from "../lib/type.ts";

const SERVER_NAME = "openai";
const TOOL_NAME = "openai-search";

const searchContextSize = (Deno.env.get("SEARCH_CONTEXT_SIZE") ?? "medium") as
  | "low"
  | "medium"
  | "high";
const reasoningEffort = (Deno.env.get("REASONING_EFFORT") ?? "medium") as
  | "low"
  | "medium"
  | "high";

const openai = createOpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
});

const tools = [
  {
    name: TOOL_NAME,
    description:
      "An AI agent with advanced web search capabilities using OpenAI models. Useful for finding latest information and troubleshooting errors. Supports natural language queries.",
    inputSchema: {
      query: z.string().describe(
        "Ask questions, search for information, or consult about complex problems in English.",
      ),
    },
    outputSchema: z.string().describe("The search result"),
  },
] as const satisfies Tool[];

const server = createToolsServer(
  {
    name: SERVER_NAME,
    version: "1.0.0",
  },
  tools,
  {
    async [TOOL_NAME](params: { query: string }) {
      const { text } = await generateText({
        model: openai.responses(Deno.env.get("OPENAI_MODEL") ?? "o3"),
        experimental_continueSteps: true,
        messages: [
          {
            role: "user",
            content: params.query,
          },
        ],
        tools: {
          web_search_preview: openai.tools.webSearchPreview({ searchContextSize }),
        },
        toolChoice: "auto",
        providerOptions: {
          openai: {
            parallelToolCalls: true,
            reasoningEffort,
          } satisfies OpenAIResponsesProviderOptions,
        },
      });
      return text;
    },
  },
);

// Only connect to server when not in test mode
if (import.meta.main) {
  await server.connect(new StdioServerTransport());
}
