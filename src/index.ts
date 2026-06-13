import { loadConfig } from './core/config.js';
import { Engine } from './core/engine.js';
import { renderStatusline } from './core/renderer.js';
import { parseTranscript } from './core/transcript.js';
import { getGitStatus } from './core/git.js';
import { calculateCost } from './core/cost.js';
import { resolveTheme } from './themes/index.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { KimiProvider } from './providers/kimi.js';
import { GlmProvider } from './providers/glm.js';
import { MiniMaxProvider } from './providers/minimax.js';
import { MiMoProvider } from './providers/mimo.js';
import { MultiHudConfig, ProviderAdapter } from './types/index.js';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'multi-hud');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function getProviderAdapter(name: string, config: MultiHudConfig): ProviderAdapter | null {
  switch (name) {
    case 'deepseek':
      return new DeepSeekProvider(config.providers.deepseek);
    case 'kimi':
      return new KimiProvider(config.providers.kimi);
    case 'glm':
      return new GlmProvider(config.providers.glm);
    case 'minimax':
      return new MiniMaxProvider(config.providers.minimax);
    case 'mimo':
      return new MiMoProvider(config.providers.mimo);
    default:
      return null;
  }
}

export async function main(): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const config = loadConfig(CONFIG_PATH);
  const theme = resolveTheme(config.theme, config.customTheme);
  const engine = new Engine(config, process.cwd());

  const transcriptLines: string[] = [];

  function cleanup() {
    engine.destroy();
    process.exit(0);
  }
  process.stdin.on('end', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      let msg: unknown;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      try {
        if (typeof msg === 'object' && msg !== null) {
          const m = msg as Record<string, unknown>;
          if (m.type === 'statusline') {
            const modelId = (m.model as string) || '';
            const providerName = engine.detectProvider(modelId);
            if (providerName) {
              const adapter = getProviderAdapter(providerName, config);
              if (adapter) engine.setProvider(providerName, adapter);
            }

            const cache = engine.getCache();
            const contextLimit = cache.get<number>('contextLimit') ?? 64000;
            const currentTokens = ((m.input_tokens as number) || 0) + ((m.cache_read_input_tokens as number) || 0);
            const contextPercentage = Math.min(100, (currentTokens / contextLimit) * 100);

            const tokenUsage = cache.get<import('./types/index.js').TokenUsage | null>('tokenUsage');
            const quotas = cache.get<import('./types/index.js').QuotaWindow[] | null>('quotas');
            const error = cache.get<string>('error');

            let cost: number | null = null;
            if (config.display.showCost && tokenUsage) {
              cost = calculateCost(modelId, tokenUsage.inputTokens, tokenUsage.outputTokens, config.pricing);
            }

            const transcript = parseTranscript(transcriptLines);
            const gitStatus = config.display.showGitStatus
              ? getGitStatus(process.cwd())
              : { branch: '', dirty: false, ahead: 0, behind: 0 };

            const lines = renderStatusline({
              modelId,
              contextPercentage,
              tokenUsage: tokenUsage || undefined,
              quotas: quotas || undefined,
              cost,
              theme,
              gitStatus,
              tools: transcript.tools,
              agents: transcript.agents,
              todos: transcript.todos,
              displayConfig: config.display,
              errorMessage: error || undefined,
            });

            process.stdout.write(lines.join('\n') + '\n');
          } else if (m.type === 'transcript') {
            transcriptLines.push(line);
            if (transcriptLines.length > 1000) {
              transcriptLines.splice(0, transcriptLines.length - 500);
            }
          }
        }
      } catch (err) {
        console.error('multi-hud processing error:', err);
      }
    }
  });
}

if (process.argv[1] && path.normalize(fileURLToPath(import.meta.url)) === path.normalize(process.argv[1])) {
  main().catch((err) => {
    console.error('multi-hud error:', err);
    process.exit(1);
  });
}
