export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface QuotaWindow {
  name: '5h' | '24h' | '7d' | '30d';
  used: number;
  limit: number;
  usedPercentage: number;
  resetsAt?: Date;
}

export interface ProviderAdapter {
  readonly name: string;
  getTokenUsage(): Promise<TokenUsage | null>;
  getQuotas(): Promise<QuotaWindow[] | null>;
  getContextLimit(modelId: string): Promise<number>;
  validateConfig(): Promise<boolean>;
}

export interface AnimationConfig {
  enabled: boolean;
  mode: 'always' | 'on-change';
  type: 'pulse' | 'laser' | 'none';
  triggerThreshold: number;
}

export interface BarStyle {
  /** Color spec (e.g. "#39c5bb", "[#7f7f7f]", "b#39c5bb[#7f7f7f]") */
  fgColor: string;
  /** Color spec (e.g. "[#7f7f7f]", "#39c5bb") */
  bgColor: string;
  animation: AnimationConfig;
}

export interface Theme {
  name: string;
  colors: {
    model: string;
    label: string;
    warning: string;
    error: string;
    dim: string;
    toolActive: string;
    toolDone: string;
    agentRunning: string;
    todoPending: string;
    todoDone: string;
    cost: string;
    gitBranch: string;
    gitDirty: string;
  };
  bars: {
    context: BarStyle;
    quota5h: BarStyle;
    quota24h: BarStyle;
    quota7d: BarStyle;
    quota30d: BarStyle;
  };
  icons: {
    deepseek?: string;
    kimi?: string;
    glm?: string;
    minimax?: string;
    warning: string;
    error: string;
    tool: string;
    agent: string;
    todo: string;
    gitBranch: string;
    gitDirty: string;
  };
  layout: {
    compact: boolean;
    showLabels: boolean;
    barWidth: number;
  };
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string | null;
}

export interface PricingConfig {
  currency: string;
  models: Record<string, { input: number; output: number }>;
}

export interface MultiHudConfig {
  providerOverride: string | null;
  pollIntervalMs: number;
  theme: string;
  customTheme: Partial<Theme>;
  animations: {
    enabled: boolean;
    defaultMode: 'always' | 'on-change';
    defaultType: 'pulse' | 'laser' | 'none';
    triggerThreshold: number;
  };
  display: {
    showGitStatus: boolean;
    showTools: boolean;
    showAgents: boolean;
    showTodos: boolean;
    showCost: boolean;
  };
  pricing: PricingConfig;
  providers: {
    deepseek: ProviderConfig;
    kimi: ProviderConfig;
    glm: ProviderConfig;
    minimax: ProviderConfig;
  };
}
