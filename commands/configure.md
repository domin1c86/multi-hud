---
description: Toggle multi-hud display elements, theme, and animations
allowed-tools: Bash, Read, AskUserQuestion
---

# Configure multi-hud

Guided editor for `~/.claude/plugins/multi-hud/config.json` (the file the status line reads
and deep-merges over its defaults). This only writes the keys the user changes; every other
key — including advanced ones like `customTheme` and stored provider settings — is preserved.
Changes take effect on the **next status-line refresh**; no restart needed.

## Step 1: Load the current config

```bash
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/multi-hud/config.json"
if [ -f "$CFG" ]; then
  echo "--- current config ($CFG) ---"; cat "$CFG"
else
  echo "NO_CONFIG_YET ($CFG) — will be created from your choices"
fi
```

Read the values so you can pre-select current states in the questions below.

## Step 2: Ask what to change

Use **AskUserQuestion**. Ask only about what the user wants to touch — skip a group if
they're not changing it.

1. **Display elements** (header "Display", multiSelect: true) — "Which elements should the
   HUD show?" Options, each mapping to a `display.*` boolean:
   - "Git branch + dirty state" → `display.showGitStatus`
   - "Active tools" → `display.showTools`
   - "Running agents" → `display.showAgents`
   - "Todos" → `display.showTodos`
   - "Token cost (¥)" → `display.showCost`
   - "Routing marker (⇄)" → `display.showRouting` (shows the actual backend model + a ⇄ mark
     when a routing proxy is detected via `ANTHROPIC_BASE_URL`)
   - "Pretty model name" → `display.prettyModelName` (shows `[provider] name`, e.g.
     `[claude] opus-4.8`; unselected shows the raw model id)
   Selected ⇒ `true`, unselected ⇒ `false`.

2. **Theme** (header "Theme", single) — "Pick a theme:" → `theme`:
   - "default" (color + provider emoji) / "minimal" (ASCII, no color) /
     "powerline" (high-contrast) / "neon" (vivid truecolor).

3. **Animations** (header "Animation", single) — "Animate the bars?" → the `animations` block:
   - "Off" → `{ enabled: false }`
   - "Pulse (always)" → `{ enabled: true, defaultType: "pulse", defaultMode: "always" }`
   - "Laser sweep (always)" → `{ enabled: true, defaultType: "laser", defaultMode: "always" }`
   - "On change only" → `{ enabled: true, defaultMode: "on-change" }` (keep the existing
     `defaultType`, or `pulse` if unset)

4. **Provider API key** (optional) — only if the user wants balance/quota. Ask which provider
   (`deepseek`/`kimi`/`glm`/`minimax`/`mimo`) and the key, mapping to
   `providers.<name>.apiKey`. Optionally set `providerOverride` to force a provider.

## Step 3: Merge and write

Deep-merge the chosen values into the config, preserving unknown keys, then write with a
trailing newline. Pass the changes as a JSON object in `$PATCH`.

```bash
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/multi-hud/config.json"
mkdir -p "$(dirname "$CFG")"
PATCH='<JSON object of only the changed keys, e.g. {"display":{"showCost":false},"theme":"neon"}>'
node -e '
  const fs = require("fs");
  const [file, patchStr] = [process.argv[1], process.argv[2]];
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const merge = (t, s) => {
    for (const k of Object.keys(s)) t[k] = isObj(s[k]) && isObj(t[k]) ? merge(t[k], s[k]) : s[k];
    return t;
  };
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  merge(cfg, JSON.parse(patchStr));
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
  console.log("UPDATED " + file);
' "$CFG" "$PATCH"
```

Confirm it prints `UPDATED …`, then show the user the final config and remind them the change
applies on the next status-line refresh.
