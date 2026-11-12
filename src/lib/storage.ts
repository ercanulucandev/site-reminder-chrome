import { DEFAULT_SETTINGS, type Item, type Kind, type Priority, type Scope, type Settings } from './types';
import { parsePage } from './url';

export const ITEMS_KEY = 'items';
export const SETTINGS_KEY = 'settings';

const TAG_RE = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;

export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const m of text.matchAll(TAG_RE)) tags.add(m[1].toLocaleLowerCase('tr'));
  return [...tags];
}

export async function getItems(): Promise<Item[]> {
  const r = await chrome.storage.local.get(ITEMS_KEY);
  const v = r[ITEMS_KEY];
  return Array.isArray(v) ? (v as Item[]) : [];
}

// Aynı bağlamdaki yazmaları sıraya koy; oku-değiştir-yaz yarışlarını önler
let chain: Promise<unknown> = Promise.resolve();

export function mutateItems(fn: (items: Item[]) => Item[]): Promise<void> {
  const run = chain.then(async () => {
    const items = await getItems();
    await chrome.storage.local.set({ [ITEMS_KEY]: fn(items) });
  });
  chain = run.catch(() => {});
  return run;
}

export interface NewItemInput {
  kind: Kind;
  text: string;
  scope: Scope;
  url: string;
  pageTitle?: string;
  priority?: Priority;
  remindAt?: number | null;
}

export async function addItem(input: NewItemInput): Promise<Item | null> {
  const page = parsePage(input.url);
  const text = input.text.trim();
  if (!page || !text) return null;
  const now = Date.now();
  const item: Item = {
    id: crypto.randomUUID(),
    kind: input.kind,
    text,
    done: false,
    priority: input.priority ?? 'normal',
    tags: extractTags(text),
    scope: input.scope,
    host: page.host,
    pageKey: page.pageKey,
    url: page.cleanUrl,
    pageTitle: input.pageTitle ?? '',
    remindAt: input.remindAt ?? null,
    reminded: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await mutateItems((items) => [item, ...items]);
  return item;
}

export function updateItem(id: string, patch: Partial<Item>): Promise<void> {
  return mutateItems((items) =>
    items.map((i) => {
      if (i.id !== id) return i;
      const next: Item = { ...i, ...patch, updatedAt: Date.now() };
      if (patch.text !== undefined) next.tags = extractTags(patch.text);
      if (patch.remindAt !== undefined && patch.reminded === undefined) next.reminded = false;
      if (patch.done !== undefined) next.completedAt = patch.done ? Date.now() : null;
      return next;
    }),
  );
}

export function removeItem(id: string): Promise<void> {
  return mutateItems((items) => items.filter((i) => i.id !== id));
}

export function restoreItem(item: Item): Promise<void> {
  return mutateItems((items) =>
    items.some((i) => i.id === item.id) ? items : [item, ...items],
  );
}

export async function getSettings(): Promise<Settings> {
  const r = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...((r[SETTINGS_KEY] as Partial<Settings>) ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...cur, ...patch } });
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done && b.done) return (b.completedAt ?? 0) - (a.completedAt ?? 0);
    if (a.kind === 'todo' && b.kind === 'todo') {
      const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (p) return p;
      const ar = a.remindAt ?? Infinity;
      const br = b.remindAt ?? Infinity;
      if (ar !== br) return ar - br;
      return b.createdAt - a.createdAt;
    }
    return b.updatedAt - a.updatedAt;
  });
}
