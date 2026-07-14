# multi-hud

[简体中文](README_zh.md) | English

A Claude Code statusline plugin that displays real-time usage monitoring and cost estimation for Chinese LLM providers: DeepSeek, Kimi, GLM, MiniMax, and MiMo.

Inspired by the community plugin [claude-hud](https://github.com/asilvadesigns/claude-hud), adapted for third-party provider billing models (API pay-per-token vs Coding Plan time-windowed quotas).

## Features

- **Context usage** — Real-time context window fill (progress bar + percentage)
- **Provider quota monitoring** — Multi-window quota bars: 5h / 24h / 7d / 30d (Coding Plan mode)
- **Token usage & cost** — Input/output token counts with automatic cost calculation (¥) using built-in pricing tables
- **Multi-provider** — DeepSeek, Kimi (Moonshot), GLM (Zhipu), MiniMax, MiMo; auto-detected from model ID prefix
- **Routing-aware** — Detects a routing proxy (`ANTHROPIC_BASE_URL`) and surfaces the real backend model (from the transcript) with a `⇄` marker, so provider/cost reflect what actually answered
- **Clean model names** — Displays `[provider] name` (e.g. `[claude] opus-4.8`, `[zai] glm-5.1`), with the company resolved from the model prefix
- **Git status** — Current branch and dirty state indicator
- **Themes** — Built-in default, minimal, powerline, and neon themes; customizable via hex color specs
- **Animations** — Pulse (brightness) and laser (sweep) bar animations, `always` or `on-change`; opt-in via `animations.enabled`

## Install

Install as a Claude Code plugin, then run the setup command:

```
/plugin marketplace add domin1c86/multi-hud
/plugin install multi-hud
/multi-hud:setup          # registers the statusline in your settings.json
/multi-hud:configure      # (optional) toggle display elements, theme, animations
```

Fully restart Claude Code after `/multi-hud:setup`. See **[INSTALL.md](INSTALL.md)** for the
manual `settings.json` method (dev/local use), provider API-key setup, and troubleshooting.

## Configuration

Config file: `~/.claude/plugins/multi-hud/config.json`. Created automatically on first run. All fields are optional — missing values fall through to defaults.

```json
{
  "providerOverride": null,
  "pollIntervalMs": 30000,
  "theme": "default",
  "customTheme": {},
  "animations": {
    "enabled": false,
    "defaultMode": "on-change",
    "defaultType": "pulse",
    "triggerThreshold": 5
  },
  "display": {
    "showGitStatus": true,
    "showTools": true,
    "showAgents": true,
    "showTodos": true,
    "showCost": true,
    "showRouting": true,
    "prettyModelName": true,
    "showProvider": true
  },
  "providers": {
    "deepseek": { "baseUrl": null },
    "kimi": { "baseUrl": null },
    "glm": { "baseUrl": null },
    "minimax": { "baseUrl": null },
    "mimo": { "baseUrl": null }
  }
}
```

API **keys are not stored here** — they live in a separate `keys.json` (see [Provider API
keys](#provider-api-keys) below). `config.json` holds only non-secret settings.

### Config reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `providerOverride` | `string \| null` | `null` | Force a specific provider, bypassing auto-detection |
| `pollIntervalMs` | `number` | `30000` | Provider API polling interval (ms) |
| `theme` | `string` | `"default"` | Theme: `default`, `minimal`, `powerline`, or `neon` |
| `customTheme` | `object` | `{}` | Theme overrides (see below) |
| `display.*` | `boolean` | `true` | Toggle each status line |
| `display.showRouting` | `boolean` | `true` | Show the `⇄` marker + actual backend model when a routing proxy is detected |
| `display.prettyModelName` | `boolean` | `true` | Format the model as `[provider] name` (e.g. `[claude] opus-4.8`); `false` shows the raw id |
| `display.showProvider` | `boolean` | `true` | Show the `[provider]` label before the model name (`[zai] glm-5.1` vs `glm-5.1`) |

### Provider API support

| Provider | Quota polling | Balance polling |
|----------|---------------|-----------------|
| DeepSeek | — | Yes |
| Kimi | Yes (coding plan) | Yes (pay-as-you-go) |
| GLM | Yes | — |
| MiniMax | — | — |
| MiMo | — | — |

Only providers with a configured API key (in `keys.json`, see below) are queried. API failures
fail silently.

Kimi has two access modes, distinguished by the key you put in `keys.json`: a **Kimi Code
subscription** key (`sk-kimi-…`) shows the coding-plan quota windows (5h / weekly), while a
**pay-as-you-go** key (`sk-…`) shows the prepaid balance instead. The quota endpoint is the
unofficial one the Kimi CLI uses, so it may change.

## Themes

### Built-in themes

| Theme | Description |
|-------|-------------|
| `default` | Colorful with provider emoji icons |
| `minimal` | No color, pure ASCII characters |
| `powerline` | Powerline-style, letter abbreviations + high-contrast backgrounds |
| `neon` | Neon highlights, wider bars + vivid true color |

### Custom themes

```json
{
  "theme": "default",
  "customTheme": {
    "colors": {
      "model": "#e91e63",
      "cost": "#4caf50"
    },
    "icons": {
      "deepseek": "🚀",
      "warning": "⚡"
    },
    "layout": {
      "compact": false,
      "showLabels": true,
      "barWidth": 12
    }
  }
}
```

Color spec syntax: `#RRGGBB` (foreground), `[#RRGGBB]` (background), `b#RRGGBB[#RRGGBB]` (bold foreground + background). When only foreground is specified, background is derived at 2/3 brightness (and vice versa at 1.5x).

## Animations

Bars (context + quotas) can animate. Animations are **off by default** — enable them under
`animations` in `config.json`:

```json
{
  "animations": {
    "enabled": true,
    "defaultMode": "on-change",
    "defaultType": "pulse",
    "triggerThreshold": 5
  }
}
```

- `defaultType` — `pulse` (fill brightness rises and falls) or `laser` (a highlight sweeps
  across the filled portion). A theme can override the effect per bar.
- `defaultMode` — `always` (animate continuously) or `on-change` (animate for ~1.5s after a
  bar's value jumps by at least `triggerThreshold` percentage points).
- `triggerThreshold` — the jump size (in %) that triggers `on-change`.

Because a status line is a stateless subprocess that Claude Code re-runs on each refresh,
each invocation renders a single frame chosen by wall-clock time — animations advance as
fast as Claude Code updates the status line, not on a fixed frame rate.

## Provider API keys

Keys (for balance/quota) live in **`~/.claude/plugins/multi-hud/keys.json`** — a file **separate**
from `config.json`:

```json
{
  "deepseek": "sk-...",
  "kimi": "sk-kimi-...",
  "glm": "...",
  "minimax": "...",
  "mimo": ""
}
```

> **These keys are for the plugin only.** Only the status-line runtime process reads `keys.json`
> to query provider APIs. **Claude Code (and any AI agent) never reads it**, and the plugin never
> prints or logs a key. Run `/multi-hud:configure` → **Edit provider API keys** to open the file
> in your editor (the command creates it empty and launches it; it never reads the contents).

Where to get a key:

- **DeepSeek** — [platform.deepseek.com](https://platform.deepseek.com/)
- **Kimi (Moonshot)** — [platform.moonshot.cn](https://platform.moonshot.cn/) (pay-as-you-go) /
  Kimi Code console (`sk-kimi-…` subscription)
- **GLM (Zhipu)** — [open.bigmodel.cn](https://open.bigmodel.cn/)
- **MiniMax** — [platform.minimaxi.com](https://platform.minimaxi.com/)

## Development

```bash
npm install        # Install dependencies
npm run dev        # Watch mode (tsc --watch)
npm test           # Run all tests
npm run test:watch # Watch mode (vitest)
npm run build      # Build
npm run lint       # ESLint
npm run format     # Prettier
```

## License

MIT
