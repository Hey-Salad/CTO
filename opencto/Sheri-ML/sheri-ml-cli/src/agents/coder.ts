// Multi-model coding agent

import { ModelProvider, GenerateOptions } from '../types';
import { colors, symbols } from '../utils/colors';

export class CoderAgent {
  private primaryProvider: ModelProvider;
  private secondaryProvider?: ModelProvider;

  constructor(primary: ModelProvider, secondary?: ModelProvider) {
    this.primaryProvider = primary;
    this.secondaryProvider = secondary;
  }

  async generateCode(prompt: string): Promise<string> {
    console.log(colors.peach(`\n${symbols.strawberry} Primary Agent: ${this.primaryProvider.name}`));

    const systemPrompt = `You are an expert software engineer. Generate clean, production-ready code with proper error handling and documentation. Focus on best practices and maintainability.`;

    try {
      // Primary model generates code
      const primaryResult = await this.primaryProvider.generate(prompt, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2048,
      });

      // If we have a secondary model, use it for review/improvement
      if (this.secondaryProvider) {
        console.log(colors.success(`\n${symbols.check} Secondary Agent: ${this.secondaryProvider.name} (reviewing...)`));

        const reviewPrompt = `Review and improve this code:\n\n${primaryResult}\n\nOriginal request: ${prompt}\n\nProvide the improved version with any fixes or enhancements.`;

        const secondaryResult = await this.secondaryProvider.generate(reviewPrompt, {
          systemPrompt: 'You are a senior code reviewer. Improve the code quality, fix any bugs, and enhance best practices.',
          temperature: 0.6,
          maxTokens: 2048,
        });

        console.log(colors.success(`${symbols.check} Code reviewed and improved\n`));
        return secondaryResult;
      }

      console.log(colors.success(`${symbols.check} Code generated\n`));
      return primaryResult;
    } catch (error: any) {
      console.error(colors.error(`${symbols.cross} Error generating code:`), error.message);
      throw error;
    }
  }

  async chat(prompt: string): Promise<string> {
    console.log(colors.peach(`\n${symbols.strawberry} ${this.primaryProvider.name}`));

    try {
      const result = await this.primaryProvider.generate(prompt, {
        systemPrompt: `You are Sheri ML ${symbols.strawberry}, an autonomous CTO assistant. Help with coding, architecture, and development tasks.`,
        temperature: 0.8,
        maxTokens: 2048,
      });

      return result;
    } catch (error: any) {
      console.error(colors.error(`${symbols.cross} Error in chat:`), error.message);
      throw error;
    }
  }
}
