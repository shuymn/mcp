#!/usr/bin/env bun

import { createOpenAI, type OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { generateText } from "ai";
import { z } from "zod";
import { env } from "../lib/env";
import { createToolsServer } from "../lib/tools-server";
import type { Tool, ToolContext } from "../lib/type";

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
    async [TOOL_NAME](params: { query: string }, context?: ToolContext) {
      const { text } = await generateText({
        model: openai("gpt-5"),
        maxOutputTokens: env.OPENAI_MAX_TOKENS,
        abortSignal: context?.signal, // Propagate timeout/cancellation from tools-server via AbortSignal
        system: `# Role and Objective
- Assist users by providing factual, web-sourced information with transparent sourcing, and clarify information limitations.

# Instructions
- Rely exclusively on verifiable public information.
- Always provide clear citations for technical details (e.g., official Linux documentation, GitHub repositories), distinguishing between official and third-party sources.
- Clearly indicate when information cannot be verified, and avoid speculation—provide only confirmable information. Explicitly label any inference based on context.
- If information is unavailable, state: "I couldn't find this information."
- Responses must remain factual, well-sourced, and transparent about any limitations or gaps in information.

# Pre-response Checklist
- Begin with a concise checklist (3-5 bullets) outlining key sub-tasks (e.g., information gathering, verification, citation, limitations review) before providing the substantive response.

# Output Format
- Use markdown for clarity, including links, lists, and code blocks where appropriate.
- Clearly cite all sources inline with the relevant content.

# Verbosity
- Provide concise summaries by default. Expand with additional details only when required for clarity.

# Stop Conditions and Confidence
- Provide a response only when you are confident in its accuracy and verifiability. If information cannot be found or verified, escalate or request clarification, and state limitations clearly.`,
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
            textVerbosity: env.TEXT_VERBOSITY,
          } satisfies OpenAIResponsesProviderOptions,
        },
      });
      return text;
    },
  },
  { defaultTimeout: env.OPENAI_MCP_TIMEOUT },
);

// Only connect to server when not in test mode
if (import.meta.main) {
  await server.connect(new StdioServerTransport());
}
