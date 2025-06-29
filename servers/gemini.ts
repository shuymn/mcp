#!/usr/bin/env -S deno run --allow-net --allow-env --allow-run --env

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { generateText } from "ai";
import { z } from "zod";
import { createToolsServer } from "../lib/tools-server.ts";
import { Tool } from "../lib/type.ts";

const SERVER_NAME = "gemini";
const TOOL_NAME_GOOGLE_SEARCH = "google-search";
const TOOL_NAME_GEMINI_CLI = "gemini-cli";

// Type definitions for grounding metadata
interface GroundingSource {
  title: string;
  url: string;
}

interface GroundingSupport {
  segment?: {
    endIndex?: number;
  };
  groundingChunkIndices?: number[];
}

interface GroundingMetadata {
  groundingSupports?: GroundingSupport[];
  webSearchQueries?: string[];
  searchEntryPoint?: unknown;
}

const google = createGoogleGenerativeAI({
  apiKey: Deno.env.get("GEMINI_API_KEY") ?? "",
});

// Type guard to check if a support has all required fields
function isValidGroundingSupport(
  support: GroundingSupport,
): support is GroundingSupport & {
  segment: { endIndex?: number };
  groundingChunkIndices: number[];
} {
  return support.segment !== undefined && support.groundingChunkIndices !== undefined;
}

// Helper function to process grounding response and add citations
function processGroundingResponse(
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
      text: `[${
        support.groundingChunkIndices
          .map((idx) => idx + 1)
          .sort((a, b) => a - b)
          .join(",")
      }]`,
    }))
    .sort((a, b) => b.index - a.index);

  // Apply insertions to create final text with citations
  const textWithCitations = insertions
    .filter((insertion) => insertion.index <= text.length)
    .reduce(
      (acc, insertion) =>
        acc.slice(0, insertion.index) + insertion.text + acc.slice(insertion.index),
      text,
    );

  // Build source list
  const sourceList = sources
    .map((source, index) => `[${index + 1}] ${source.title} (${source.url})`)
    .join("\n");

  // Build search queries section if available
  const searchQueries = groundingMetadata.webSearchQueries?.length
    ? "\n\nSearched for: " + groundingMetadata.webSearchQueries.join(", ")
    : "";

  // Compose final result
  return textWithCitations + "\n\nSources:\n" + sourceList + searchQueries;
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
      "Execute the Gemini CLI command with a prompt. This tool launches the local Gemini CLI with your prompt and returns the response.",
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
          messages: [
            {
              role: "user",
              content: params.query,
            },
          ],
        });

        // Extract grounding metadata
        const googleMetadata = providerMetadata?.google as {
          groundingMetadata?: GroundingMetadata;
        } | undefined;

        // Process the response with citations and sources
        const processedText = processGroundingResponse(
          text,
          sources as GroundingSource[] | undefined,
          googleMetadata?.groundingMetadata,
        );

        return processedText || "No response from Gemini model";
      } catch (error) {
        throw new Error(
          `Google search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
    async [TOOL_NAME_GEMINI_CLI](params: { prompt: string }) {
      try {
        // Create the subprocess
        const command = new Deno.Command("gemini", {
          args: ["--prompt", params.prompt],
          stdin: "piped",
          stdout: "piped",
          stderr: "piped",
          env: { ...Deno.env.toObject(), LANG: "en_US.UTF-8" },
        });

        const process = command.spawn();

        // Close stdin since we're passing everything via --prompt
        const writer = process.stdin.getWriter();
        await writer.close();

        // Collect output
        const output = await process.output();

        const textDecoder = new TextDecoder();
        const stdout = textDecoder.decode(output.stdout);
        const stderr = textDecoder.decode(output.stderr);

        return {
          output: stdout,
          exitCode: output.code,
          error: stderr || undefined,
        };
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
if (import.meta.main) {
  await server.connect(new StdioServerTransport());
}

// ------------------- TESTS ↓ -------------------

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";

Deno.test("processGroundingResponse", async (t) => {
  await t.step("returns original text when no grounding metadata", () => {
    const result = processGroundingResponse(
      "Hello world",
      undefined,
      undefined,
    );
    assertEquals(result, "Hello world");
  });

  await t.step("returns original text when no sources", () => {
    const result = processGroundingResponse(
      "Hello world",
      [],
      { groundingSupports: [] },
    );
    assertEquals(result, "Hello world");
  });

  await t.step("appends sources list when sources available", () => {
    const sources: GroundingSource[] = [
      { title: "Example News", url: "https://example.com/article1" },
      { title: "Another Story", url: "https://another.com/story" },
    ];
    const result = processGroundingResponse(
      "Some text",
      sources,
      { groundingSupports: [] },
    );
    assertStringIncludes(result, "[1] Example News (https://example.com/article1)");
    assertStringIncludes(result, "[2] Another Story (https://another.com/story)");
    assertStringIncludes(result, "Sources:");
  });

  await t.step("inserts citations based on grounding supports", () => {
    const sources: GroundingSource[] = [
      { title: "Source 1", url: "https://url1.com" },
      { title: "Source 2", url: "https://url2.com" },
    ];
    const groundingMetadata: GroundingMetadata = {
      groundingSupports: [
        {
          segment: { endIndex: 10 },
          groundingChunkIndices: [0],
        },
        {
          segment: { endIndex: 25 },
          groundingChunkIndices: [1],
        },
      ],
    };
    const result = processGroundingResponse(
      "First part and second part of text",
      sources,
      groundingMetadata,
    );
    assertStringIncludes(result, "[1]");
    assertStringIncludes(result, "[2]");
  });

  await t.step("handles multiple citations at same position", () => {
    const sources: GroundingSource[] = [
      { title: "Source 1", url: "https://url1.com" },
      { title: "Source 2", url: "https://url2.com" },
      { title: "Source 3", url: "https://url3.com" },
    ];
    const groundingMetadata: GroundingMetadata = {
      groundingSupports: [
        {
          segment: { endIndex: 15 },
          groundingChunkIndices: [0, 2],
        },
      ],
    };
    const result = processGroundingResponse(
      "This is a test sentence",
      sources,
      groundingMetadata,
    );
    assertStringIncludes(result, "[1,3]");
  });

  await t.step("appends search queries when available", () => {
    const sources: GroundingSource[] = [
      { title: "Result", url: "https://result.com" },
    ];
    const groundingMetadata: GroundingMetadata = {
      groundingSupports: [],
      webSearchQueries: ["latest AI news", "machine learning trends"],
    };
    const result = processGroundingResponse(
      "Some response",
      sources,
      groundingMetadata,
    );
    assertStringIncludes(result, "Searched for: latest AI news, machine learning trends");
  });

  await t.step("handles out of bounds citation indices", () => {
    const sources: GroundingSource[] = [
      { title: "Source", url: "https://source.com" },
    ];
    const groundingMetadata: GroundingMetadata = {
      groundingSupports: [
        {
          segment: { endIndex: 100 }, // Beyond text length
          groundingChunkIndices: [0],
        },
      ],
    };
    const result = processGroundingResponse(
      "Short text",
      sources,
      groundingMetadata,
    );
    // Should not throw and should still include sources
    assertStringIncludes(result, "[1] Source (https://source.com)");
  });

  await t.step("preserves citation order when sorting", () => {
    const sources: GroundingSource[] = [
      { title: "A", url: "https://a.com" },
      { title: "B", url: "https://b.com" },
      { title: "C", url: "https://c.com" },
    ];
    const groundingMetadata: GroundingMetadata = {
      groundingSupports: [
        {
          segment: { endIndex: 30 },
          groundingChunkIndices: [2],
        },
        {
          segment: { endIndex: 20 },
          groundingChunkIndices: [1],
        },
        {
          segment: { endIndex: 10 },
          groundingChunkIndices: [0],
        },
      ],
    };
    const text = "First part second part third part end";
    const result = processGroundingResponse(text, sources, groundingMetadata);

    // Verify citations appear in correct positions
    const firstCitation = result.indexOf("[1]");
    const secondCitation = result.indexOf("[2]");
    const thirdCitation = result.indexOf("[3]");

    // Citations should appear in order based on their positions in text
    assertEquals(firstCitation < secondCitation, true);
    assertEquals(secondCitation < thirdCitation, true);
  });

  await t.step("handles empty grounding supports array", () => {
    const sources: GroundingSource[] = [
      { title: "Source", url: "https://source.com" },
    ];
    const groundingMetadata: GroundingMetadata = {
      groundingSupports: [],
      webSearchQueries: ["test query"],
    };
    const result = processGroundingResponse(
      "Text without citations",
      sources,
      groundingMetadata,
    );
    // Should include sources but no inline citations
    assertStringIncludes(result, "Sources:");
    assertStringIncludes(result, "[1] Source");
    assertStringIncludes(result, "Searched for: test query");
    // Should not have inline citations
    assertEquals(result.startsWith("Text without citations\n\nSources:"), true);
  });

  await t.step("handles missing segment or groundingChunkIndices", () => {
    const sources: GroundingSource[] = [
      { title: "Source", url: "https://source.com" },
    ];
    const groundingMetadata: GroundingMetadata = {
      groundingSupports: [
        {
          // Missing segment
          groundingChunkIndices: [0],
        },
        {
          segment: { endIndex: 10 },
          // Missing groundingChunkIndices
        },
        {
          // Both present
          segment: { endIndex: 20 },
          groundingChunkIndices: [0],
        },
      ],
    };
    const result = processGroundingResponse(
      "Text with partial metadata",
      sources,
      groundingMetadata,
    );
    // Should only process the valid support entry
    assertStringIncludes(result, "[1]");

    // The issue is that `[1] Source` in the Sources section also matches the regex
    // We need to count only inline citations, not those in the sources list
    const sourcesSectionIndex = result.indexOf("\n\nSources:");
    const textBeforeSources = result.substring(0, sourcesSectionIndex);
    const inlineCitationCount = (textBeforeSources.match(/\[\d+\]/g) || []).length;
    assertEquals(inlineCitationCount, 1); // Only one inline citation should be inserted
  });
});
