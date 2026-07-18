---
description: Toggle multi-hud display elements, theme, and animations; open the API-keys file
allowed-tools: Bash, AskUserQuestion
---

# Configure multi-hud

Guided editor for `~/.claude/plugins/multi-hud/config.json` (the file the status line reads and
deep-merges over its defaults). This only writes the keys the user changes; every other key —
including advanced ones like `customTheme` — is preserved. Changes take effect on the **next
status-line refresh**; no restart needed.

> **SECURITY — provider API keys.** API keys live in a **separate** file,
> `~/.claude/plugins/multi-hud/keys.json`, which **only the plugin runtime reads**. You (Claude)
> must **NEVER** `cat`, read, open-for-reading, echo, or otherwise load the contents of
> `keys.json` or any key — not to "verify", not to show the user, not ever. In the API-keys step
> below you may only (a) create the file from an empty template **if it does not already exist**
> and (b) launch it in the user's default app. Nothing in this command should ever place a key in
> the conversation.

## Step 1: Show the current config (redacted)

Print `config.json` with any provider `apiKey` masked, so a legacy key can never leak into
context. Do **not** `cat` the file directly.

```bash
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/multi-hud/config.json"
if [ -f "$CFG" ]; then
  node -e '
    const fs = require("fs");
    let c = {};
    try { c = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { console.log("UNREADABLE"); process.exit(0); }
    if (c.providers) for (const p of Object.values(c.providers)) if (p && p.apiKey) p.apiKey = "***";
    console.log(JSON.stringify(c, null, 2));
  ' "$CFG"
else
  echo "NO_CONFIG_YET ($CFG) — will be created from your choices"
fi
```

Use the printed values to pre-select current states in the questions below.

## Step 2: Ask what to change

Use **AskUserQuestion**. Ask only about the groups the user wants to touch — skip the rest.

1. **Display elements** (header "Display", multiSelect: true) — "Which elements should the HUD
   show?" Each maps to a `display.*` boolean (selected ⇒ `true`, unselected ⇒ `false`):
   - "Git branch + dirty state" → `display.showGitStatus`
   - "Active tools" → `display.showTools`
   - "Running agents" → `display.showAgents`
   - "Model provider label" → `display.showProvider` (`[zai] glm-5.1` vs `glm-5.1`)
   - "Routing marker (⇄)" → `display.showRouting` (actual backend model + ⇄ when a routing proxy
     is detected via `ANTHROPIC_BASE_URL`)

2. **Todos** (header "Todos", single) — "Show the todo list?" → `display.showTodos` (`true`/`false`).

3. **Token cost** (header "Cost", single) — "Show the token cost (¥) line?" → `display.showCost`
   (`true`/`false`). This is computed locally and needs **no** API key.

4. **Theme** (header "Theme", single) — "Pick a theme:" → `theme`:
   `default` / `minimal` / `powerline` / `neon`.

5. **Animations** (header "Animation", single) — "Animate the bars?" → the `animations` block:
   - "Off" → `{ enabled: false }`
   - "Pulse (always)" → `{ enabled: true, defaultType: "pulse", defaultMode: "always" }`
   - "Laser sweep (always)" → `{ enabled: true, defaultType: "laser", defaultMode: "always" }`
   - "On change only" → `{ enabled: true, defaultMode: "on-change" }` (keep the existing
     `defaultType`, or `pulse` if unset)

6. **Provider API keys** (header "API keys", single) — "Edit your provider API keys (for
   balance/quota)?" → "Open the keys file" / "Skip". If the user picks open, do **Step 4** and
   nothing else for this group (no key ever enters the conversation).

## Step 3: Merge and write the non-secret settings

Deep-merge only the display/theme/animation choices, preserving unknown keys, then write with a
trailing newline. **Never** put an API key in `$PATCH`.

```bash
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/multi-hud/config.json"
mkdir -p "$(dirname "$CFG")"
PATCH='<JSON of only the changed keys, e.g. {"display":{"showCost":false,"showProvider":true},"theme":"neon"}>'
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

Confirm it prints `UPDATED …`, then remind the user the change applies on the next refresh.

## Step 4: Open the API-keys file (only if requested)

Create `keys.json` from an **empty** template **only if it does not exist** (never overwrite —
that would wipe saved keys — and never read it), lock it down, then open it in the default app.

```bash
KEYS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/multi-hud/keys.json"
mkdir -p "$(dirname "$KEYS")"
if [ ! -f "$KEYS" ]; then
  printf '%s\n' '{' '  "deepseek": "",' '  "kimi": "",' '  "glm": "",' '  "minimax": "",' '  "mimo": ""' '}' > "$KEYS"
  chmod 600 "$KEYS" 2>/dev/null || true
  echo "CREATED $KEYS"
else
  echo "EXISTS $KEYS"
fi
# Open in the user's default app; try several launchers, fall back to printing the path.
if   command -v xdg-open   >/dev/null 2>&1; then xdg-open "$KEYS" >/dev/null 2>&1 &
elif command -v open       >/dev/null 2>&1; then open "$KEYS" >/dev/null 2>&1 &
elif command -v wslview    >/dev/null 2>&1; then wslview "$KEYS" >/dev/null 2>&1 &
elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$(wslpath -w "$KEYS" 2>/dev/null || echo "$KEYS")" >/dev/null 2>&1 &
elif command -v start      >/dev/null 2>&1; then start "" "$KEYS" >/dev/null 2>&1 &
else echo "OPEN_MANUALLY"; fi
echo "KEYS_PATH=$KEYS"
```

Tell the user:
- Paste your provider keys into `keys.json` (format `"<provider>": "<key>"`) and save. For Kimi,
  a `sk-kimi-…` coding-plan key shows subscription quotas; a pay-as-you-go `sk-…` key shows balance.
- **Claude Code never reads this file** — the keys are used only by the plugin's status-line
  process to query provider APIs, and are never printed.
- If nothing opened (`OPEN_MANUALLY`), open the path shown in `KEYS_PATH` yourself.
