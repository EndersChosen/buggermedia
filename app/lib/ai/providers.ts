import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type AIModel = 'gpt-5.2' | 'claude-sonnet-4.5';

export interface AIProvider {
  generateCompletion(prompt: string): Promise<string>;
}

/**
 * Anthropic (Claude) Provider
 */
class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(model: string = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = model;
  }

  async generateCompletion(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }

    return content.text;
  }
}

/**
 * OpenAI (GPT) Provider
 */
class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(model: string = 'gpt-4o') {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = model;
  }

  async generateCompletion(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_completion_tokens: 16000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI API');
    }

    return content;
  }
}

/**
 * Factory function to get the appropriate AI provider
 */
export function getAIProvider(model: AIModel): AIProvider {
  switch (model) {
    case 'gpt-5.2':
      return new OpenAIProvider('gpt-5.2');
    case 'claude-sonnet-4.5':
      return new AnthropicProvider('claude-sonnet-4-5-20250929');
    default:
      // Default to GPT-5.2
      return new OpenAIProvider('gpt-5.2');
  }
}

/**
 * Get display name for a model
 */
export function getModelDisplayName(model: AIModel): string {
  const names: Record<AIModel, string> = {
    'gpt-5.2': 'GPT-5.2 (Recommended)',
    'claude-sonnet-4.5': 'Claude Sonnet 4.5',
  };
  return names[model];
}
