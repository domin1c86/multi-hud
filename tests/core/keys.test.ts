import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadApiKeys, mergeApiKeys } from '../../src/core/keys.js';
import { defaultConfig } from '../../src/core/config.js';

const tmp: string[] = [];
function writeKeys(content: string): string {
  const file = path.join(os.tmpdir(), `multi-hud-keys-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, content);
  tmp.push(file);
  return file;
}
afterEach(() => {
  while (tmp.length) {
    try {
      fs.unlinkSync(tmp.pop()!);
    } catch {
      // ignore
    }
  }
});

describe('loadApiKeys', () => {
  it('returns {} for a missing file', () => {
    expect(loadApiKeys(path.join(os.tmpdir(), 'nope-multi-hud-keys.json'))).toEqual({});
  });

  it('returns {} for malformed JSON', () => {
    expect(loadApiKeys(writeKeys('{ not json'))).toEqual({});
  });

  it('reads a provider→key map and ignores empty/non-string values', () => {
    const file = writeKeys(JSON.stringify({ glm: 'k-glm', kimi: '', deepseek: 'k-ds', minimax: 123 }));
    expect(loadApiKeys(file)).toEqual({ glm: 'k-glm', deepseek: 'k-ds' });
  });

  it('returns {} for a JSON array', () => {
    expect(loadApiKeys(writeKeys('["glm","k"]'))).toEqual({});
  });
});

describe('mergeApiKeys', () => {
  it('overlays keys onto the matching provider apiKey', () => {
    const config = structuredClone(defaultConfig);
    mergeApiKeys(config, { glm: 'k-glm', deepseek: 'k-ds' });
    expect(config.providers.glm.apiKey).toBe('k-glm');
    expect(config.providers.deepseek.apiKey).toBe('k-ds');
  });

  it('keeps a legacy config apiKey when the keys file omits that provider', () => {
    const config = structuredClone(defaultConfig);
    config.providers.kimi.apiKey = 'legacy-kimi';
    mergeApiKeys(config, { glm: 'k-glm' });
    expect(config.providers.kimi.apiKey).toBe('legacy-kimi');
    expect(config.providers.glm.apiKey).toBe('k-glm');
  });

  it('ignores unknown providers', () => {
    const config = structuredClone(defaultConfig);
    expect(() => mergeApiKeys(config, { bogus: 'x' })).not.toThrow();
  });
});
