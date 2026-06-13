# multi-hud

[简体中文](README_zh.md) | English

A Claude Code statusline plugin that displays real-time usage monitoring and cost estimation for Chinese LLM providers: DeepSeek, Kimi, GLM, MiniMax, and MiMo.

Inspired by the community plugin [claude-hud](https://github.com/asilvadesigns/claude-hud), adapted for third-party provider billing models (API pay-per-token vs Coding Plan time-windowed quotas).

## Features

- **Context usage** — Real-time context window fill (progress bar + percentage)
- **Provider quota monitoring** — Multi-window quota bars: 5h / 24h / 7d / 30d (Coding Plan mode)
- **Token usage & cost** — Input/output token counts with automatic cost calculation (¥) using built-in pricing tables
- **Multi-provider** — DeepSeek, Kimi (Moonshot), GLM (Zhipu), MiniMax, MiMo; auto-detected from model ID prefix
- **Git status** — Current branch and dirty state indicator
- **Themes** — Built-in default, minimal, powerline, and neon themes; customizable via hex color specs
- **Animations** — Pulse and laser bar animations (framework ready, renderer integration pending)

## Install

```bash
npm install
npm run build
```

### Claude Code integration

```bash
# macOS / Linux
ln -s $(pwd)/dist/index.js ~/.claude/plugins/multi-hud/index.js

# Windows (PowerShell, admin)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\plugins\multi-hud\index.js" -Target "$(pwd)\dist\index.js"
```

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
    "showCost": true
  },
  "providers": {
    "deepseek": { "apiKey": "sk-xxx", "baseUrl": null },
    "kimi": { "apiKey": "sk-xxx", "baseUrl": null },
    "glm": { "apiKey": "sk-xxx", "baseUrl": null },
    "minimax": { "apiKey": "sk-xxx", "baseUrl": null },
    "mimo": { "apiKey": "", "baseUrl": null }
  }
}
```

### Config reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `providerOverride` | `string \| null` | `null` | Force a specific provider, bypassing auto-detection |
| `pollIntervalMs` | `number` | `30000` | Provider API polling interval (ms) |
| `theme` | `string` | `"default"` | Theme: `default`, `minimal`, `powerline`, or `neon` |
| `customTheme` | `object` | `{}` | Theme overrides (see below) |
| `display.*` | `boolean` | `true` | Toggle each status line |

### Provider API support

| Provider | Quota polling | Balance polling |
|----------|---------------|-----------------|
| DeepSeek | — | Yes |
| Kimi | — | Yes |
| GLM | Yes | — |
| MiniMax | — | — |
| MiMo | — | — |

Only providers with a configured API key are queried. API failures fail silently.

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

## Provider API keys

- **DeepSeek** — [platform.deepseek.com](https://platform.deepseek.com/)
- **Kimi (Moonshot)** — [platform.moonshot.cn](https://platform.moonshot.cn/)
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
