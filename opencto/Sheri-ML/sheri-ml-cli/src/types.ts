// Core types for Sheri ML

export interface ModelProvider {
  name: string;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  stream?(prompt: string, options?: GenerateOptions): AsyncGenerator<string>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AgentConfig {
  primaryModel: string;
  secondaryModel?: string;
  providers: ModelProvider[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ConversationHistory {
  messages: Message[];
  addMessage(role: Message['role'], content: string): void;
  getContext(): string;
}

export interface ProviderHealth {
  name: string;
  available: boolean;
  failCount: number;
  lastError?: string;
  lastSuccessAt?: Date;
  deprioritizedAt?: number;
}

export interface SmartRouterConfig {
  providers: ModelProvider[];
  maxRetries?: number;
  fallbackEnabled?: boolean;
}
