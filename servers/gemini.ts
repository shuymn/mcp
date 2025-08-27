#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { generateText } from "ai";
import { z } from "zod";
import { env } from "../lib/env";
import { createToolsServer } from "../lib/tools-server";
import type { Tool } from "../lib/type";

const SERVER_NAME = "gemini";
const TOOL_NAME_GOOGLE_SEARCH = "google-search";
const TOOL_NAME_GEMINI_CLI = "gemini-cli";

// Type definitions for grounding metadata
export interface GroundingSource {
  title: string;
  url: string;
}

interface GroundingSupport {
  segment?: {
    endIndex?: number;
  };
  groundingChunkIndices?: number[];
}

export interface GroundingMetadata {
  groundingSupports?: GroundingSupport[];
  webSearchQueries?: string[];
  searchEntryPoint?: unknown;
}

function createGoogle() {
  if (env.GOOGLE_GENAI_USE_VERTEXAI) {
    const project = env.GOOGLE_CLOUD_PROJECT;
    if (!project) {
      throw new Error("GOOGLE_CLOUD_PROJECT is not set");
    }

    return createVertex({
      project,
      location: env.GOOGLE_CLOUD_LOCATION,
    });
  }

  return createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
  });
}

const google = createGoogle();

// Type guard to check if a support has all required fields
function isValidGroundingSupport(support: GroundingSupport): support is GroundingSupport & {
  segment: { endIndex?: number };
  groundingChunkIndices: number[];
} {
  return support.segment !== undefined && support.groundingChunkIndices !== undefined;
}

// Helper function to process grounding response and add citations
export function processGroundingResponse(
  text: string,
  sources?: GroundingSource[],
  groundingMetadata?: GroundingMetadata,
): string {
  if (!groundingMetadata || !sources || sources.length === 0) {
    return text;
  }

  const supports = groundingMetadata.groundingSupports || [];

  // Build insertions from valid supports using functional approach
  const insertions = supports
    .filter(isValidGroundingSupport)
    .map((support) => ({
      index: support.segment.endIndex || 0,
      text: `[${support.groundingChunkIndices
        .map((idx) => idx + 1)
        .sort((a, b) => a - b)
        .join(",")}]`,
    }))
    .sort((a, b) => b.index - a.index);

  // Apply insertions to create final text with citations
  const textWithCitations = insertions
    .filter((insertion) => insertion.index <= text.length)
    .reduce((acc, insertion) => acc.slice(0, insertion.index) + insertion.text + acc.slice(insertion.index), text);

  // Build source list
  const sourceList = sources.map((source, index) => `[${index + 1}] ${source.title} (${source.url})`).join("\n");

  // Build search queries section if available
  const searchQueries = groundingMetadata.webSearchQueries?.length
    ? `\n\nSearched for: ${groundingMetadata.webSearchQueries.join(", ")}`
    : "";

  // Compose final result
  return `${textWithCitations}\n\nSources:\n${sourceList}${searchQueries}`;
}

const tools = [
  {
    name: TOOL_NAME_GOOGLE_SEARCH,
    description:
      "Performs a web search using Google Search (via the Gemini API) and returns the results. This tool is useful for finding information on the internet based on a query.",
    inputSchema: {
      query: z.string().describe("The search query to find information on the web."),
    },
    outputSchema: z.string().describe("The search results with citations and sources"),
  },
  {
    name: TOOL_NAME_GEMINI_CLI,
    description:
      "Execute the Gemini CLI command with a prompt. This tool launches the local Gemini CLI with your prompt and returns the response. The Gemini CLI can read and analyze files, including text files, PDFs, images, and entire codebases within its 1M token context window.",
    inputSchema: {
      prompt: z.string().describe("The prompt to send to Gemini CLI"),
    },
    outputSchema: z.object({
      output: z.string().describe("The output from Gemini CLI"),
      exitCode: z.number().describe("The exit code of the process"),
      error: z.string().optional().describe("Any error output if present"),
    }),
  },
] as const satisfies Tool[];

const server = createToolsServer(
  {
    name: SERVER_NAME,
    version: "0.1.0",
  },
  tools,
  {
    async [TOOL_NAME_GOOGLE_SEARCH](params: { query: string }) {
      if (!params.query || params.query.trim() === "") {
        throw new Error("Search query cannot be empty");
      }

      try {
        // Generate text with Google Search grounding enabled
        const { text, providerMetadata, sources } = await generateText({
          model: google("gemini-2.5-pro", { useSearchGrounding: true }),
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
        });

        // Extract grounding metadata
        const googleMetadata = providerMetadata?.google as
          | {
              groundingMetadata?: GroundingMetadata;
            }
          | undefined;

        // Process the response with citations and sources
        const processedText = processGroundingResponse(
          text,
          sources as GroundingSource[] | undefined,
          googleMetadata?.groundingMetadata,
        );

        return processedText || "No response from Gemini model";
      } catch (error) {
        throw new Error(`Google search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    },
    async [TOOL_NAME_GEMINI_CLI](params: { prompt: string }) {
      try {
        // Use Node.js child_process spawn instead of Deno.Command
        return new Promise((resolve) => {
          const geminiProcess = spawn("gemini", ["--prompt", params.prompt], {
            env: { ...process.env, LANG: "en_US.UTF-8" },
          });

          let stdout = "";
          let stderr = "";

          geminiProcess.stdout?.on("data", (data) => {
            stdout += data.toString();
          });

          geminiProcess.stderr?.on("data", (data) => {
            stderr += data.toString();
          });

          geminiProcess.on("close", (code) => {
            resolve({
              output: stdout,
              exitCode: code ?? 1,
              error: stderr || undefined,
            });
          });

          geminiProcess.on("error", (error) => {
            resolve({
              output: "",
              exitCode: 1,
              error: error.message,
            });
          });
        });
      } catch (error) {
        return {
          output: "",
          exitCode: 1,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
);

// Only connect to server when not in test mode
if (import.meta.main !== false) {
  await server.connect(new StdioServerTransport());
}
