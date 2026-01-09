export interface LLMRequest {
  contents?: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  generationConfig?: {
    temperature: number;
    topK?: number;
    topP?: number;
    maxOutputTokens: number;
  };
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  choices?: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMCredential {
  id: number;
  name: string;
  llm: 'gemini' | 'openai' | 'azure';
  model: string;
  apiKey: string;
  companyId?: string;
  status: 'active' | 'inactive' | 'error';
  usageCount?: number;
  errorCount?: number;
  lastError?: string;
  isActive?: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMService {
  generateResponse(
    prompt: string,
    credential: LLMCredential,
    options?: {
      temperature?: number;
      maxTokens?: number;
      companyId?: string;
    },
  ): Promise<string>;

  testConnection(credential: LLMCredential): Promise<boolean>;
}
