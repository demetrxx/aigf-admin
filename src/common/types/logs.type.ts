export type LogOrder = 'ASC' | 'DESC';
export type LogOrderBy = 'createdAt' | 'updatedAt';

export type LlmCallType = 'tool_planner' | 'chat' | 'image';
export type ErrorCode = 'telegram' | 'llm' | 'runpod' | 'be' | 'other';

export type IChatResponseLog = {
  id: string;
  chatId: string;
  toolsUsed: string[];
  totalLatency: number;
  toolRouterLatency: number;
  textGenerationLatency: number;
  createdAt: string;
};

export type ILlmCallLog = {
  id: string;
  chatId: string;
  type: LlmCallType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  price: number;
  latency: number;
  createdAt: string;
};

export type IImageGenLog = {
  id: string;
  chatId: string;
  promptLatency: number;
  generationLatency: number;
  uploadLatency: number;
  totalLatency: number;
  createdAt: string;
};

export type IErrorLog = {
  id: string;
  code: ErrorCode;
  message: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};
