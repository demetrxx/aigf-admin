type ApiErrorPayload = {
  message?: string | string[];
  error?: {
    message?: string | string[];
    code?: string;
  };
  code?: string;
};

type ParsedApiError = {
  message: string;
  code?: string;
  rawMessage: string | null;
};

function normalizeError(
  message: string | string[] | null | undefined,
  fallback: string,
) {
  if (!message) {
    return fallback;
  }
  if (Array.isArray(message)) {
    return message.join(' ');
  }
  return message;
}

async function parseApiError(
  res: Response,
  fallback: string,
): Promise<ParsedApiError> {
  try {
    const data = (await res.json()) as ApiErrorPayload;
    const rawMessage = data?.error?.message ?? data?.message;
    const normalizedRaw = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : rawMessage ?? null;
    return {
      message: normalizeError(normalizedRaw, fallback),
      code: data?.error?.code ?? data?.code,
      rawMessage: normalizedRaw,
    };
  } catch (error) {
    return {
      message: `Request failed with status ${res.status}.`,
      rawMessage: null,
    };
  }
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  rawMessage: string | null;

  constructor(
    status: number,
    message: string,
    code?: string,
    rawMessage: string | null = null,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.rawMessage = rawMessage;
  }
}

export async function buildApiError(res: Response, fallback: string) {
  const { message, code, rawMessage } = await parseApiError(res, fallback);
  return new ApiRequestError(res.status, message, code, rawMessage);
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}
