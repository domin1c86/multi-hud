import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/core/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('loadConfig', () => {
  const tmpDir = path.join(os.tmpdir(), 'multi-hud-test-' + Date.now());
  const configPath = path.join(tmpDir, 'config.json');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns default config when file does not exist', () => {
    const config = loadConfig(configPath);
    expect(config.theme).toBe('default');
    expect(config.pollIntervalMs).toBe(30000);
  });

  it('merges user config over defaults', () => {
    fs.writeFileSync(configPath, JSON.stringify({ theme: 'neon', pollIntervalMs: 10000 }));
    const config = loadConfig(configPath);
    expect(config.theme).toBe('neon');
    expect(config.pollIntervalMs).toBe(10000);
    expect(config.display.showGitStatus).toBe(true);
  });

  it('falls back to defaults on invalid JSON instead of throwing', () => {
    fs.writeFileSync(configPath, 'not json');
    let config!: ReturnType<typeof loadConfig>;
    expect(() => (config = loadConfig(configPath))).not.toThrow();
    expect(config.theme).toBe('default');
    expect(config.pollIntervalMs).toBe(30000);
  });
});
