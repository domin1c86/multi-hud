import { describe, it, expect } from 'vitest';
import { renderStatusline } from '../../src/core/renderer.js';
import { Theme, QuotaWindow, TokenUsage } from '../../src/types/index.js';
import { builtInThemes } from '../../src/themes/built-ins.js';
import { GitStatus } from '../../src/core/git.js';
import { ToolCall, AgentStatus, TodoItem } from '../../src/core/transcript.js';

const theme = builtInThemes.default;

describe('renderStatusline', () => {
  it('renders context bar', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 50,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[0]).toContain('deepseek-chat');
    expect(lines[0]).toContain('50%');
  });

  it('renders API mode with tokens', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      cost: 0.002,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: true },
    });
    expect(lines[1]).toContain('1k');
    expect(lines[1]).toContain('0.002');
  });

  it('renders Coding Plan mode with quotas', () => {
    const quotas: QuotaWindow[] = [
      { name: '5h', used: 10, limit: 100, usedPercentage: 10 },
      { name: '24h', used: 20, limit: 200, usedPercentage: 10 },
    ];
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      quotas,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('5h');
    expect(lines[1]).toContain('10%');
  });
});
