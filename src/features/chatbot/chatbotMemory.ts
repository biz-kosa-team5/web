import type {
  ChatbotConversationContext,
  ChatbotConversationItem,
  ChatbotConversationMemory,
  ChatbotConversationMemoryPatch,
  ChatbotConversationRegion,
  ChatbotConversationTarget,
} from './chatbotTypes';

export const CHATBOT_MEMORY_VERSION = 'v1';
export const CHATBOT_MEMORY_STORAGE_KEY = 'home-search.chatbot.memory.v1';

const CHATBOT_MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MEMORY_ITEMS = 5;

export function loadChatbotConversationMemory(): ChatbotConversationMemory | null {
  const storage = getLocalStorage();
  if (storage == null) {
    return null;
  }

  try {
    const rawValue = storage.getItem(CHATBOT_MEMORY_STORAGE_KEY);
    if (rawValue == null) {
      return null;
    }

    const parsed: unknown = JSON.parse(rawValue);
    const memory = normalizeChatbotConversationMemory(parsed);
    if (memory == null || isExpired(memory.expiresAt)) {
      storage.removeItem(CHATBOT_MEMORY_STORAGE_KEY);
      return null;
    }

    return memory;
  } catch {
    try {
      storage.removeItem(CHATBOT_MEMORY_STORAGE_KEY);
    } catch {
      // Ignore disabled or unavailable storage.
    }
    return null;
  }
}

export function saveChatbotConversationMemory(memory: ChatbotConversationMemory | null): void {
  const storage = getLocalStorage();
  if (storage == null) {
    return;
  }

  try {
    if (memory == null) {
      storage.removeItem(CHATBOT_MEMORY_STORAGE_KEY);
      return;
    }
    storage.setItem(CHATBOT_MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Ignore quota, private browsing, or disabled storage failures.
  }
}

export function mergeChatbotConversationMemory(
  current: ChatbotConversationMemory | null,
  patch: ChatbotConversationMemoryPatch | null | undefined,
): ChatbotConversationMemory | null {
  if (patch == null) {
    return current;
  }

  const now = new Date();
  const updatedAt = validDateString(patch.updatedAt) ?? now.toISOString();
  const expiresAt = validDateString(patch.expiresAt) ?? new Date(now.getTime() + CHATBOT_MEMORY_TTL_MS).toISOString();
  const items = dedupeMemoryItems([
    ...(patch.items ?? []),
    ...(current?.items ?? []),
  ]);

  return {
    version: CHATBOT_MEMORY_VERSION,
    ...(patch.activeRegion ?? current?.activeRegion ? {
      activeRegion: patch.activeRegion ?? current?.activeRegion,
    } : {}),
    ...(patch.activeComplex ?? current?.activeComplex ? {
      activeComplex: patch.activeComplex ?? current?.activeComplex,
    } : {}),
    items,
    ...(patch.lastHandler ?? current?.lastHandler ? {
      lastHandler: patch.lastHandler ?? current?.lastHandler,
    } : {}),
    ...(patch.lastQueryType ?? current?.lastQueryType ? {
      lastQueryType: patch.lastQueryType ?? current?.lastQueryType,
    } : {}),
    updatedAt,
    expiresAt,
  };
}

export function normalizeChatbotConversationMemoryPatch(value: unknown): ChatbotConversationMemoryPatch | null {
  if (!isRecord(value) || value.version !== CHATBOT_MEMORY_VERSION) {
    return null;
  }

  const activeRegion = normalizeRegion(value.activeRegion);
  const activeComplex = normalizeTarget(value.activeComplex);
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item, index) => {
        const normalized = normalizeItem(item, index + 1);
        return normalized == null ? [] : [normalized];
      })
    : [];
  const lastHandler = stringValue(value.lastHandler);
  const lastQueryType = stringValue(value.lastQueryType);
  const updatedAt = validDateString(value.updatedAt);
  const expiresAt = validDateString(value.expiresAt);

  return {
    version: CHATBOT_MEMORY_VERSION,
    ...(activeRegion == null ? {} : { activeRegion }),
    ...(activeComplex == null ? {} : { activeComplex }),
    ...(items.length === 0 ? {} : { items: dedupeMemoryItems(items) }),
    ...(lastHandler == null ? {} : { lastHandler }),
    ...(lastQueryType == null ? {} : { lastQueryType }),
    ...(updatedAt == null ? {} : { updatedAt }),
    ...(expiresAt == null ? {} : { expiresAt }),
  };
}

export function toChatbotConversationContext(
  memory: ChatbotConversationMemory | null,
): ChatbotConversationContext | null {
  return memory;
}

function normalizeChatbotConversationMemory(value: unknown): ChatbotConversationMemory | null {
  if (!isRecord(value) || value.version !== CHATBOT_MEMORY_VERSION) {
    return null;
  }

  const updatedAt = validDateString(value.updatedAt);
  const expiresAt = validDateString(value.expiresAt);
  if (updatedAt == null || expiresAt == null) {
    return null;
  }

  const activeRegion = normalizeRegion(value.activeRegion);
  const activeComplex = normalizeTarget(value.activeComplex);
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item, index) => {
        const normalized = normalizeItem(item, index + 1);
        return normalized == null ? [] : [normalized];
      })
    : [];
  const lastHandler = stringValue(value.lastHandler);
  const lastQueryType = stringValue(value.lastQueryType);

  return {
    version: CHATBOT_MEMORY_VERSION,
    ...(activeRegion == null ? {} : { activeRegion }),
    ...(activeComplex == null ? {} : { activeComplex }),
    items: dedupeMemoryItems(items),
    ...(lastHandler == null ? {} : { lastHandler }),
    ...(lastQueryType == null ? {} : { lastQueryType }),
    updatedAt,
    expiresAt,
  };
}

function normalizeRegion(value: unknown): ChatbotConversationRegion | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const name = stringValue(value.name);
  if (name == null) {
    return undefined;
  }
  const code = stringValue(value.code);
  const type = stringValue(value.type);
  return {
    name,
    ...(code == null ? {} : { code }),
    ...(type == null ? {} : { type }),
  };
}

function normalizeTarget(value: unknown): ChatbotConversationTarget | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const complexName = stringValue(value.complexName);
  if (complexName == null) {
    return undefined;
  }
  const complexId = numberValue(value.complexId);
  const address = stringValue(value.address);
  return {
    ...(complexId == null ? {} : { complexId }),
    complexName,
    ...(address == null ? {} : { address }),
  };
}

function normalizeItem(value: unknown, fallbackIndex: number): ChatbotConversationItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const target = normalizeTarget(value);
  if (target == null) {
    return null;
  }

  const index = numberValue(value.index) ?? fallbackIndex;
  const tradeId = numberValue(value.tradeId);
  const dealDate = stringValue(value.dealDate);
  const dealAmount = numberValue(value.dealAmount);

  return {
    index,
    kind: 'complex',
    ...target,
    ...(tradeId == null ? {} : { tradeId }),
    ...(dealDate == null ? {} : { dealDate }),
    ...(dealAmount == null ? {} : { dealAmount }),
  };
}

function dedupeMemoryItems(items: ChatbotConversationItem[]): ChatbotConversationItem[] {
  const result: ChatbotConversationItem[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const key = memoryItemKey(item);
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    result.push({
      ...item,
      index: result.length + 1,
    });
    if (result.length >= MAX_MEMORY_ITEMS) {
      break;
    }
  }

  return result;
}

function memoryItemKey(item: ChatbotConversationItem): string {
  if (item.complexId != null) {
    return `id:${item.complexId}`;
  }
  return `name:${normalizeKey(item.complexName)}|address:${normalizeKey(item.address ?? '')}`;
}

function normalizeKey(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isExpired(value: string): boolean {
  return Date.parse(value) <= Date.now();
}

function validDateString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  return Number.isFinite(Date.parse(value)) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim().length === 0)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
