import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type AIModel = 'claude-sonnet-4' | 'gpt-4o' | 'gpt-4o-mini';

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
      max_tokens: 16000,
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
    case 'claude-sonnet-4':
      return new AnthropicProvider('claude-sonnet-4-20250514');
    case 'gpt-4o':
      return new OpenAIProvider('gpt-4o');
    case 'gpt-4o-mini':
      return new OpenAIProvider('gpt-4o-mini');
    default:
      // Default to Claude
      return new AnthropicProvider('claude-sonnet-4-20250514');
  }
}

/**
 * Get display name for a model
 */
export function getModelDisplayName(model: AIModel): string {
  const names: Record<AIModel, string> = {
    'claude-sonnet-4': 'Claude Sonnet 4 (Recommended)',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini (Faster)',
  };
  return names[model];
}
