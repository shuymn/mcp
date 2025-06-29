# MCP TypeScript Servers

Personal MCP (Model Context Protocol) servers implemented in TypeScript/Deno.

## Setup

1. Install [Deno](https://deno.land/)
2. Set environment variables (e.g., `OPENAI_API_KEY`)

## Available Servers

### o4-mini

AI-powered web search using OpenAI's o4-mini model.

```bash
# Run directly (has shebang and executable permissions)
./servers/o4-mini.ts

# Or configure in Claude Desktop:
# ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "o4-mini": {
      "command": "/path/to/mcp/servers/o4-mini.ts",
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

### gemini

Google Search integration using Gemini API with grounding support.

```bash
# Run directly
./servers/gemini.ts

# Or configure in Claude Desktop:
{
  "mcpServers": {
    "gemini": {
      "command": "/path/to/mcp/servers/gemini.ts",
      "env": {
        "GEMINI_API_KEY": "your-key"
      }
    }
  }
}
```

Features:
- Uses Google's search grounding for up-to-date information
- Automatically inserts inline citations in responses
- Shows source URLs and search queries
- Comprehensive test coverage

## Development

```bash
deno task fmt      # Format code
deno task lint     # Lint code
```

## Creating New Servers

See `servers/o4-mini.ts` and `servers/gemini.ts` for examples. Use `lib/tools-server.ts` to create type-safe MCP servers with Zod validation.