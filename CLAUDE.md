# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Tasks
- **Format code**: `deno task fmt`
- **Check formatting**: `deno task fmt:check`
- **Lint code**: `deno task lint`
- **Run server**: `deno run --allow-read --allow-net --allow-env servers/o4-mini.ts`
- **Run tests**: `deno test --allow-env servers/gemini.ts`

### Git Hooks
The project uses Lefthook for pre-commit hooks that automatically run formatting and linting checks. These are configured in `lefthook.yml`.

## Architecture Overview

This is a Model Context Protocol (MCP) implementation in TypeScript/Deno that provides a framework for creating MCP servers with AI tool integrations.

### Core Library Pattern (`lib/`)

The architecture uses a type-safe pattern for defining and implementing MCP tools:

1. **Type System** (`lib/type.ts`):
   - Defines the `Tool` type that enforces structure with Zod schemas for input/output validation
   - Provides type utilities (`InferAvailableTools`, `HandlerMap`) for type-safe tool implementations

2. **Server Factory** (`lib/tools-server.ts`):
   - `createToolsServer()` creates an MCP server instance with automatic tool registration
   - Handles tool execution with automatic input/output validation using Zod schemas
   - Returns results in MCP-compliant format

3. **Testing Utilities** (`lib/test-client.ts`):
   - `createInMemoryTestClient()` creates in-memory client-server pairs for testing
   - Provides type-safe tool calling with automatic result parsing

### Server Implementation Pattern

Servers follow this pattern (see `servers/o4-mini.ts` and `servers/gemini.ts`):

1. Define tools as const arrays satisfying the `Tool` type
2. Use `createToolsServer()` with server info, tools array, and handler map
3. Connect using appropriate transport (typically `StdioServerTransport`)
4. Environment variables control server behavior (e.g., `SEARCH_CONTEXT_SIZE`, `REASONING_EFFORT`, `GEMINI_API_KEY`)

### Key Dependencies

- **MCP SDK**: `@modelcontextprotocol/sdk` - Core protocol implementation
- **AI SDKs**: `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` - LLM integrations
- **Vercel AI SDK**: `ai` - Unified interface for AI operations
- **Zod**: Schema validation and type inference

## Creating New MCP Servers

1. Create a new file in `servers/` directory
2. Import necessary dependencies and the library utilities
3. Define your tools array with Zod schemas
4. Implement handlers that match the tool signatures
5. Use `createToolsServer()` to create and connect the server

Example structure:
```typescript
const tools = [{
  name: "tool_name",
  description: "Tool description",
  inputSchema: { param: z.string() },
  outputSchema: z.string()
}] as const satisfies Tool[];

const server = createToolsServer(
  { name: "server-name", version: "1.0.0" },
  tools,
  {
    async tool_name(params) {
      // Implementation
      return "result";
    }
  }
);
```

## Testing

The Gemini server includes comprehensive unit tests demonstrating best practices:

1. **In-file tests**: Tests can be written in the same file using `Deno.test`
2. **Type guards**: Use type guards to ensure type safety without non-null assertions
3. **Functional programming**: Prefer immutable transformations with map/filter/reduce
4. **Test coverage**: Aim for comprehensive coverage including edge cases

Run tests with:
```bash
deno test --allow-env servers/gemini.ts
```