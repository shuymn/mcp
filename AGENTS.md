# Repository Guidelines

## Project Structure & Module Organization
- `servers/`: TypeScript MCP servers (e.g., `servers/openai.ts`, `servers/gemini.ts`). Tests live alongside as `*.test.ts`.
- `lib/`: Shared utilities — env validation (`env.ts`), tools server factory (`tools-server.ts`), shared types (`type.ts`).
- Config: `biome.json`, `bunfig.toml` (tests root `./servers`), `tsconfig.json`, `commitlint.config.cjs`, `lefthook.yml`, `.editorconfig`.

## Build, Test, and Development Commands
- Install deps: `bun install`
- Lint/format: `bun run check`
- Auto-fix lint: `bun run check:fix`
- Type check: `bun run typecheck`
- Run tests: `bun run test` (or `bun test`)
- Run servers:
  - OpenAI: `bun run servers/openai.ts` (or `./servers/openai.ts`)
  - Gemini: `bun run servers/gemini.ts` (or `./servers/gemini.ts`)

## Coding Style & Naming Conventions
- Indentation: 2 spaces for TS/JS; JSON/YAML 2 (see `.editorconfig`).
- Quotes & width: double quotes, line width 120 (`biome.json`).
- Modules: ESM (`"type": "module"`). Prefer Zod for schemas and strong typing.
- Files: kebab-case; tests named `<name>.test.ts` colocated with sources.

## Testing Guidelines
- Framework: `bun:test`; test root is `./servers`.
- Place tests as `*.test.ts` next to the target module.
- Focus on tool I/O validation, env parsing, and error paths.
- Run with `bun run test` and ensure deterministic output.

## Commit & Pull Request Guidelines
- Conventional Commits enforced by commitlint (e.g., `feat: add gemini-cli tool`).
- Hooks: pre-commit runs Biome format/lint; commit-msg validates via commitlint (`lefthook.yml`).
- PRs: include summary, rationale, affected servers, example commands/output, and linked issues. All checks (`check`, `typecheck`, `test`) must pass.

## Security & Configuration Tips
- Secrets in `.env` (ignored). Required: `OPENAI_API_KEY`. For Gemini: `GEMINI_API_KEY` or `GOOGLE_GENAI_USE_VERTEXAI=true` with `GOOGLE_CLOUD_PROJECT` (and optional `GOOGLE_CLOUD_LOCATION`).
- `lib/env.ts` validates and exits on invalid configurations.

## Adding a New Server
- Create `servers/<name>.ts` with a shebang, define `tools` (name, description, Zod input/output), and build with `createToolsServer(...)`. Connect via Stdio only when `import.meta.main`.
- Add `servers/<name>.test.ts` using `bun:test` to cover behavior and edge cases.

