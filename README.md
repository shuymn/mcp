# MCP TypeScript Servers

Personal MCP (Model Context Protocol) servers implemented in TypeScript/Bun.

## Setup

1. Install [Bun](https://bun.sh/)
2. Install dependencies: `bun install`
3. Set environment variables (e.g., `OPENAI_API_KEY`)

## Available Servers

### openai

AI-powered web search using OpenAI models.

**Environment Variables:**
- `OPENAI_API_KEY` (required): Your OpenAI API key
- `OPENAI_MODEL` (optional): OpenAI model to use (default: `o3`)
- `OPENAI_MAX_TOKENS` (optional): Maximum number of tokens for the response
- `SEARCH_CONTEXT_SIZE` (optional): Controls search context size - `low`, `medium`, or `high` (default: `medium`)
- `REASONING_EFFORT` (optional): Controls reasoning effort - `low`, `medium`, or `high` (default: `medium`)

**Available Tools:**
- `openai-search`: An AI agent with advanced web search capabilities. Useful for finding latest information and troubleshooting errors. Supports natural language queries.
  - Input: `query` (string) - Ask questions, search for information, or consult about complex problems in English
  - Output: The search result as a string

```bash
# Run with Bun
bun run servers/openai.ts

# Or run directly (has shebang and executable permissions)
./servers/openai.ts
```

### gemini

Google Search integration using Gemini API with grounding support.

**Environment Variables:**
- `GEMINI_API_KEY` (required when not using Vertex AI): Your Google AI Studio API key
- `GOOGLE_GENAI_USE_VERTEXAI` (optional): Set to `true` to use Vertex AI instead of Google AI Studio
- `GOOGLE_CLOUD_PROJECT` (required when using Vertex AI): Your Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION` (optional): Google Cloud location for Vertex AI (default: `us-central1`)

**Available Tools:**
- `google-search`: Performs a web search using Google Search (via the Gemini API) and returns the results
  - Input: `query` (string) - The search query to find information on the web
  - Output: Search results with inline citations and source URLs
- `gemini-cli`: Execute the Gemini CLI command with a prompt
  - Input: `prompt` (string) - The prompt to send to Gemini CLI
  - Output: Object containing `output` (string), `exitCode` (number), and optional `error` (string)

**Features:**
- Uses Google's search grounding for up-to-date information
- Automatically inserts inline citations in responses
- Shows source URLs and search queries
- Supports both Google AI Studio and Vertex AI

```bash
# Run with Bun
bun run servers/gemini.ts

# Or run directly (has shebang and executable permissions)
./servers/gemini.ts
```

## Development

```bash
bun run check      # Run biome checks (format + lint)
bun run check:fix  # Fix biome issues (format + lint)
bun run typecheck  # Type check with TypeScript
bun run test       # Run tests
```

## Creating New Servers

See `servers/openai.ts` and `servers/gemini.ts` for examples. Use `lib/tools-server.ts` to create type-safe MCP servers with Zod validation.

## Testing

Tests are located in separate `.test.ts` files alongside the server implementations. Run tests with:

```bash
bun test
```
