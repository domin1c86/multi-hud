import { describe, it, expect } from 'vitest';

describe('integration', () => {
  it('all core modules can be imported together', async () => {
    const [configMod, engineMod, rendererMod, transcriptMod, gitMod, costMod, themeMod] = await Promise.all([
      import('../../src/core/config.js'),
      import('../../src/core/engine.js'),
      import('../../src/core/renderer.js'),
      import('../../src/core/transcript.js'),
      import('../../src/core/git.js'),
      import('../../src/core/cost.js'),
      import('../../src/themes/index.js'),
    ]);
    expect(typeof configMod.loadConfig).toBe('function');
    expect(typeof engineMod.Engine).toBe('function');
    expect(typeof rendererMod.renderStatusline).toBe('function');
    expect(typeof transcriptMod.parseTranscript).toBe('function');
    expect(typeof gitMod.getGitStatus).toBe('function');
    expect(typeof costMod.calculateCost).toBe('function');
    expect(typeof themeMod.resolveTheme).toBe('function');
  });
});
