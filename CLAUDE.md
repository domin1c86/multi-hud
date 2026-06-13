# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build / Test / Dev

```bash
npm run build        # TypeScript → dist/ (tsc)
npm run dev          # Watch mode (tsc --watch)
npm test             # Run all tests (vitest run)
npm run test:watch   # Watch mode (vitest)
npx vitest run tests/path/to/file.test.ts   # Run a single test file
npm run lint         # ESLint check (src/ and tests/)
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier write (src/ and tests/)
npm run format:check # Prettier check
```

Prettier: single quotes, trailing commas, semicolons, 120-char print width, 2-space indent.

## Architecture

This is a **Claude Code statusline plugin** — Claude Code launches it as a subprocess, streams `statusline` and `transcript` JSON events on stdin, and the plugin writes ANSI-escaped status lines to stdout. There is no server, no HTTP listener, no persistent process outside Claude Code.

### Data flow

```
Claude Code stdin ──→ index.ts (JSONL parse loop)
                        ├── statusline events → Engine → Provider API polling
                        ├── transcript events → parseTranscript() (tools/agents/todos)
                        └── both feed → renderStatusline() → stdout (ANSI lines)
```

### Key modules

- **[src/index.ts](src/index.ts)** — Entry point. Reads JSONL from stdin, dispatches `statusline` events to engine/renderer and accumulates `transcript` events (sliding window of last 1000 lines, keeps 500 on trim).
- **[src/core/engine.ts](src/core/engine.ts)** — Manages provider lifecycle: detects provider from model ID prefix (`deepseek`/`kimi`/`glm`/`minimax`/`mimo`), swaps adapters on change, starts `setInterval` polling, and populates a TTL in-memory cache.
- **[src/core/cache.ts](src/core/cache.ts)** — Simple `Map<string, {value, expiresAt}>` TTL cache. Entries expire silently on `get()`. Used by the engine for `tokenUsage`, `quotas`, `contextLimit`, and `error` keys.
- **[src/core/renderer.ts](src/core/renderer.ts)** — Pure function `renderStatusline()` that takes a `RenderInput` and returns `string[]` (one per output line). Produces up to 5 lines: model + git + context bar, quotas/tokens + cost, tools, agents, todos.
- **[src/core/transcript.ts](src/core/transcript.ts)** — Parses Claude Code JSONL transcript events (`tool_start`, `tool_done`, `agent_start`, `agent_done`, `todo_add`, `todo_done`) into structured `{tools, agents, todos}` state. Only running agents are included in output.
- **[src/core/git.ts](src/core/git.ts)** — Shells out to `git` (rev-parse, rev-list, status --porcelain). Accepts `exec` param for testability. Silent failure returns empty state.
- **[src/core/cost.ts](src/core/cost.ts)** — Multiplies input/output tokens by per-model per-1K-token pricing rates. Returns `null` if the model has no pricing config.
- **[src/core/config.ts](src/core/config.ts)** — Loads `~/.claude/plugins/multi-hud/config.json`, deep-merges with defaults. All config keys are optional — missing values fall through to `defaultConfig`.

### Provider adapter pattern

All providers extend `BaseProvider` ([src/providers/base.ts](src/providers/base.ts)) which provides `fetchJson<T>(url, init?)` — a thin wrapper around `fetch()` that adds `Authorization: Bearer <apiKey>` and the provider's `baseUrl` prefix. Each concrete provider (DeepSeek, Kimi, GLM, MiniMax, MiMo) implements three methods:

- `getTokenUsage()` → `TokenUsage | null` (input/output/total tokens)
- `getQuotas()` → `QuotaWindow[] | null` (5h/24h/7d/30d windows with used/limit/percentage)
- `getContextLimit(modelId)` → `number` (default 64000)

Errors in API calls are caught and return `null` — the engine stores error strings in cache which the renderer displays on the second status line.

### Theme compilation pipeline

Themes are "compiled" from hex color specs to raw ANSI escape codes **once at load time** via `resolveTheme()` → `compileTheme()` in [src/themes/index.ts](src/themes/index.ts). The pipeline is:

1. **Lookup** — find built-in theme by name (falling back to `default`)
2. **Merge** — `mergeTheme()` applies `customTheme` overrides via `structuredClone` + `Object.assign` on colors/icons/layout, and per-bar-key merge on bars
3. **Compile** — `compileTheme()` deep-clones the theme, then converts every `colors.*` value to an ANSI escape via `compileColorSpec()`, and every `bars.*.fgColor`/`bgColor` to their respective ANSI escapes

The **color spec DSL** (parsed by `parseColorSpec()` in [src/themes/compiler.ts](src/themes/compiler.ts)):
- `#RRGGBB` — foreground hex color
- `[#RRGGBB]` — background hex color (wrapped in brackets)
- `b#RRGGBB[#RRGGBB]` — bold foreground with background (`b` and `i` modifiers stack)
- If only foreground is specified, background is **derived** at 2/3 brightness; if only background, foreground is derived at 1.5x brightness

The renderer receives already-compiled ANSI strings — it never touches hex values.

### Theme customization

Users configure `customTheme` as a partial theme object in `config.json`. The merge in [src/themes/custom.ts](src/themes/custom.ts) applies `Object.assign` at the top level for `colors`, `icons`, and `layout`, and per-key merge for `bars` (so you can override e.g. `bars.context.fgColor` without losing other bar keys).

### Animations

[src/animations/pulse.ts](src/animations/pulse.ts) generates brightness-variation escape codes. [src/animations/laser.ts](src/animations/laser.ts) generates a single-frame sweep effect. These are referenced in the type system (`AnimationConfig`) but the renderer currently outputs static bars — the animation frame generation exists in the animation modules for future use.

### Testing

20 test files, all vitest with `environment: 'node'` and `globals: true`. Tests mirror `src/` structure under `tests/`. Provider tests use `fetch` mocking. Config tests verify deep merge behavior. Compiler tests verify hex spec parsing and derivation math. Renderer tests verify output shape. Git tests pass a mock `exec` function. Each provider has its own test file.
