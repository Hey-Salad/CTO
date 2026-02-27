// Cheri ML Provider - HeySalad's custom 1.3B model

import axios from 'axios';
import { ModelProvider, GenerateOptions } from '../types';

export class CheriMLProvider implements ModelProvider {
  name = 'Cheri ML 1.3B';
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.CHERI_ML_BASE_URL || 'https://cheri-ml.heysalad.app';
    this.apiKey = process.env.CHERI_ML_API_KEY || 'cheri-ml-2026-heysalad';
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/generate`,
        {
          prompt: options.systemPrompt
            ? `${options.systemPrompt}\n\n${prompt}`
            : prompt,
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds
        }
      );

      return response.data.generated_text || response.data.text || '';
    } catch (error: any) {
      console.error('Cheri ML error:', error.message);
      throw new Error(`Cheri ML failed: ${error.message}`);
    }
  }
}
