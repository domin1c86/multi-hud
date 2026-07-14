/**
 * Human-friendly model-name formatting: `claude-opus-4-8` → `[claude] opus-4.8`.
 *
 * The bracket is the *company* that makes the model, resolved from the model-prefix identifier
 * via `PREFIX_TO_PROVIDER` — NOT the id's first segment (e.g. `glm` is a prefix owned by `zai`).
 * The model name begins at that prefix identifier; any company branding before it (like the
 * leading `claude-`) is stripped.
 *
 * `PREFIX_TO_PROVIDER` is transcribed from `src/info/model2providers.json` (the reference spec,
 * which is provider→prefix); update both together when providers or prefixes change. This is a
 * display concern only — it is independent of `detectProvider()` in `index.ts`, which selects the
 * API adapter and stays keyed by adapter name.
 */
const PREFIX_TO_PROVIDER: Record<string, string> = {
  mimo: 'xiaomi',
  kimi: 'moonshot',
  minimax: 'minimax',
  deepseek: 'deepseek',
  glm: 'zai',
  hunyuan: 'tencent',
  qwen: 'ali',
  gemini: 'google',
  gpt: 'openai',
  opus: 'claude',
  sonnet: 'claude',
  haiku: 'claude',
  fable: 'claude',
};

const CONTEXT_SUFFIX = /(\[\d+[km]\])$/i;
const ALL_DIGITS = /^\d+$/;
const DATE_SEGMENT = /^\d{6,}$/;

/**
 * Format a raw model id for display as `[provider] name`.
 * Returns just the version-formatted name (no bracket) when the prefix is not in the map, and
 * `''` for empty input.
 */
export function formatModelId(rawModelId: string): string {
  if (!rawModelId) return '';

  const suffixMatch = rawModelId.match(CONTEXT_SUFFIX);
  const suffix = suffixMatch ? suffixMatch[1] : '';
  const base = suffix ? rawModelId.slice(0, -suffix.length) : rawModelId;

  const segments = base.split('-');

  // Find the first segment that is a known model-prefix identifier; the model name starts there.
  let startIdx = -1;
  let provider: string | null = null;
  for (let i = 0; i < segments.length; i++) {
    const mapped = PREFIX_TO_PROVIDER[segments[i].toLowerCase()];
    if (mapped) {
      startIdx = i;
      provider = mapped;
      break;
    }
  }

  const nameSegments = startIdx >= 0 ? segments.slice(startIdx) : segments;
  const name = formatName(nameSegments);

  const label = provider ? `[${provider}] ${name}` : name;
  return label + suffix;
}

/** Join name segments: `.` between two all-digit segments, `-` otherwise; drop a trailing date. */
function formatName(segments: string[]): string {
  const segs = [...segments];
  // Drop a trailing date/build stamp (e.g. `20251001`), as long as a name remains.
  if (segs.length > 1 && DATE_SEGMENT.test(segs[segs.length - 1])) {
    segs.pop();
  }

  let out = segs[0] ?? '';
  for (let i = 1; i < segs.length; i++) {
    const sep = ALL_DIGITS.test(segs[i - 1]) && ALL_DIGITS.test(segs[i]) ? '.' : '-';
    out += sep + segs[i];
  }
  return out;
}
