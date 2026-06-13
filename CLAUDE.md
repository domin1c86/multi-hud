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

This is a **Claude Code statusline plugin** — Claude Code launches it as a subprocess, streams `statusline` and `transcript` JSON events on stdin, and the plugin writes ANSI-escaped status lines to stdout. There is no server, no HTTP listener, no persistent process outside Claude Code. The entry point (`src/index.ts`) reads exactly **one** JSON object from stdin per invocation.

### Data flow

```
Claude Code stdin ──→ index.ts (reads single JSON object)
                        ├── direct provider API calls (quotas/balance)
                        ├── cost.ts → pricing.ts (model pricing + context limits)
                        ├── credits.ts → mimo2credits.json (MiMo credit pricing)
                        ├── state.ts (MiMo credit state persistence across invocations)
                        ├── git.ts (rev-parse, rev-list, status)
                        └── renderer.ts → stdout (ANSI lines)
```

Note: [src/core/engine.ts](src/core/engine.ts) (provider lifecycle/polling manager) and [src/core/transcript.ts](src/core/transcript.ts) (JSONL transcript parser) exist but are not yet wired into main() — provider calls are made directly via `getProviderAdapter()`, and `tools`/`agents`/`todos` are passed as empty arrays to the renderer. The Engine and Transcript modules are ready for future integration.

### Key modules

- **[src/index.ts](src/index.ts)** — Entry point. Reads a single JSON object from stdin (Claude Code sends one per invocation), resolves the real model ID (handling cc-switch routing via settings.json), detects the provider from model ID prefix, calls provider adapters directly for quotas/balance, computes cost, gets git status, and renders.
- **[src/core/pricing.ts](src/core/pricing.ts)** — Built-in model pricing (CNY per 1M tokens), context window limits (tokens), and tier resolution. Functions: `parseModelId()` (strips all `[1m]`/`[1M]`/`[200k]` suffixes), `getContextLimit()`, `getModelPrice()`, `calculateCost()`. GLM tiers depend on context/output sizes; MiniMax tiers depend on context size.
- **[src/core/model-resolve.ts](src/core/model-resolve.ts)** — Resolves the real provider model ID when cc-switch routing is active. When `model.id` starts with `claude-`, reads `ANTHROPIC_DEFAULT_{TIER}_MODEL_NAME` from `~/.claude/settings.json` to find the actual model name (e.g., `glm-5.1`). Non-claude model IDs pass through unchanged.
- **[src/core/cost.ts](src/core/cost.ts)** — Thin wrapper around `pricing.ts` that exposes `computeSessionCost()` for the main loop.
- **[src/core/renderer.ts](src/core/renderer.ts)** — Pure function `renderStatusline()` that takes a `RenderInput` and returns `string[]` (one per output line). Produces up to 5 lines: model + git + context bar, quotas/tokens + cost, balance, tools, agents, todos. Bars use `renderBar()` with █/░ characters and ANSI color escapes.
- **[src/core/config.ts](src/core/config.ts)** — Loads `~/.claude/plugins/multi-hud/config.json`, deep-merges with defaults using recursive `Object.assign`. All config keys are optional — missing values fall through to `defaultConfig`. The config directory is auto-created on startup if missing.
- **[src/core/git.ts](src/core/git.ts)** — Shells out to `git` (rev-parse, rev-list, status --porcelain). Accepts `exec` param for testability. Silent failure returns empty state.
- **[src/core/engine.ts](src/core/engine.ts)** — Engine class with provider lifecycle management, setInterval polling, and TTL cache. GLM and Kimi/MiniMax are pollable (quota APIs), DeepSeek/Kimi have balance APIs. Not yet wired into `index.ts`.
- **[src/core/cache.ts](src/core/cache.ts)** — Simple `Map<string, {value, expiresAt}>` TTL cache. Entries expire silently on `get()`. Used by the engine.
- **[src/core/credits.ts](src/core/credits.ts)** — MiMo credit pricing lookup and computation. Reads `src/info/mimo2credits.json` for per-model credit rates and plan limits. Exports `getMimoCreditPrice()`, `getMimoPlanLimit()`, `computeMimoCredits()`.
- **[src/core/state.ts](src/core/state.ts)** — MiMo credit state persistence. Manages `mimo-state.json` in the config directory for cross-invocation cumulative tracking. Handles session dedup (by `session_id`), 30-day period rollover, and plan-based percentage calculation.
- **[src/core/transcript.ts](src/core/transcript.ts)** — Parses Claude Code JSONL transcript events (`tool_start`, `tool_done`, `agent_start`, `agent_done`, `todo_add`, `todo_done`) into structured `{tools, agents, todos}` state. Only running agents are included in output. Not yet wired into `index.ts`.

### Provider adapter pattern

All providers extend `BaseProvider` ([src/providers/base.ts](src/providers/base.ts)) which provides `fetchJson<T>(url, init?, overrideBaseUrl?)` — a thin wrapper around `fetch()` that adds `Authorization: Bearer <apiKey>` and the provider's `baseUrl` prefix. The `overrideBaseUrl` parameter lets providers call endpoints on a different domain (used by Kimi's Coding Plan quota API). Callers can override the `Authorization` header by passing it in `init.headers` — this is used by GLM which sends the raw API key without the `Bearer` prefix. Each concrete provider implements:

- `name` — provider identifier string
- `getQuotas()` → `QuotaWindow[] | null` (quota windows with used/limit/percentage) — GLM, Kimi, and MiniMax implement this
- `getBalance()` → `BalanceInfo | null` — DeepSeek and Kimi implement this
- `validateConfig()` → `Promise<boolean>` — returns `true` if `apiKey` is set (overridden from base)

Kimi has two API surfaces: the Moonshot pay-per-token API (`baseUrl`) for balance, and the Coding Plan API (`codingPlanBaseUrl`, defaults to `https://api.kimi.com`) for quotas. GLM and MiniMax use `region` config (`'cn'` or `'intl'`) to select between CN and international endpoints: GLM defaults to `https://open.bigmodel.cn` (CN) and `https://api.z.ai` (intl); MiniMax defaults to `https://api.minimaxi.com` (CN) and `https://api.minimax.io` (intl). GLM sends its API key without the `Bearer` prefix, unlike other providers.

MiMo has no public quota API. Instead, credit consumption is computed locally from token usage data (provided by Claude Code on stdin) against pricing tables in `src/info/mimo2credits.json`. Cumulative monthly consumption is persisted across plugin invocations in `~/.claude/plugins/multi-hud/mimo-state.json`, with session deduplication by `session_id` and 30-day period auto-rollover. The `plan` config field (`'lite' | 'standard' | 'pro' | 'max'`) determines the monthly credit limit. Users can calibrate by deleting or editing the state file.

Errors in API calls are caught and return `null` — the main loop stores error strings which the renderer displays on the second status line.

### Type system

All shared types live in [src/types/index.ts](src/types/index.ts) (domain types) and [src/types/statusline.ts](src/types/statusline.ts) (Claude Code event schemas). Key types: `MultiHudConfig` (full config shape with nested `providers`, `display`, `animations`), `ProviderAdapter` (the interface each provider implements), `MimoProviderConfig` (extends `ProviderConfig` with `plan` field for credit tracking), `Theme` (colors/icons/bars/layout), `TokenUsage`, `QuotaWindow`, `BalanceInfo`. The `StatuslineEvent` type mirrors what Claude Code sends on stdin; `ProviderConfig` holds `apiKey`, optional `baseUrl`, optional `codingPlanBaseUrl` (for Kimi's separate Coding Plan API), and optional `region` (for GLM and MiniMax CN/intl endpoint selection).

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

24 test files, all vitest with `environment: 'node'`, `globals: true`, and `pool: 'forks'`. Tests mirror `src/` structure under `tests/`. Provider tests use `fetch` mocking. Config tests verify deep merge behavior. Compiler tests verify hex spec parsing and derivation math. Renderer tests verify output shape (including sessionCredits rendering). Credit/state tests use temp directories for file persistence. Git tests pass a mock `exec` function. Model-resolve tests use temp directories for settings.json. Each provider has its own test file.
