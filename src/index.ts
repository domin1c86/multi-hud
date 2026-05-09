import { loadConfig, defaultConfig } from './core/config.js';
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
import { MultiHudConfig, ProviderAdapter } from './types/index.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'multi-hud');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function getProviderAdapter(name: string, config: MultiHudConfig): ProviderAdapter | null {
  switch (name) {
    case 'deepseek': return new DeepSeekProvider(config.providers.deepseek);
    case 'kimi': return new KimiProvider(config.providers.kimi);
    case 'glm': return new GlmProvider(config.providers.glm);
    case 'minimax': return new MiniMaxProvider(config.providers.minimax);
    default: return null;
  }
}

export async function main(): Promise<void> {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const config = loadConfig(CONFIG_PATH);
  const theme = resolveTheme(config.theme, config.customTheme);
  const engine = new Engine(config, process.cwd());

  let transcriptLines: string[] = [];

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'statusline') {
          const modelId = msg.model || '';
          const providerName = engine.detectProvider(modelId);
          if (providerName) {
            const adapter = getProviderAdapter(providerName, config);
            if (adapter) engine.setProvider(providerName, adapter);
          }

          const cache = engine.getCache();
          const contextLimit = cache.get<number>('contextLimit') ?? 64000;
          const currentTokens = (msg.input_tokens || 0) + (msg.cache_read_input_tokens || 0);
          const contextPercentage = Math.min(100, (currentTokens / contextLimit) * 100);

          const tokenUsage = cache.get<ReturnType<ProviderAdapter['getTokenUsage']>>('tokenUsage');
          const quotas = cache.get<ReturnType<ProviderAdapter['getQuotas']>>('quotas');
          const error = cache.get<string>('error');

          let cost: number | null = null;
          if (config.display.showCost && tokenUsage) {
            cost = calculateCost(modelId, tokenUsage.inputTokens, tokenUsage.outputTokens, config.pricing);
          }

          const transcript = parseTranscript(transcriptLines);
          const gitStatus = config.display.showGitStatus ? getGitStatus(process.cwd()) : { branch: '', dirty: false, ahead: 0, behind: 0 };

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
        } else if (msg.type === 'transcript') {
          transcriptLines.push(line);
          if (transcriptLines.length > 1000) transcriptLines = transcriptLines.slice(-500);
        }
      } catch {
        // ignore non-JSON lines
      }
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('multi-hud error:', err);
    process.exit(1);
  });
}
