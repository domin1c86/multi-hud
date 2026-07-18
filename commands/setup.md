---
description: Configure multi-hud as your Claude Code statusline
allowed-tools: Bash, Read, Edit, AskUserQuestion
---

# Set up multi-hud

Register multi-hud's `dist/index.js` as the user's status line by writing a `statusLine`
entry into their `settings.json`. A plugin cannot register the primary status line itself,
so this command does it. All JSON edits use a Node serializer so one code path works on
macOS, Linux, and Windows.

Work through the steps in order. Stop and report if a step fails.

## Step 1: Verify Node and locate the built entry point

The status line runs `node <path>/dist/index.js`. Node must be on PATH.

```bash
command -v node >/dev/null 2>&1 && node --version || echo "NODE_MISSING"
```

If this prints `NODE_MISSING`, tell the user to install Node.js 18+ and stop.

Find the newest installed copy of the plugin and resolve the absolute entry point. The
`statusLine` command runs outside plugin context, so `${CLAUDE_PLUGIN_ROOT}` is NOT expanded
there — an absolute path is required.

```bash
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
# Newest version dir across any marketplace cache, else a dev checkout via CLAUDE_PLUGIN_ROOT.
PLUGIN_DIR=$(ls -d "$CLAUDE_DIR/plugins/cache"/*/multi-hud/*/ 2>/dev/null | sort -V | tail -1)
PLUGIN_DIR="${PLUGIN_DIR:-${CLAUDE_PLUGIN_ROOT:-}}"
ENTRY="${PLUGIN_DIR%/}/dist/index.js"
if [ -f "$ENTRY" ]; then echo "ENTRY=$ENTRY"; else echo "ENTRY_MISSING (looked at: $ENTRY)"; fi
```

- If it prints `ENTRY=…`, keep that absolute path for Step 3.
- If it prints `ENTRY_MISSING`, the plugin shipped without a build. Tell the user to run
  `npm install && npm run build` in the plugin directory, then re-run this command. Stop.

## Step 2: Back up settings.json and inspect any existing statusLine

```bash
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_DIR/settings.json"
mkdir -p "$CLAUDE_DIR"
if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.bak.$(date +%Y%m%d%H%M%S)"
  node -e "try{const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log('EXISTING='+((j.statusLine&&j.statusLine.command)||'none'))}catch(e){console.log('EXISTING=none (unreadable)')}" "$SETTINGS"
else
  echo 'EXISTING=none (no settings.json yet)'
fi
```

If `EXISTING=` shows a command other than `none` **and** it is not already a multi-hud
command, use **AskUserQuestion** before overwriting:

- Question: "An existing status line is configured: `<command preview>`. Replace it with
  multi-hud?"
- Options: "Replace it (a timestamped backup was saved)" / "Keep my current status line
  (cancel setup)".

If the user chooses to keep theirs, stop and report — the backup is already in place.

## Step 3: Write the statusLine entry

Merge `statusLine` into `settings.json`, preserving every other key. Substitute the absolute
`ENTRY` path from Step 1.

```bash
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_DIR/settings.json"
ENTRY="<absolute ENTRY path from Step 1>"
node -e '
  const fs = require("fs");
  const [settings, entry] = [process.argv[1], process.argv[2]];
  let json = {};
  try { json = JSON.parse(fs.readFileSync(settings, "utf8")); } catch {}
  json.statusLine = { type: "command", command: `node "${entry}"`, padding: 0 };
  fs.writeFileSync(settings, JSON.stringify(json, null, 2) + "\n");
  console.log("WROTE statusLine -> " + json.statusLine.command);
' "$SETTINGS" "$ENTRY"
```

Confirm it prints `WROTE statusLine -> node "…/dist/index.js"`.

## Step 4: Offer feature configuration

The HUD works immediately with sensible defaults. Tell the user they can:

- Run `/multi-hud:configure` to toggle display elements, pick a theme, and enable animations.
- Add a provider API key (for balance/quota): run `/multi-hud:configure` and choose **Edit
  provider API keys** — it opens `~/.claude/plugins/multi-hud/keys.json` in your editor. Keys live
  only in that file; the plugin runtime reads them, and Claude Code never does.

## Step 5: Tell the user what to do next

- **Fully quit and restart Claude Code** — status-line changes only take effect in a fresh
  session.
- After a plugin **update**, re-run `/multi-hud:setup`: the install path (and thus the
  absolute command) changes with each version.
- To revert: restore the most recent `settings.json.bak.*` created in Step 2.
