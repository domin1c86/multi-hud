import { Theme, QuotaWindow, TokenUsage, BalanceInfo } from '../types/index.js';
import { GitStatus } from './git.js';
import { ToolCall, AgentStatus, TodoItem } from './transcript.js';
import { animateBar } from '../animations/index.js';
import { formatModelId } from './modelName.js';

export interface RenderInput {
  modelId: string;
  contextPercentage: number;
  contextSize?: number;
  tokenUsage?: TokenUsage | null;
  quotas?: QuotaWindow[] | null;
  balance?: BalanceInfo | null;
  cost?: number | null;
  theme: Theme;
  gitStatus: GitStatus;
  tools?: ToolCall[];
  agents?: AgentStatus[];
  todos?: TodoItem[];
  displayConfig: {
    showGitStatus: boolean;
    showTools: boolean;
    showAgents: boolean;
    showTodos: boolean;
    showCost: boolean;
    showRouting?: boolean;
    prettyModelName?: boolean;
    showProvider?: boolean;
  };
  /** Routing state — draws a `⇄` marker after the model when a routing layer is active. */
  routing?: { active: boolean };
  errorMessage?: string;
  /** Current wall-clock time (ms) driving animation frames. Omit for static output. */
  now?: number;
  /** Bars that should animate this frame, keyed by bar key (`context`, `quota5h`, …). */
  animations?: Record<string, { type: 'pulse' | 'laser' }>;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(tokens);
}

export function renderStatusline(input: RenderInput): string[] {
  const lines: string[] = [];
  const t = input.theme;
  const reset = '\x1b[0m';

  // Line 1: Model + Git + Context
  const modelText =
    input.displayConfig.prettyModelName === false
      ? input.modelId
      : formatModelId(input.modelId, input.displayConfig.showProvider !== false);
  let line1 = `${t.colors.model}${modelText}${reset}`;
  if (input.routing?.active && input.displayConfig.showRouting !== false) {
    line1 += ` ${t.colors.dim}⇄${reset}`;
  }
  if (input.displayConfig.showGitStatus && input.gitStatus.branch) {
    const dirty = input.gitStatus.dirty ? `${t.colors.gitDirty}${t.icons.gitDirty}${reset}` : '';
    line1 += ` │ ${t.colors.gitBranch}${t.icons.gitBranch} ${input.gitStatus.branch}${dirty}${reset}`;
  }
  const ctxBar = barFor(
    input,
    'context',
    input.contextPercentage,
    t.bars.context.fgColor,
    t.bars.context.bgColor,
    t.layout.barWidth,
  );
  const ctxLabel = t.layout.showLabels ? 'Context ' : '';
  const ctxSizeStr = input.contextSize ? ` ${formatTokens(input.contextSize)}` : '';
  line1 += ` │ ${t.colors.label}${ctxLabel}${reset}${ctxBar} ${Math.round(input.contextPercentage)}%${ctxSizeStr}`;
  lines.push(line1);

  // Line 2: Balance / Quotas / Tokens+Cost or Error
  if (input.errorMessage) {
    lines.push(`${t.colors.warning}${t.icons.warning} ${input.errorMessage}${reset}`);
  } else if (input.quotas && input.quotas.length > 0) {
    const parts = input.quotas.map((q) => {
      const barStyle = t.bars[`quota${q.name}` as keyof Theme['bars']];
      const bar = barStyle
        ? barFor(input, `quota${q.name}`, q.usedPercentage, barStyle.fgColor, barStyle.bgColor, t.layout.barWidth)
        : '';
      return `${t.colors.label}${q.name}${reset} ${bar} ${Math.round(q.usedPercentage)}%`;
    });
    lines.push(parts.join(' │ '));
  } else if (input.tokenUsage) {
    const inputStr = formatTokens(input.tokenUsage.inputTokens);
    const outputStr = formatTokens(input.tokenUsage.outputTokens);
    const totalStr = formatTokens(input.tokenUsage.totalTokens);
    let line2 = `${t.colors.label}Tokens${reset} ${inputStr} ↑ / ${outputStr} ↓ │ Total ${totalStr}`;
    if (input.displayConfig.showCost && input.cost !== null && input.cost !== undefined) {
      line2 += ` │ ${t.colors.cost}¥${input.cost.toFixed(3)}${reset}`;
    }
    lines.push(line2);
  }

  // Line 2.5: Balance (shown when available, indepenently from quotas/tokens)
  if (input.balance) {
    lines.push(`${t.colors.label}Balance${reset} ${input.balance.currency}${input.balance.available.toFixed(2)}`);
  }

  // Line 3: Tools
  if (input.displayConfig.showTools && input.tools && input.tools.length > 0) {
    const toolStr = input.tools
      .map((tool) => {
        const icon = tool.status === 'active' ? '◐' : '✓';
        const color = tool.status === 'active' ? t.colors.toolActive : t.colors.toolDone;
        return `${color}${icon} ${tool.name}${reset}`;
      })
      .join(' │ ');
    lines.push(toolStr);
  }

  // Line 4: Agents
  if (input.displayConfig.showAgents && input.agents && input.agents.length > 0) {
    const agentStr = input.agents
      .map((agent) => {
        return `${t.colors.agentRunning}◐ ${agent.name} [${agent.model}]: ${agent.description}${reset}`;
      })
      .join(' │ ');
    lines.push(agentStr);
  }

  // Line 5: Todos
  if (input.displayConfig.showTodos && input.todos && input.todos.length > 0) {
    const total = input.todos.length;
    const done = input.todos.filter((td) => td.done).length;
    const todoStr = input.todos
      .slice(0, 3)
      .map((td) => {
        const icon = td.done ? '✓' : '▸';
        const color = td.done ? t.colors.todoDone : t.colors.todoPending;
        return `${color}${icon} ${td.text}${reset}`;
      })
      .join(' │ ');
    lines.push(`${todoStr} ${t.colors.dim}(${done}/${total})${reset}`);
  }

  return lines;
}

/** Render a bar animated if it's in the resolved `animations` map and `now` is set, else static. */
function barFor(input: RenderInput, barKey: string, pct: number, fg: string, bg: string, width: number): string {
  const anim = input.animations?.[barKey];
  if (anim && input.now !== undefined) {
    return animateBar(pct, fg, bg, width, anim.type, input.now);
  }
  return renderBar(pct, fg, bg, width);
}

export function renderBar(percentage: number, fg: string, bg: string, width: number): string {
  const filled = Math.min(width, Math.round((percentage / 100) * width));
  const empty = width - filled;
  return `${fg}${'█'.repeat(filled)}${bg}${'░'.repeat(empty)}\x1b[0m`;
}
