/**
 * Type definitions for the statusline and transcript events
 * that Claude Code sends to plugins via stdin.
 */

export interface StatuslineEvent {
  type: 'statusline';
  model: {
    id: string;
    display_name: string;
  };
  context_window: {
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;
    used_percentage: number | null;
    remaining_percentage: number | null;
    current_usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    } | null;
  };
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };
  rate_limits?: {
    five_hour?: { used_percentage: number; resets_at: number };
    seven_day?: { used_percentage: number; resets_at: number };
  };
  cwd?: string;
  session_id?: string;
  version?: string;
  vim?: { mode: string };
  effort?: { level: string };
  thinking?: { enabled: boolean };
  agent?: { name: string };
  pr?: { number: number; url: string; review_state?: string };
  worktree?: {
    name: string;
    path: string;
    branch?: string;
    original_cwd?: string;
    original_branch?: string;
  };
  workspace?: {
    current_dir: string;
    project_dir: string;
    added_dirs?: string[];
    git_worktree?: string;
    repo?: { host: string; owner: string; name: string };
  };
}

export interface TranscriptEvent {
  type: 'transcript';
  [key: string]: unknown;
}
