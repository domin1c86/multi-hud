import fs from 'fs';
import path from 'path';
import { computeMimoCredits, getMimoPlanLimit } from './credits.js';

export const MIMO_STATE_FILE = 'mimo-state.json';

export interface MimoState {
  creditsUsed: number;
  periodStart: number;
  sessions: Record<string, number>;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function defaultState(): MimoState {
  return {
    creditsUsed: 0,
    periodStart: Date.now(),
    sessions: {},
  };
}

export function loadMimoState(configDir: string): MimoState {
  const filePath = path.join(configDir, MIMO_STATE_FILE);
  try {
    if (!fs.existsSync(filePath)) {
      return defaultState();
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.creditsUsed === 'number' &&
      typeof parsed.periodStart === 'number' &&
      typeof parsed.sessions === 'object' &&
      parsed.sessions !== null
    ) {
      return parsed as MimoState;
    }
    return defaultState();
  } catch {
    return defaultState();
  }
}

export function saveMimoState(configDir: string, state: MimoState): void {
  const filePath = path.join(configDir, MIMO_STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

export interface MimoCreditResult {
  sessionCredits: number;
  totalCredits: number;
  monthlyPercentage: number;
}

export function updateMimoCredits(
  configDir: string,
  sessionId: string,
  modelId: string,
  tokens: { inputUncached: number; cacheRead: number; cacheCreation: number; output: number },
  plan: string,
): MimoCreditResult | null {
  const credits = computeMimoCredits(modelId, tokens);
  if (credits === null) return null;

  const state = loadMimoState(configDir);

  // Period rollover: reset if >30 days old
  const now = Date.now();
  if (now - state.periodStart > THIRTY_DAYS_MS) {
    state.creditsUsed = 0;
    state.sessions = {};
    state.periodStart = now;
  }

  // Session dedup: if session already recorded, subtract old amount before adding new
  const prevSessionCredits = state.sessions[sessionId] ?? 0;
  state.creditsUsed = state.creditsUsed - prevSessionCredits + credits;
  state.sessions[sessionId] = credits;

  saveMimoState(configDir, state);

  const planLimit = getMimoPlanLimit(plan);
  const monthlyPercentage = Math.min(100, (state.creditsUsed / planLimit) * 100);

  return {
    sessionCredits: credits,
    totalCredits: state.creditsUsed,
    monthlyPercentage,
  };
}