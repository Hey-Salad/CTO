// Google Gemini Provider (AI Studio)
// Uses @google/genai SDK with GOOGLE_AI_STUDIO_KEY
// Default model: gemini-3-flash-preview (supports thinking tokens)

import { GoogleGenAI } from '@google/genai';
import { ModelProvider, GenerateOptions } from '../types';

export class GeminiProvider implements ModelProvider {
  name: string;
  private client: GoogleGenAI;
  private model: string;

  constructor(model: string = 'gemini-3-flash-preview', apiKeyOverride?: string) {
    this.name = `Google Gemini (${model})`;
    const apiKey = apiKeyOverride || process.env.GOOGLE_AI_STUDIO_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_STUDIO_KEY not found in environment');
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    try {
      const fullPrompt = options.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt;

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: fullPrompt,
        config: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
        },
      });

      return response.text ?? '';
    } catch (error: any) {
      throw new Error(`Gemini failed: ${error.message}`);
    }
  }

  async *stream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string> {
    const fullPrompt = options.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const response = await this.client.models.generateContentStream({
      model: this.model,
      contents: fullPrompt,
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) yield text;
    }
  }
}
