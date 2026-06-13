import { BaseProvider } from './base.js';

export class MiMoProvider extends BaseProvider {
  readonly name = 'mimo';
  // No public API for balance, usage, or quotas.
  // All data comes from Claude Code statusline events.
}
