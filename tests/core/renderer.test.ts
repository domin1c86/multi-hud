import { describe, it, expect } from 'vitest';
import { renderStatusline, renderBar } from '../../src/core/renderer.js';
import { resolveTheme } from '../../src/themes/index.js';
import { TokenUsage, QuotaWindow, BalanceInfo } from '../../src/types/index.js';

const theme = resolveTheme('default', {});

describe('renderStatusline', () => {
  it('renders context bar', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-v4-flash',
      contextPercentage: 50,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[0]).toContain('deepseek-v4-flash');
    expect(lines[0]).toContain('50%');
  });

  it('renders context bar with size', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-v4-flash',
      contextPercentage: 50,
      contextSize: 200_000,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[0]).toContain('200k');
  });

  it('renders token usage with CNY cost', () => {
    const tokenUsage: TokenUsage = {
      inputTokens: 50000,
      outputTokens: 5000,
      totalTokens: 55000,
      cacheReadTokens: 30000,
      cacheCreationTokens: 5000,
    };
    const lines = renderStatusline({
      modelId: 'mimo-v2.5',
      contextPercentage: 30,
      tokenUsage,
      cost: 0.123,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: true },
    });
    expect(lines[1]).toContain('50k');
    expect(lines[1]).toContain('5k');
    expect(lines[1]).toContain('¥0.123');
  });

  it('renders Coding Plan mode with quotas', () => {
    const quotas: QuotaWindow[] = [
      { name: '5h', used: 10, limit: 100, usedPercentage: 10 },
      { name: '24h', used: 20, limit: 200, usedPercentage: 10 },
    ];
    const lines = renderStatusline({
      modelId: 'glm-4.7',
      contextPercentage: 30,
      quotas,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('5h');
    expect(lines[1]).toContain('10%');
  });

  it('renders balance line', () => {
    const balance: BalanceInfo = { provider: 'deepseek', available: 123.45, currency: '¥' };
    const lines = renderStatusline({
      modelId: 'deepseek-v4-flash',
      contextPercentage: 30,
      balance,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    const balanceLine = lines.find((l) => l.includes('Balance'));
    expect(balanceLine).toBeDefined();
    expect(balanceLine).toContain('¥123.45');
  });

  it('renders bar with filled and empty characters', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-v4-flash',
      contextPercentage: 50,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[0]).toContain('█');
    expect(lines[0]).toContain('░');
  });

  it('animates the context bar when it is in the animations map', () => {
    const base = {
      modelId: 'deepseek-v4-flash',
      contextPercentage: 50,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    } as const;
    const staticLine = renderStatusline({ ...base })[0];
    const animA = renderStatusline({ ...base, now: 0, animations: { context: { type: 'pulse' } } })[0];
    const animB = renderStatusline({ ...base, now: 375, animations: { context: { type: 'pulse' } } })[0];
    // Animated frames differ from each other (pulse advances)...
    expect(animA).not.toBe(animB);
    // ...and from the static render, but keep the same 50% label.
    expect(animA).not.toBe(staticLine);
    expect(animA).toContain('50%');
  });

  it('renders a static bar when animations is absent even if now is set', () => {
    const staticBar = renderBar(50, theme.bars.context.fgColor, theme.bars.context.bgColor, theme.layout.barWidth);
    const lines = renderStatusline({
      modelId: 'deepseek-v4-flash',
      contextPercentage: 50,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
      now: 12345,
    });
    expect(lines[0]).toContain(staticBar);
  });

  it('renders error message with warning icon', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-v4-flash',
      contextPercentage: 30,
      errorMessage: 'Something went wrong',
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('Something went wrong');
    expect(lines[1]).toContain(theme.icons.warning);
  });

  it('renders tools when enabled', () => {
    const lines = renderStatusline({
      modelId: 'deepseek-v4-flash',
      contextPercentage: 30,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      tools: [{ name: 'read_file', status: 'active' }],
      displayConfig: { showGitStatus: false, showTools: true, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('read_file');
    expect(lines[1]).toContain('◐');
  });

  it('renders large token counts with M suffix', () => {
    const tokenUsage: TokenUsage = {
      inputTokens: 1_500_000,
      outputTokens: 500_000,
      totalTokens: 2_000_000,
      cacheReadTokens: 800_000,
      cacheCreationTokens: 100_000,
    };
    const lines = renderStatusline({
      modelId: 'deepseek-v4-pro[1m]',
      contextPercentage: 60,
      tokenUsage,
      theme,
      gitStatus: { branch: '', dirty: false, ahead: 0, behind: 0 },
      displayConfig: { showGitStatus: false, showTools: false, showAgents: false, showTodos: false, showCost: false },
    });
    expect(lines[1]).toContain('1.5M');
    expect(lines[1]).toContain('500k');
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
