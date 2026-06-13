import { BaseProvider } from './base.js';
import type { MimoProviderConfig } from '../types/index.js';

export class MiMoProvider extends BaseProvider {
  readonly name = 'mimo';
  protected mimoConfig: MimoProviderConfig;

  constructor(config: MimoProviderConfig) {
    super(config);
    this.mimoConfig = config;
  }

  override async validateConfig(): Promise<boolean> {
    return !!this.config.apiKey || !!this.mimoConfig.plan;
  }
}