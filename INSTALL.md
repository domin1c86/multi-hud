# Installing multi-hud in Claude Code

`multi-hud` is a Claude Code **status line** — a small program that Claude Code runs as a
subprocess, feeding it session data on stdin and printing the HUD you see at the bottom of
the terminal.

There are two ways to install it: the **plugin** flow (recommended) or the **manual**
`settings.json` flow (for local development or if you'd rather not use the plugin system).

---

## Option A — Install as a plugin (recommended)

```
/plugin marketplace add domin1c86/multi-hud
/plugin install multi-hud
```

Then wire the status line and (optionally) pick your features:

```
/multi-hud:setup          # writes the statusLine entry into your settings.json (with a backup)
/multi-hud:configure      # toggle git/tools/agents/todos/cost, theme, animations, API keys
```

`/multi-hud:setup` detects the installed plugin path and registers
`node "<path>/dist/index.js"` as your status line. **Fully quit and restart Claude Code**
afterward. Re-run `/multi-hud:setup` after a plugin update, since the install path changes
with each version.

> The plugin ships a prebuilt `dist/` and has no runtime dependencies, so there's nothing to
> build — `node` (18+) on your `PATH` is all that's required.

To configure features later, just run `/multi-hud:configure` again, or edit
`~/.claude/plugins/multi-hud/config.json` directly (see [Configuration](README.md#configuration)).

---

## Option B — Manual install (dev / local)

Use this if you cloned the repo and want to run it directly without the plugin system.

### 1. Prerequisites

- **Node.js** (v18+). The status line is launched with `node`, so Node must be on your
  `PATH`. Check with `node --version`.
- **Claude Code** installed and working.

### 2. Build

From the project directory:

```bash
npm install
npm run build
```

This compiles the TypeScript to `dist/`. The entry point Claude Code runs is
`dist/index.js`. Note its **absolute path** — you'll need it in the next step:

```bash
# prints the absolute path to paste into settings.json
node -e "console.log(require('path').resolve('dist/index.js'))"
```

### 3. Register the status line

Claude Code status lines are configured in your settings file, **not** by copying files
into the plugins directory. Add a `statusLine` block to `~/.claude/settings.json` (create
the file if it doesn't exist):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/multi-hud/dist/index.js",
    "padding": 0
  }
}
```

- Replace the path with the absolute path from step 2.
- `type` must be `"command"`; `command` is the shell command Claude Code runs each refresh.
- On **Windows**, use forward slashes or escaped backslashes in JSON, e.g.
  `"node C:/Users/you/multi-hud/dist/index.js"`.
- `padding` is optional (extra horizontal spacing; defaults to `0`).

You can also scope it to a single project by putting the same block in that project's
`.claude/settings.json` instead of your home settings.

> This is set **manually** — multi-hud is a prebuilt program, so the `/statusline` command
> (which generates a fresh script) is not used to install it.

Restart Claude Code (or open a new session). The HUD should appear at the bottom.

---

The remaining sections apply to **both** install methods.

## Provider API keys (optional)

Out of the box the HUD renders everything Claude Code already provides — model, context
bar, cost, git, and rate-limit quota bars (Pro/Max only) — with **no network calls**.

To also show a third-party provider's **account balance or plan quota**, give multi-hud an
API key. Plugin users can run `/multi-hud:configure` and enter it there; otherwise edit
`~/.claude/plugins/multi-hud/config.json` (created on first run) and set the matching
provider block:

```json
{
  "providers": {
    "deepseek": { "apiKey": "sk-...", "baseUrl": null },
    "kimi":     { "apiKey": "sk-...", "baseUrl": null },
    "glm":      { "apiKey": "...",    "baseUrl": null }
  }
}
```

> **This key is separate from the one that routes Claude Code to the provider.** To *use* a
> third-party provider in Claude Code you typically set `ANTHROPIC_BASE_URL` and
> `ANTHROPIC_AUTH_TOKEN` in your environment. multi-hud does **not** see those — it reads
> the key from its own `config.json` above. They can be the same value, but you must set it
> in both places. Leave `baseUrl` as `null` to use each provider's default host.

What each provider exposes:

| Provider | Balance | Quota (time-windowed) | Notes |
|----------|:-------:|:---------------------:|-------|
| DeepSeek | ✅ | — | `GET api.deepseek.com/user/balance` |
| Kimi (Moonshot) | ✅ | — | `GET api.moonshot.cn/v1/users/me/balance` |
| GLM (Zhipu) | — | ✅ | Coding-plan quota API |
| MiniMax | — | — | No status API yet |
| MiMo | — | — | No status API yet |

Get keys at: [DeepSeek](https://platform.deepseek.com/) ·
[Kimi](https://platform.moonshot.cn/) · [GLM](https://open.bigmodel.cn/) ·
[MiniMax](https://platform.minimaxi.com/). API failures fail silently — the rest of the HUD
still renders.

## Verify

Smoke-test the entry point the same way Claude Code invokes it (feed it a sample event on
stdin). From a repo checkout:

```bash
node dist/index.js < tests/fixtures/mock-statusline.json
```

You should see rendered, ANSI-colored status lines (model, context bar, tokens, cost). If
that works, the HUD will work inside Claude Code once the status line is registered.

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| No status line at all | `settings.json` missing/invalid, or `command` path wrong. Confirm the JSON parses and the absolute path to `dist/index.js` is correct. |
| No status line after a plugin update | The install path changes each version — re-run `/multi-hud:setup` to rewrite the absolute path. |
| `node: command not found` in the status line | Node isn't on Claude Code's `PATH`. Use an absolute node path, e.g. `/usr/local/bin/node ...`. |
| Status line is blank/errors | Rebuild with `npm run build`; re-run the Verify smoke test to see the raw output. |
| No balance or quota shown | `apiKey` not set in `config.json`, or that provider has no such API (see the table). |
| No quota bars | Time-windowed rate-limit bars come from Claude Code only for Claude.ai Pro/Max, or from GLM's provider API. DeepSeek/Kimi have no quota source (balance only). |

For configuration (themes, display toggles, custom colors), see the
[Configuration](README.md#configuration) section of the README.
