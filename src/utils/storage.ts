import { ChatSession, ChatBackend, CloudLLMConfig, OllamaConfig } from '../types';

const STORAGE_KEYS = {
  SESSIONS: 'chat_sessions',
  CHAT_BACKEND: 'chat_backend',
  CLOUD_LLM_CONFIG: 'cloud_llm_config',
  OLLAMA_CONFIG: 'ollama_config',
  WEB_SEARCH_ENABLED: 'web_search_enabled',
} as const;

export const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
};

export const loadSessions = (): ChatSession[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  if (!stored) return [];
  try {
    return JSON.parse(stored).map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity),
    }));
  } catch {
    return [];
  }
};

export const saveChatBackend = (backend: ChatBackend) => {
  localStorage.setItem(STORAGE_KEYS.CHAT_BACKEND, backend);
};

export const loadChatBackend = (): ChatBackend => {
  const stored = localStorage.getItem(
    STORAGE_KEYS.CHAT_BACKEND,
  ) as ChatBackend | null;
  if (stored === 'cloud-llm' || stored === 'ollama') {
    return stored;
  }
  return 'cloud-llm';
};

export const saveCloudLLMConfig = (config: CloudLLMConfig | null) => {
  if (!config) {
    localStorage.removeItem(STORAGE_KEYS.CLOUD_LLM_CONFIG);
    return;
  }
  const { provider, model, baseUrl } = config;
  const safeConfig: Pick<CloudLLMConfig, 'provider' | 'model' | 'baseUrl'> = {
    provider,
    model,
    baseUrl,
  };
  localStorage.setItem(
    STORAGE_KEYS.CLOUD_LLM_CONFIG,
    JSON.stringify(safeConfig),
  );
};

export const loadCloudLLMConfig = (): CloudLLMConfig | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.CLOUD_LLM_CONFIG);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;

    const config = parsed as CloudLLMConfig;

    if (config.provider === 'openai') {
      const validModels = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5', 'gpt-5.1'];
      if (!validModels.includes(config.model)) {
        config.model = 'gpt-5-nano';
      }
    }

    if (config.provider === 'gemini') {
      const validGeminiModels = [
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-3-pro-preview',
      ];

      if (!validGeminiModels.includes(config.model)) {
        if (
          config.model === 'gemini-1.5-flash' ||
          config.model === 'gemini-1.5-pro'
        ) {
          config.model = 'gemini-2.5-flash-lite';
        } else {
          config.model = 'gemini-2.5-flash-lite';
        }
      }
    }

    return config;
  } catch {
    return null;
  }
};

export const saveOllamaConfig = (config: OllamaConfig | null) => {
  if (!config) {
    localStorage.removeItem(STORAGE_KEYS.OLLAMA_CONFIG);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.OLLAMA_CONFIG, JSON.stringify(config));
};

export const loadOllamaConfig = (): OllamaConfig | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.OLLAMA_CONFIG);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as OllamaConfig;
  } catch {
    return null;
  }
};

export const saveWebSearchEnabled = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEYS.WEB_SEARCH_ENABLED, enabled ? '1' : '0');
};

export const loadWebSearchEnabled = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEYS.WEB_SEARCH_ENABLED);
  if (stored === '1') return true;
  if (stored === '0') return false;
  return false;
};
