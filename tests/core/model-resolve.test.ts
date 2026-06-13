import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { resolveModelIdFromSettings } from '../../src/core/model-resolve.js';

let tmpDir: string;
let settingsPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-resolve-test-'));
  settingsPath = path.join(tmpDir, 'settings.json');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('resolveModelIdFromSettings', () => {
  it('returns non-claude model IDs unchanged', () => {
    expect(resolveModelIdFromSettings('glm-5.1', settingsPath)).toBe('glm-5.1');
    expect(resolveModelIdFromSettings('deepseek-v4-flash', settingsPath)).toBe('deepseek-v4-flash');
    expect(resolveModelIdFromSettings('mimo-v2.5-pro', settingsPath)).toBe('mimo-v2.5-pro');
  });

  it('resolves claude-sonnet model ID from settings.json', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      env: {
        ANTHROPIC_DEFAULT_SONNET_MODEL_NAME: 'glm-5.1',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-20250514',
      },
    }));
    expect(resolveModelIdFromSettings('claude-sonnet-4-20250514', settingsPath)).toBe('glm-5.1');
  });

  it('resolves claude-opus model ID from settings.json', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      env: {
        ANTHROPIC_DEFAULT_OPUS_MODEL_NAME: 'mimo-v2.5-pro',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-6',
      },
    }));
    expect(resolveModelIdFromSettings('claude-opus-4-6', settingsPath)).toBe('mimo-v2.5-pro');
  });

  it('resolves claude-haiku model ID from settings.json', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      env: {
        ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME: 'deepseek-v4-flash',
      },
    }));
    expect(resolveModelIdFromSettings('claude-haiku-4-5-20251001', settingsPath)).toBe('deepseek-v4-flash');
  });

  it('returns original claude model ID when settings.json is missing', () => {
    const missingPath = path.join(tmpDir, 'nonexistent.json');
    expect(resolveModelIdFromSettings('claude-sonnet-4-6', missingPath)).toBe('claude-sonnet-4-6');
  });

  it('returns original claude model ID when env block is missing', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({}));
    expect(resolveModelIdFromSettings('claude-sonnet-4-6', settingsPath)).toBe('claude-sonnet-4-6');
  });

  it('returns original claude model ID when MODEL_NAME key is missing', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      env: {
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
      },
    }));
    expect(resolveModelIdFromSettings('claude-sonnet-4-6', settingsPath)).toBe('claude-sonnet-4-6');
  });

  it('returns original claude model ID when MODEL_NAME is empty string', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({
      env: {
        ANTHROPIC_DEFAULT_SONNET_MODEL_NAME: '',
      },
    }));
    expect(resolveModelIdFromSettings('claude-sonnet-4-6', settingsPath)).toBe('claude-sonnet-4-6');
  });

  it('returns original model ID for invalid JSON', () => {
    fs.writeFileSync(settingsPath, 'not json');
    expect(resolveModelIdFromSettings('claude-sonnet-4-6', settingsPath)).toBe('claude-sonnet-4-6');
  });
});