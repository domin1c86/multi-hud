import { BaseProvider } from './base.js';

export class MiniMaxProvider extends BaseProvider {
  readonly name = 'minimax';
  // No public API for balance, usage, or quotas.
  // All data comes from Claude Code statusline events.
}
