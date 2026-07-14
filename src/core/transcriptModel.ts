import fs from 'fs';

/**
 * Read the model that actually answered from a Claude Code transcript JSONL.
 *
 * Each assistant turn is a line like `{"type":"assistant","isSidechain":false,
 * "message":{"model":"...", ...}, ...}`. We want the *last main-thread* assistant model —
 * skipping subagent turns (`isSidechain === true`) — because that is what the router/proxy
 * reports for the current conversation.
 *
 * Best-effort: any failure (missing/unreadable file, no assistant model) returns null so the
 * caller falls back to the requested id.
 */

/** Read at most this many bytes from the end of the transcript so cost stays flat as sessions grow. */
const TAIL_BYTES = 256 * 1024;

export function readLatestModel(transcriptPath: string): string | null {
  try {
    const { size } = fs.statSync(transcriptPath);
    const start = Math.max(0, size - TAIL_BYTES);
    const fd = fs.openSync(transcriptPath, 'r');
    let buf: Buffer;
    try {
      const length = size - start;
      buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, start);
    } finally {
      fs.closeSync(fd);
    }

    const lines = buf.toString('utf-8').split('\n');
    // Scan backward for the most recent complete main-thread assistant entry.
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      let entry: unknown;
      try {
        entry = JSON.parse(line);
      } catch {
        continue; // partial first line from the tail window, or a non-JSON line
      }
      const model = assistantModel(entry);
      if (model) return model;
    }
    return null;
  } catch {
    return null;
  }
}

function assistantModel(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as { type?: unknown; isSidechain?: unknown; message?: unknown };
  if (e.type !== 'assistant') return null;
  if (e.isSidechain === true) return null;
  const message = e.message as { model?: unknown } | undefined;
  const model = message?.model;
  return typeof model === 'string' && model.length > 0 ? model : null;
}
