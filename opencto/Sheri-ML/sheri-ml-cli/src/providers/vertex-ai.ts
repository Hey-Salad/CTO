// Google Vertex AI Provider
// Uses plain fetch() — no SDK needed
// Endpoint: aiplatform.googleapis.com
// Default model: gemini-2.5-flash-lite

import { ModelProvider, GenerateOptions } from '../types';

const VERTEX_AI_BASE_URL = 'https://aiplatform.googleapis.com/v1/publishers/google/models';

interface VertexAIChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
  }>;
}

export class VertexAIProvider implements ModelProvider {
  name = 'Google Vertex AI';
  private apiKey: string;
  private model: string;

  constructor(model: string = 'gemini-2.5-flash-lite') {
    const apiKey = process.env.VERTEX_AI_API_KEY;
    if (!apiKey) {
      throw new Error('VERTEX_AI_API_KEY not found in environment');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const url = `${VERTEX_AI_BASE_URL}/${this.model}:streamGenerateContent?key=${this.apiKey}`;

    const fullPrompt = options.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      return this.parseStreamingResponse(responseText);
    } catch (error: any) {
      throw new Error(`Vertex AI failed: ${error.message}`);
    }
  }

  private parseStreamingResponse(responseText: string): string {
    // Vertex AI streaming returns a JSON array of response chunks
    try {
      const chunks: VertexAIChunk[] = JSON.parse(responseText);
      const parts: string[] = [];

      for (const chunk of chunks) {
        for (const candidate of chunk.candidates ?? []) {
          for (const part of candidate?.content?.parts ?? []) {
            if (part.text) parts.push(part.text);
          }
        }
      }

      return parts.join('');
    } catch {
      // Not a JSON array — return raw text
      return responseText;
    }
  }

  async *stream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string> {
    const result = await this.generate(prompt, options);
    yield result;
  }
}
