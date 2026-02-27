// Anthropic Claude Provider

import Anthropic from '@anthropic-ai/sdk';
import { ModelProvider, GenerateOptions } from '../types';

export class ClaudeProvider implements ModelProvider {
  name = 'Anthropic Claude';
  private client: Anthropic;
  private model: string;

  constructor(model: string = 'claude-sonnet-4.5-20250514') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return '';
    } catch (error: any) {
      console.error('Claude error:', error.message);
      throw new Error(`Claude failed: ${error.message}`);
    }
  }
}
