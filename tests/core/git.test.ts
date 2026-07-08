import { describe, it, expect, vi } from 'vitest';
import { getGitStatus } from '../../src/core/git.js';

describe('getGitStatus', () => {
  it('parses git status output', () => {
    const exec = vi.fn().mockReturnValueOnce('main').mockReturnValueOnce('2\t1').mockReturnValueOnce('M\tsrc/index.ts');

    const status = getGitStatus('/fake/repo', exec as never);
    expect(status.branch).toBe('main');
    expect(status.ahead).toBe(2);
    expect(status.behind).toBe(1);
    expect(status.dirty).toBe(true);
  });

  it('returns empty status when not in a git repo', () => {
    const exec = vi.fn().mockImplementation(() => {
      throw new Error('not a git repo');
    });

    const status = getGitStatus('/fake/repo', exec as never);
    expect(status.branch).toBe('');
    expect(status.dirty).toBe(false);
    expect(status.ahead).toBe(0);
    expect(status.behind).toBe(0);
  });

  it('keeps branch and dirty state when there is no upstream', () => {
    const exec = vi
      .fn()
      .mockReturnValueOnce('feature') // rev-parse: branch
      .mockImplementationOnce(() => {
        throw new Error("fatal: no upstream configured for branch 'feature'");
      }) // rev-list: no upstream
      .mockReturnValueOnce('M\tsrc/index.ts'); // status: dirty

    const status = getGitStatus('/fake/repo', exec as never);
    expect(status.branch).toBe('feature');
    expect(status.dirty).toBe(true);
    expect(status.ahead).toBe(0);
    expect(status.behind).toBe(0);
  });

  it('marks clean when no changes', () => {
    const exec = vi.fn().mockReturnValueOnce('feature').mockReturnValueOnce('0\t0').mockReturnValueOnce('');

    const status = getGitStatus('/fake/repo', exec as never);
    expect(status.branch).toBe('feature');
    expect(status.dirty).toBe(false);
    expect(status.ahead).toBe(0);
    expect(status.behind).toBe(0);
  });
});
