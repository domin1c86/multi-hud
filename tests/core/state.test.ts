import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadMimoState, saveMimoState, updateMimoCredits, MIMO_STATE_FILE } from '../../src/core/state.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mimo-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadMimoState', () => {
  it('returns default state when file does not exist', () => {
    const state = loadMimoState(tmpDir);
    expect(state.creditsUsed).toBe(0);
    expect(state.periodStart).toBeGreaterThan(0);
    expect(Object.keys(state.sessions)).toHaveLength(0);
  });

  it('loads state from disk', () => {
    const state = { creditsUsed: 500, periodStart: 1000, sessions: { s1: 100 } };
    saveMimoState(tmpDir, state);
    const loaded = loadMimoState(tmpDir);
    expect(loaded.creditsUsed).toBe(500);
    expect(loaded.periodStart).toBe(1000);
    expect(loaded.sessions.s1).toBe(100);
  });

  it('returns default state for corrupt JSON', () => {
    const filePath = path.join(tmpDir, MIMO_STATE_FILE);
    fs.writeFileSync(filePath, 'not json', 'utf-8');
    const state = loadMimoState(tmpDir);
    expect(state.creditsUsed).toBe(0);
  });
});

describe('saveMimoState', () => {
  it('persists state to disk', () => {
    const state = { creditsUsed: 123.45, periodStart: 9999, sessions: { abc: 50 } };
    saveMimoState(tmpDir, state);
    const raw = fs.readFileSync(path.join(tmpDir, MIMO_STATE_FILE), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.creditsUsed).toBe(123.45);
    expect(parsed.sessions.abc).toBe(50);
  });
});

describe('updateMimoCredits', () => {
  it('computes credits for a new session', () => {
    const result = updateMimoCredits(tmpDir, 'session-1', 'mimo-v2.5', {
      inputUncached: 1_000_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    expect(result).not.toBeNull();
    expect(result!.sessionCredits).toBeCloseTo(100, 2);
    expect(result!.totalCredits).toBeCloseTo(100, 2);
    expect(result!.monthlyPercentage).toBeGreaterThan(0);
  });

  it('updates credits for an existing session (dedup)', () => {
    // First call with session-1
    updateMimoCredits(tmpDir, 'session-1', 'mimo-v2.5', {
      inputUncached: 500_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    // Second call with same session-1 but more tokens (growing session)
    const result = updateMimoCredits(tmpDir, 'session-1', 'mimo-v2.5', {
      inputUncached: 1_000_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    // Should replace, not double-count
    expect(result!.sessionCredits).toBeCloseTo(100, 2);
    expect(result!.totalCredits).toBeCloseTo(100, 2);
  });

  it('accumulates credits across different sessions', () => {
    updateMimoCredits(tmpDir, 'session-1', 'mimo-v2.5', {
      inputUncached: 500_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    const result = updateMimoCredits(tmpDir, 'session-2', 'mimo-v2.5', {
      inputUncached: 500_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    // 50 credits from session-1 + 50 from session-2 = 100 total
    expect(result!.totalCredits).toBeCloseTo(100, 2);
    expect(result!.sessionCredits).toBeCloseTo(50, 2);
  });

  it('resets credits when period is >30 days old', () => {
    // Create an old state
    const oldState = {
      creditsUsed: 5000,
      periodStart: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
      sessions: { old: 5000 },
    };
    saveMimoState(tmpDir, oldState);

    const result = updateMimoCredits(tmpDir, 'new-session', 'mimo-v2.5', {
      inputUncached: 500_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    // Old credits should be reset, only new session's credits count
    expect(result!.totalCredits).toBeCloseTo(50, 2);
    expect(result!.monthlyPercentage).toBeGreaterThan(0);
  });

  it('returns null for unknown model', () => {
    const result = updateMimoCredits(tmpDir, 'session-1', 'unknown-model', {
      inputUncached: 1000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    expect(result).toBeNull();
  });

  it('computes monthlyPercentage correctly', () => {
    // standard plan = 11,000M credits = 11,000,000,000 raw credits
    const result = updateMimoCredits(tmpDir, 'session-1', 'mimo-v2.5-pro', {
      inputUncached: 1_000_000,
      cacheRead: 0,
      cacheCreation: 0,
      output: 0,
    }, 'standard');

    // 300 credits consumed out of 11,000,000,000 plan limit
    // percentage = 300 / 11,000,000,000 * 100 ≈ 0.0000027%
    expect(result!.monthlyPercentage).toBeGreaterThan(0);
    expect(result!.monthlyPercentage).toBeLessThan(1);
  });
});