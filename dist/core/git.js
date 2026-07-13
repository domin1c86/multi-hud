import { execSync } from 'child_process';
export function getGitStatus(cwd, exec = execSync) {
    try {
        const branchOutput = exec('git rev-parse --abbrev-ref HEAD', {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
        }).trim();
        // Ahead/behind requires a configured upstream; a branch without one is common
        // and must not wipe the branch/dirty info, so isolate this query.
        let ahead = 0;
        let behind = 0;
        try {
            const aheadBehind = exec('git rev-list --left-right --count HEAD...@{u}', {
                cwd,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'ignore'],
            }).trim();
            [ahead, behind] = aheadBehind.split('\t').map((n) => parseInt(n, 10) || 0);
        }
        catch {
            // No upstream configured — leave ahead/behind at 0.
        }
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
    }
    catch {
        return { branch: '', dirty: false, ahead: 0, behind: 0 };
    }
}
