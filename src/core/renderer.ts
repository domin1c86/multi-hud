import { Theme, QuotaWindow, TokenUsage } from '../types/index.js';
import { GitStatus } from './git.js';
import { ToolCall, AgentStatus, TodoItem } from './transcript.js';

export interface RenderInput {
  modelId: string;
  contextPercentage: number;
  tokenUsage?: TokenUsage | null;
  quotas?: QuotaWindow[] | null;
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
  };
  errorMessage?: string;
}

export function renderStatusline(input: RenderInput): string[] {
  const lines: string[] = [];
  const t = input.theme;
  const reset = '\x1b[0m';

  // Line 1: Model + Git + Context
  let line1 = `${t.colors.model}${input.modelId}${reset}`;
  if (input.displayConfig.showGitStatus && input.gitStatus.branch) {
    const dirty = input.gitStatus.dirty ? `${t.colors.gitDirty}${t.icons.gitDirty}${reset}` : '';
    line1 += ` │ ${t.colors.gitBranch}${t.icons.gitBranch} ${input.gitStatus.branch}${dirty}${reset}`;
  }
  const ctxBar = renderBar(input.contextPercentage, t.bars.context.fgColor, t.bars.context.bgColor, t.layout.barWidth);
  const ctxLabel = t.layout.showLabels ? 'Context ' : '';
  line1 += ` │ ${t.colors.label}${ctxLabel}${reset}${ctxBar} ${Math.round(input.contextPercentage)}%`;
  lines.push(line1);

  // Line 2: Usage/Quota or Error
  if (input.errorMessage) {
    lines.push(`${t.colors.warning}${t.icons.warning} ${input.errorMessage}${reset}`);
  } else if (input.quotas && input.quotas.length > 0) {
    const parts = input.quotas.map((q) => {
      const barStyle = t.bars[`quota${q.name}` as keyof Theme['bars']];
      const bar = barStyle ? renderBar(q.usedPercentage, barStyle.fgColor, barStyle.bgColor, t.layout.barWidth) : '';
      return `${t.colors.label}${q.name}${reset} ${bar} ${q.usedPercentage}%`;
    });
    lines.push(parts.join(' │ '));
  } else if (input.tokenUsage) {
    const tokens = `${Math.round(input.tokenUsage.inputTokens / 100) / 10}k ↑ / ${Math.round(input.tokenUsage.outputTokens / 100) / 10}k ↓ │ Total ${Math.round(input.tokenUsage.totalTokens / 100) / 10}k`;
    let line2 = `${t.colors.label}Tokens ${reset}${tokens}`;
    if (input.displayConfig.showCost && input.cost !== null && input.cost !== undefined) {
      line2 += ` │ ${t.colors.cost}¥${input.cost.toFixed(3)}${reset}`;
    }
    lines.push(line2);
  }

  // Line 3: Tools
  if (input.displayConfig.showTools && input.tools && input.tools.length > 0) {
    const toolStr = input.tools.map((tool) => {
      const icon = tool.status === 'active' ? '◐' : '✓';
      const color = tool.status === 'active' ? t.colors.toolActive : t.colors.toolDone;
      return `${color}${icon} ${tool.name}${reset}`;
    }).join(' │ ');
    lines.push(toolStr);
  }

  // Line 4: Agents
  if (input.displayConfig.showAgents && input.agents && input.agents.length > 0) {
    const agentStr = input.agents.map((agent) => {
      return `${t.colors.agentRunning}◐ ${agent.name} [${agent.model}]: ${agent.description}${reset}`;
    }).join(' │ ');
    lines.push(agentStr);
  }

  // Line 5: Todos
  if (input.displayConfig.showTodos && input.todos && input.todos.length > 0) {
    const total = input.todos.length;
    const done = input.todos.filter((td) => td.done).length;
    const todoStr = input.todos.slice(0, 3).map((td) => {
      const icon = td.done ? '✓' : '▸';
      const color = td.done ? t.colors.todoDone : t.colors.todoPending;
      return `${color}${icon} ${td.text}${reset}`;
    }).join(' │ ');
    lines.push(`${todoStr} ${t.colors.dim}(${done}/${total})${reset}`);
  }

  return lines;
}

export function renderBar(percentage: number, fg: string, bg: string, width: number): string {
  const filled = Math.min(width, Math.round((percentage / 100) * width));
  const empty = width - filled;
  return `${fg}${'█'.repeat(filled)}${bg}${'░'.repeat(empty)}\x1b[0m`;
}
