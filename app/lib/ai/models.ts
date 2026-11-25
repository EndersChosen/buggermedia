/**
 * AI models offered for score card generation.
 *
 * The id is what the browser sends; `apiModel` is what the provider API gets.
 * Availability depends on which API keys are configured on the server.
 */

export type ModelId = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'gpt-5.2';

export interface ModelOption {
  id: ModelId;
  label: string;
  description: string;
  provider: 'anthropic' | 'openai';
  apiModel: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'claude-opus-5-5',
    label: 'Claude Opus 5.5',
    description: 'Most accurate. Reads PDFs and photos of rule sheets. Usually 30-90 seconds.',
    provider: 'anthropic',
    apiModel: 'claude-opus-5-5',
  },
  {
    id: 'claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    description: 'Faster and cheaper, good for simple games.',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-5-5',
  },
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    description: 'OpenAI alternative.',
    provider: 'openai',
    apiModel: 'gpt-5.2',
  },
];

export const DEFAULT_MODEL: ModelId = 'claude-opus-5-5';

export function isModelId(value: unknown): value is ModelId {
  return MODEL_OPTIONS.some((m) => m.id === value);
}

/** Server-side: is the provider's API key configured? */
export function isProviderConfigured(provider: ModelOption['provider']): boolean {
  return provider === 'anthropic' ? Boolean(process.env.ANTHROPIC_API_KEY) : Boolean(process.env.OPENAI_API_KEY);
}

export function getModelOption(id: ModelId): (ModelOption & { available: boolean }) | undefined {
  const option = MODEL_OPTIONS.find((m) => m.id === id);
  return option ? { ...option, available: isProviderConfigured(option.provider) } : undefined;
}

export function listModels(): Array<Omit<ModelOption, 'apiModel'> & { available: boolean }> {
  return MODEL_OPTIONS.map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    provider: m.provider,
    available: isProviderConfigured(m.provider),
  }));
}
