import { GoogleGenAI, Content } from '@google/genai';
import envService from '../services/env.service';

class GeminiConfig {
  private static instance: GeminiConfig;
  private client: GoogleGenAI;

  private constructor() {
    const apiKey = envService.getEnv('GOOGLE_API_KEY');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('[GeminiConfig] GOOGLE_API_KEY environment variable is required and missing.');
    }
    this.client = new GoogleGenAI({ apiKey });
    console.log('[GeminiConfig] Gemini client initialized.');
  }

  static getInstance(): GeminiConfig {
    if (!GeminiConfig.instance) {
      GeminiConfig.instance = new GeminiConfig();
    }
    return GeminiConfig.instance;
  }

  getClient() {
    return this.client;
  }

  async sendPrompt(contents: Content[], systemInstruction?: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction,
        temperature: 0.85,
      },
      contents: contents,
    });
    return response.text ?? '';
  }
}

export default GeminiConfig.getInstance();
