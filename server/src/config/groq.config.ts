import { Groq } from 'groq-sdk';
import { ChatCompletionCreateParams } from 'groq-sdk/resources/chat/completions';
import envService from '../services/env.service';

export interface AiPart {
  text: string;
}

export interface AiMessage {
  role: string;
  parts: AiPart[];
}

export type PromptContent = string | AiMessage[];

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class GroqConfig {
  private static instance: GroqConfig;
  private client: Groq;

  private constructor() {
    const apiKey = envService.getEnv('GROQ_API_KEY');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('[GroqConfig] GROQ_API_KEY environment variable is required and missing.');
    }
    this.client = new Groq({ apiKey });
    console.log('[GroqConfig] Groq client initialized.');
  }

  static getInstance(): GroqConfig {
    if (!GroqConfig.instance) {
      GroqConfig.instance = new GroqConfig();
    }
    return GroqConfig.instance;
  }

  getClient() {
    return this.client;
  }

  private formatMessages(contents: PromptContent, systemInstruction?: string): GroqMessage[] {
    const messages: GroqMessage[] = [];
    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (item && typeof item === 'object') {
          if ('parts' in item && Array.isArray(item.parts)) {
            const role = item.role === 'model' ? 'assistant' : 'user';
            const content = item.parts.map((p) => p.text || '').join('');
            messages.push({ role, content });
          } else if ('role' in item && 'content' in item && typeof item.content === 'string') {
            messages.push({
              role: item.role as 'system' | 'user' | 'assistant',
              content: item.content,
            });
          }
        }
      }
    } else if (typeof contents === 'string') {
      messages.push({
        role: 'user',
        content: contents,
      });
    }

    return messages;
  }

  async sendPrompt(contents: PromptContent, systemInstruction?: string): Promise<string> {
    const messages = this.formatMessages(contents, systemInstruction);
    console.log('[GroqConfig] Sending messages to Groq:', JSON.stringify(messages, null, 2));
    try {
      const params: ChatCompletionCreateParams = {
        model: 'qwen/qwen3-32b',
        messages,
        temperature: 0.85,
        max_completion_tokens: 4096,
        top_p: 0.95,
        stream: false,
        reasoning_effort: 'default',
        response_format: { type: 'json_object' }
      };
      
      const response = await this.client.chat.completions.create(params);
      
      if ('choices' in response) {
        const text = response.choices[0]?.message?.content ?? '';
        console.log('[GroqConfig] Received response from Groq:', text);
        return text;
      }
      throw new Error('Unexpected streaming response from Groq API');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GroqConfig] Groq API call failed:', message);
      throw error;
    }
  }
}

export default GroqConfig.getInstance();
