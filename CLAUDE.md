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

ESM project (`"type": "module"`, `module: NodeNext`): intra-`src` imports must use explicit `.js` extensions even though the source is `.ts` (e.g. `import { getGitStatus } from './core/git.js'`). Only `src/**` is compiled by `tsc` (`tests` are excluded from `tsconfig.json` and run directly by vitest), so `npm run build` will not type-check tests — `npm test` is what exercises them.

## Architecture

This is a **Claude Code statusline plugin** — Claude Code launches it as a subprocess, streams `statusline` and `transcript` JSON events on stdin, and the plugin writes ANSI-escaped status lines to stdout. There is no server, no HTTP listener, no persistent process outside Claude Code.

### Data flow

```
Claude Code stdin ──→ index.ts (reads single JSON object)
                        ├── routing.ts + transcriptModel.ts (resolve actual model behind a proxy)
                        ├── direct provider API calls (quotas/balance)
                        ├── cost.ts → pricing.ts (model pricing + context limits)
                        ├── git.ts (rev-parse, rev-list, status)
                        └── renderer.ts → stdout (ANSI lines)
```

**Routing detection:** when `ANTHROPIC_BASE_URL` (inherited from Claude Code's env) points at a non-Anthropic host, requests are going through a routing proxy (claude-code-router, LiteLLM, …), so `evt.model.id` is only the requested *alias*. In that case [src/core/transcriptModel.ts](src/core/transcriptModel.ts) reads the last main-thread assistant `message.model` from `evt.transcript_path` (the ground-truth model that answered) and [src/core/routing.ts](src/core/routing.ts) substitutes it as the active model for provider/cost/context/display — with a `⇄` marker on line 1. Not routed → behaviour is unchanged (no transcript read, requested id used verbatim). `providerOverride` still wins.

Note: [src/core/engine.ts](src/core/engine.ts) (provider lifecycle/polling manager) and [src/core/transcript.ts](src/core/transcript.ts) (JSONL transcript parser) exist but are not yet wired into main() — provider calls and transcript state are handled inline for now.

### Key modules

- **[src/index.ts](src/index.ts)** — Entry point. Reads a single JSON object from stdin (Claude Code sends one per invocation), resolves the active model (routing-aware, see above), detects the provider from its prefix, calls provider adapters directly for quotas/balance, computes cost, gets git status, and renders.
- **[src/core/routing.ts](src/core/routing.ts)** — Pure routing helpers. `isRoutedBaseUrl()` (host ≠ `api.anthropic.com`) and `resolveActiveModel()` (prefer the transcript model only when routed; else the requested id verbatim — regression-free).
- **[src/core/transcriptModel.ts](src/core/transcriptModel.ts)** — `readLatestModel()`: bounded tail read (~256KB) of the transcript JSONL, scanning backward for the last non-sidechain assistant `message.model`. Best-effort → `null` on any failure.
- **[src/core/modelName.ts](src/core/modelName.ts)** — `formatModelId()`: display-only formatting `claude-opus-4-8` → `[claude] opus-4.8`. The bracket is the *company*, resolved from the model prefix via `PREFIX_TO_PROVIDER` — a TS constant **transcribed from [src/info/model2providers.json](src/info/model2providers.json)** (provider→prefix reference; update both together). Independent of `detectProvider()` (which picks the API adapter). The model name begins at the prefix identifier (company branding like `claude-` is stripped); version dashes between digits become dots and a trailing date stamp is dropped.
- **[src/core/pricing.ts](src/core/pricing.ts)** — Built-in model pricing (CNY per 1M tokens), context window limits (tokens), and tier resolution. Functions: `parseModelId()` (handles `[1m]` suffix), `getContextLimit()`, `getModelPrice()`, `calculateCost()`. GLM tiers depend on context/output sizes; MiniMax tiers depend on context size. **The data is hardcoded as TS constants here** — the `src/info/*.json` files (`model2price`, `model2context`, `model2addons`) are the reference spec these constants were transcribed from; they are **not** imported at runtime. When adding a model or changing a price, update both the JSON reference and the `pricing.ts` constants.
- **[src/core/cost.ts](src/core/cost.ts)** — Thin wrapper around `pricing.ts` that exposes `computeSessionCost()` for the main loop.
- **[src/core/renderer.ts](src/core/renderer.ts)** — Pure function `renderStatusline()` that takes a `RenderInput` and returns `string[]` (one per output line). Produces up to 5 lines: model + git + context bar, quotas/tokens + cost, balance, tools, agents, todos.
- **[src/core/config.ts](src/core/config.ts)** — Loads `~/.claude/plugins/multi-hud/config.json`, deep-merges with defaults. All config keys are optional — missing values fall through to `defaultConfig`.
- **[src/core/git.ts](src/core/git.ts)** — Shells out to `git` (rev-parse, rev-list, status --porcelain). Accepts `exec` param for testability. Silent failure returns empty state.
- **[src/core/engine.ts](src/core/engine.ts)** — Engine class with provider lifecycle management, setInterval polling, and TTL cache. Only GLM is pollable (quota API), only DeepSeek/Kimi have balance APIs. Not yet wired into `index.ts`.
- **[src/core/cache.ts](src/core/cache.ts)** — Simple `Map<string, {value, expiresAt}>` TTL cache. Entries expire silently on `get()`. Used by the engine.
- **[src/core/transcript.ts](src/core/transcript.ts)** — Parses Claude Code JSONL transcript events (`tool_start`, `tool_done`, `agent_start`, `agent_done`, `todo_add`, `todo_done`) into structured `{tools, agents, todos}` state. Only running agents are included in output. Not yet wired into `index.ts`.

### Provider adapter pattern

All providers extend `BaseProvider` ([src/providers/base.ts](src/providers/base.ts)) which provides `fetchJson<T>(url, init?, baseOverride?)` — a thin wrapper around `fetch()` that adds `Authorization: Bearer <apiKey>` and prefixes `baseOverride ?? config.baseUrl ?? defaultBaseUrl` (the override lets one provider hit a second host — Kimi's quota endpoint). Each concrete provider (DeepSeek, Kimi, GLM, MiniMax, MiMo) implements:

- `name` — provider identifier string
- `getQuotas()` → `QuotaWindow[] | null` (5h/24h/7d/30d windows with used/limit/percentage) — GLM (`/api/monitor/usage/quota/limit`) and Kimi implement this. Kimi's is the **coding-plan subscription** usage from the unofficial endpoint the Kimi CLI uses (`GET https://api.kimi.com/coding/v1/usages`, fallback `/usage`); it is gated on a `sk-kimi-…` key and parses defensively (both the `limits[]` and `data[]`/`model_name:"all"` shapes → `5h`/`7d`).
- `getBalance()` → `BalanceInfo | null` — only DeepSeek and Kimi implement this (Kimi's is the pay-as-you-go prepaid balance). A Kimi session shows quotas OR balance depending on which key type is configured.
- `validateConfig()` → `Promise<boolean>` — returns `true` if `apiKey` is set (overridden from base)

Errors in API calls are caught and return `null` — the main loop stores error strings which the renderer displays on the second status line.

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

A status line is a **stateless subprocess** — Claude Code re-runs it per refresh, with no animation loop — so each invocation renders one frame chosen by wall-clock time. [src/animations/frame.ts](src/animations/frame.ts) `frameIndex(now, fps, count)` is the pure time→frame selector. [src/animations/pulse.ts](src/animations/pulse.ts) `createPulseFrames()` returns brightness-scaled copies of a compiled truecolor fg (a triangle wave); [src/animations/laser.ts](src/animations/laser.ts) `createLaserFrames()` builds per-position sweep frames. [src/animations/color.ts](src/animations/color.ts) parses/re-emits the RGB inside a compiled `\x1b[38;2;r;g;bm` escape.

[src/animations/index.ts](src/animations/index.ts) ties it together: `animateBar()` renders one animated bar for a given time, and `resolveBarAnimation()` applies the precedence rule (master switch off → nothing; a bar's own `animation` if it opts in; else the global `animations` defaults). All impure work (deciding which bars animate this frame, `on-change` state) lives in `index.ts`'s exported `resolveAnimations()`, which reads/writes a per-session state file via [src/core/animationState.ts](src/core/animationState.ts) (`resolveOnChange()` is the pure change-detection step; state lives in `os.tmpdir()`). The renderer stays pure: it takes a resolved `animations` map + `now` on `RenderInput` and calls `animateBar` only for bars in that map — omitting them (as all existing callers do) yields the original static bars.

### Testing

27 test files, all vitest with `environment: 'node'` and `globals: true`. Tests mirror `src/` structure under `tests/`. Provider tests use `fetch` mocking. Config tests verify deep merge behavior. Compiler tests verify hex spec parsing and derivation math. Renderer tests verify output shape (incl. the static-vs-animated bar path and the `⇄` routing marker). Git tests pass a mock `exec` function. Animation tests cover frame wraparound, pulse brightness, laser movement, the resolution rule, and `on-change` detection. Routing tests cover `isRoutedBaseUrl`/`resolveActiveModel` and the `readLatestModel` transcript reader (temp JSONL fixtures). Each provider has its own test file.
