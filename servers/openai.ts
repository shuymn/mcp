#!/usr/bin/env bun

import { createOpenAI, type OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { generateText } from "ai";
import { z } from "zod";
import { env } from "../lib/env";
import { createToolsServer } from "../lib/tools-server";
import type { Tool } from "../lib/type";

const SERVER_NAME = "openai";
const TOOL_NAME = "openai-search";

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const tools = [
  {
    name: TOOL_NAME,
    description:
      "An AI agent with advanced web search capabilities using OpenAI models. Useful for finding latest information and troubleshooting errors. Supports natural language queries.",
    inputSchema: {
      query: z
        .string()
        .describe("Ask questions, search for information, or consult about complex problems in English."),
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
        model: openai.responses("o3"),
        experimental_continueSteps: true,
        maxTokens: env.OPENAI_MAX_TOKENS,
        system: `You are a web search assistant. Follow these rules:

1. **Use verifiable public information**
    - Cite sources for technical details (Linux docs, GitHub repos, etc.)
    - Mark clearly when information cannot be verified

2. **No speculation**
    - State only what you can verify
    - If context requires inference, explicitly label it as such

3. **Be transparent**
    - Say "I couldn't find this information" when applicable
    - Distinguish between official docs and third-party sources

Keep responses factual, sourced, and honest about limitations.`,
        messages: [
          {
            role: "user",
            content: params.query,
          },
        ],
        tools: {
          web_search_preview: openai.tools.webSearchPreview({
            searchContextSize: env.SEARCH_CONTEXT_SIZE,
          }),
        },
        toolChoice: "auto",
        providerOptions: {
          openai: {
            parallelToolCalls: true,
            reasoningEffort: env.REASONING_EFFORT,
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
