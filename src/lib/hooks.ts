import { useEffect, useState } from 'react';
import { getItems, getSettings, ITEMS_KEY, SETTINGS_KEY } from './storage';
import { DEFAULT_SETTINGS, type Item, type Settings, type ThemePref } from './types';

type StorageListener = Parameters<typeof chrome.storage.onChanged.addListener>[0];
type ActivatedListener = Parameters<typeof chrome.tabs.onActivated.addListener>[0];
type UpdatedListener = Parameters<typeof chrome.tabs.onUpdated.addListener>[0];

export function useItems(): Item[] | null {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    let alive = true;
    getItems().then((i) => alive && setItems(i));
    const onChange: StorageListener = (changes, area) => {
      if (area === 'local' && changes[ITEMS_KEY]) {
        setItems((changes[ITEMS_KEY].newValue as Item[] | undefined) ?? []);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);
  return items;
}

export function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    let alive = true;
    getSettings().then((s) => alive && setSettings(s));
    const onChange: StorageListener = (changes, area) => {
      if (area === 'local' && changes[SETTINGS_KEY]) {
        setSettings({ ...DEFAULT_SETTINGS, ...(changes[SETTINGS_KEY].newValue as Partial<Settings>) });
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);
  return settings;
}

/** Bu penceredeki aktif sekme; sekme değişince/URL değişince güncellenir. undefined = yükleniyor */
export function useActiveTab(): chrome.tabs.Tab | null | undefined {
  const [tab, setTab] = useState<chrome.tabs.Tab | null | undefined>(undefined);
  useEffect(() => {
    let winId: number | undefined;
    const load = async () => {
      const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
      setTab(t ?? null);
    };
    chrome.windows.getCurrent().then((w) => (winId = w.id));
    void load();
    const onActivated: ActivatedListener = (info) => {
      if (winId === undefined || info.windowId === winId) void load();
    };
    const onUpdated: UpdatedListener = (_id, change, t) => {
      if (t.active && (winId === undefined || t.windowId === winId) && (change.url || change.title)) {
        setTab(t);
      }
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);
  return tab;
}

/** Göreli zamanların tazelenmesi için periyodik yeniden çizim */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useTheme(pref: ThemePref | undefined): void {
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || ((pref ?? 'system') === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}
