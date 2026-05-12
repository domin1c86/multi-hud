import { describe, it, expect } from 'vitest';
import { renderStatusline, renderBar } from '../../src/core/renderer.js';
import { QuotaWindow } from '../../src/types/index.js';
import { resolveTheme } from '../../src/themes/index.js';

const theme = resolveTheme('default', {});

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

  it('renders bar with filled and empty characters', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 50,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[0]).toContain('█');
    expect(lines[0]).toContain('░');
  });

  it('renders ANSI colors', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 50,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[0]).toMatch(/\x1b\[/);
  });

  it('renders currency symbol for cost', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      cost: 0.123,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: true },
    });
    expect(lines[1]).toContain('¥');
  });

  it('renders up and down arrows for token usage', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 },
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('↑');
    expect(lines[1]).toContain('↓');
  });

  it('renders error message with warning icon', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      errorMessage: 'Something went wrong',
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('Something went wrong');
    expect(lines[1]).toContain(theme.icons.warning);
  });

  it('renders git status when enabled', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      theme,
      gitStatus: { branch: 'main', dirty: true, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: true, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[0]).toContain('main');
    expect(lines[0]).toContain(theme.icons.gitBranch);
    expect(lines[0]).toContain(theme.icons.gitDirty);
  });

  it('renders tools when enabled', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      tools: [{ name: 'read_file', status: 'active' }],
      displayConfig: { showGitStatus: false, showTools: true, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('read_file');
    expect(lines[1]).toContain('◐');
  });

  it('renders agents when enabled', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      agents: [{ name: 'Agent1', model: 'gpt-4', description: 'doing work' }],
      displayConfig: { showGitStatus: false, showTools: false, showAgents: true, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('Agent1');
    expect(lines[1]).toContain('doing work');
  });

  it('renders todos when enabled', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-chat',
      contextPercentage: 30,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      todos: [{ text: 'Fix bug', done: false }],
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: true, showCost: false },
    });
    expect(lines[1]).toContain('Fix bug');
    expect(lines[1]).toContain('(0/1)');
  });
});

describe('renderBar', () => {
  it('renders all empty at 0%', () => {
    const bar = renderBar(0, '\x1b[32m', '\x1b[90m', 10);
    expect(bar).toBe('\x1b[32m\x1b[90m░░░░░░░░░░\x1b[0m');
  });

  it('renders all filled at 100%', () => {
    const bar = renderBar(100, '\x1b[32m', '\x1b[90m', 10);
    expect(bar).toBe('\x1b[32m██████████\x1b[90m\x1b[0m');
  });

  it('does not throw at 100% due to rounding', () => {
    expect(() => renderBar(100, '\x1b[32m', '\x1b[90m', 7)).not.toThrow();
  });
});
