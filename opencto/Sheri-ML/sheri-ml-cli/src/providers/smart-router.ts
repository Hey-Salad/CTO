// Smart Router
// Routes requests across multiple providers with automatic fallback.
// Provider order (default): GeminiProvider → VertexAIProvider → MockProvider
// After 3 consecutive failures a provider is deprioritised for 5 minutes.

import { ModelProvider, GenerateOptions, ProviderHealth, SmartRouterConfig } from '../types';

const DEPRIORITIZE_AFTER_FAILURES = 3;
const DEPRIORITIZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class SmartRouter implements ModelProvider {
  name = 'SmartRouter';
  private providers: ModelProvider[];
  private health: Map<string, ProviderHealth>;

  constructor(config: SmartRouterConfig) {
    this.providers = config.providers;
    this.health = new Map();

    for (const provider of this.providers) {
      this.health.set(provider.name, {
        name: provider.name,
        available: true,
        failCount: 0,
      });
    }
  }

  private isDeprioritized(health: ProviderHealth): boolean {
    if (health.failCount < DEPRIORITIZE_AFTER_FAILURES) return false;
    if (health.deprioritizedAt === undefined) return false;
    return Date.now() - health.deprioritizedAt < DEPRIORITIZE_DURATION_MS;
  }

  private onSuccess(name: string): void {
    const h = this.health.get(name)!;
    h.available = true;
    h.failCount = 0;
    h.lastSuccessAt = new Date();
    h.deprioritizedAt = undefined;
  }

  private onFailure(name: string, error: Error): void {
    const h = this.health.get(name)!;
    h.failCount++;
    h.lastError = error.message;

    if (h.failCount >= DEPRIORITIZE_AFTER_FAILURES && h.deprioritizedAt === undefined) {
      h.deprioritizedAt = Date.now();
      console.warn(
        `[SmartRouter] ${name} deprioritized for 5 min after ${h.failCount} consecutive failures`
      );
    }
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    // Active providers first; deprioritized ones sorted to the end
    const ordered = [...this.providers].sort((a, b) => {
      const da = this.isDeprioritized(this.health.get(a.name)!);
      const db = this.isDeprioritized(this.health.get(b.name)!);
      return Number(da) - Number(db);
    });

    const errors: string[] = [];

    for (const provider of ordered) {
      try {
        const result = await provider.generate(prompt, options);
        this.onSuccess(provider.name);
        console.log(`[SmartRouter] Served by: ${provider.name}`);
        return result;
      } catch (error: any) {
        this.onFailure(provider.name, error);
        errors.push(`${provider.name}: ${error.message}`);
        console.warn(`[SmartRouter] ${provider.name} failed — trying next provider...`);
      }
    }

    throw new Error(`All providers failed:\n${errors.join('\n')}`);
  }

  async *stream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string> {
    const result = await this.generate(prompt, options);
    yield result;
  }

  getHealth(): ProviderHealth[] {
    return Array.from(this.health.values());
  }
}

export function createSmartRouter(config: SmartRouterConfig): SmartRouter {
  return new SmartRouter(config);
}
