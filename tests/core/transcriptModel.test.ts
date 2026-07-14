import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readLatestModel } from '../../src/core/transcriptModel.js';

const tmpFiles: string[] = [];

function writeTranscript(lines: object[]): string {
  const file = path.join(os.tmpdir(), `multi-hud-transcript-${Math.random().toString(36).slice(2)}.jsonl`);
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  tmpFiles.push(file);
  return file;
}

afterEach(() => {
  while (tmpFiles.length) {
    try {
      fs.unlinkSync(tmpFiles.pop()!);
    } catch {
      // ignore
    }
  }
});

describe('readLatestModel', () => {
  it('returns the last main-thread assistant model', () => {
    const file = writeTranscript([
      { type: 'user', message: { role: 'user', content: 'hi' } },
      { type: 'assistant', isSidechain: false, message: { model: 'glm-4.7', role: 'assistant' } },
      { type: 'user', message: { role: 'user', content: 'again' } },
      { type: 'assistant', isSidechain: false, message: { model: 'deepseek-v4-pro', role: 'assistant' } },
    ]);
    expect(readLatestModel(file)).toBe('deepseek-v4-pro');
  });

  it('skips subagent (isSidechain) assistant turns', () => {
    const file = writeTranscript([
      { type: 'assistant', isSidechain: false, message: { model: 'glm-4.7' } },
      { type: 'assistant', isSidechain: true, message: { model: 'subagent-model' } },
    ]);
    expect(readLatestModel(file)).toBe('glm-4.7');
  });

  it('treats a missing isSidechain as main-thread', () => {
    const file = writeTranscript([{ type: 'assistant', message: { model: 'kimi-k2.6' } }]);
    expect(readLatestModel(file)).toBe('kimi-k2.6');
  });

  it('returns null when there is no assistant model', () => {
    const file = writeTranscript([{ type: 'user', message: { content: 'hi' } }]);
    expect(readLatestModel(file)).toBeNull();
  });

  it('returns null for a missing file', () => {
    expect(readLatestModel(path.join(os.tmpdir(), 'does-not-exist-multi-hud.jsonl'))).toBeNull();
  });

  it('ignores malformed JSON lines', () => {
    const file = path.join(os.tmpdir(), `multi-hud-transcript-${Math.random().toString(36).slice(2)}.jsonl`);
    fs.writeFileSync(
      file,
      '{ not json\n' + JSON.stringify({ type: 'assistant', message: { model: 'minimax-m3' } }) + '\n',
    );
    tmpFiles.push(file);
    expect(readLatestModel(file)).toBe('minimax-m3');
  });
});
