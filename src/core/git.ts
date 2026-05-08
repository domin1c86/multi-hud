import { execSync } from 'child_process';

export interface GitStatus {
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
}

export function getGitStatus(cwd: string, exec: typeof execSync = execSync): GitStatus {
  try {
    const branchOutput = exec('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    const aheadBehind = exec('git rev-list --left-right --count HEAD...@{u}', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    const [ahead, behind] = aheadBehind.split('\t').map((n) => parseInt(n, 10) || 0);

    const statusOutput = exec('git status --porcelain', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    return {
      branch: branchOutput,
      dirty: statusOutput.length > 0,
      ahead,
      behind,
    };
  } catch {
    return { branch: '', dirty: false, ahead: 0, behind: 0 };
  }
}
