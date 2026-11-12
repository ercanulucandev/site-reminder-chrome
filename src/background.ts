import { addItem, getItems, getSettings, ITEMS_KEY, updateItem } from './lib/storage';
import type { Item } from './lib/types';
import { itemsForPage, parsePage } from './lib/url';

const ALARM_PREFIX = 'remind:';
const MENU_ADD = 'add-to-page';
const MENU_SELECTION = 'save-selection';

// ---------- Hatırlatıcılar ----------

function wantsAlarm(i: Item): boolean {
  return i.remindAt != null && !i.reminded && !(i.kind === 'todo' && i.done);
}

/** Depodaki öğelerle chrome.alarms'ı eşitler. Geçmişte kalanlar hemen tetiklenir. */
async function syncAlarms(items?: Item[]): Promise<void> {
  items ??= await getItems();
  const wanted = new Map<string, number>();
  for (const i of items) if (wantsAlarm(i)) wanted.set(ALARM_PREFIX + i.id, i.remindAt!);

  const existing = await chrome.alarms.getAll();
  for (const a of existing) {
    if (!a.name.startsWith(ALARM_PREFIX)) continue;
    const when = wanted.get(a.name);
    const stale = when !== undefined && when > Date.now() && Math.abs(a.scheduledTime - when) > 1000;
    if (when === undefined || stale) {
      await chrome.alarms.clear(a.name);
    } else {
      wanted.delete(a.name);
    }
  }
  for (const [name, when] of wanted) {
    await chrome.alarms.create(name, { when: Math.max(when, Date.now() + 500) });
  }
}

async function notify(item: Item): Promise<void> {
  const { snoozeMinutes } = await getSettings();
  const icon = item.kind === 'todo' ? '☐' : '📝';
  chrome.notifications.create(ALARM_PREFIX + item.id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: `Hatırlatıcı · ${item.host}`,
    message: `${icon} ${item.text.slice(0, 240)}`,
    contextMessage: item.pageTitle || item.url,
    priority: 2,
    requireInteraction: true,
    buttons: [{ title: 'Siteyi aç' }, { title: `${snoozeMinutes} dk ertele` }],
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const id = alarm.name.slice(ALARM_PREFIX.length);
  const item = (await getItems()).find((i) => i.id === id);
  if (!item || !wantsAlarm(item)) return;
  await notify(item);
  await updateItem(id, { reminded: true });
});

async function openItem(id: string): Promise<void> {
  const item = (await getItems()).find((i) => i.id === id);
  if (!item) return;
  const tabs = await chrome.tabs.query({});
  const match = tabs.find((t) => {
    const p = parsePage(t.url);
    if (!p) return false;
    return item.scope === 'page' ? p.pageKey === item.pageKey : p.host === item.host;
  });
  if (match?.id != null) {
    await chrome.tabs.update(match.id, { active: true });
    if (match.windowId != null) await chrome.windows.update(match.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: item.url });
  }
}

chrome.notifications.onClicked.addListener(async (nid) => {
  if (!nid.startsWith(ALARM_PREFIX)) return;
  chrome.notifications.clear(nid);
  await openItem(nid.slice(ALARM_PREFIX.length));
});

chrome.notifications.onButtonClicked.addListener(async (nid, index) => {
  if (!nid.startsWith(ALARM_PREFIX)) return;
  chrome.notifications.clear(nid);
  const id = nid.slice(ALARM_PREFIX.length);
  if (index === 0) {
    await openItem(id);
  } else {
    const { snoozeMinutes } = await getSettings();
    await updateItem(id, { remindAt: Date.now() + snoozeMinutes * 60_000, reminded: false });
  }
});

// ---------- Rozet (badge) ----------

async function updateBadges(items?: Item[]): Promise<void> {
  items ??= await getItems();
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    if (tab.id == null) continue;
    const page = parsePage(tab.url);
    const open = page
      ? itemsForPage(items, page).filter((i) => i.kind === 'todo' && !i.done)
      : [];
    const overdue = open.some((i) => i.remindAt != null && i.remindAt <= now);
    await chrome.action.setBadgeText({ tabId: tab.id, text: open.length ? String(open.length) : '' });
    if (open.length) {
      await chrome.action.setBadgeBackgroundColor({
        tabId: tab.id,
        color: overdue ? '#dc2626' : '#4f46e5',
      });
      await chrome.action.setBadgeTextColor?.({ tabId: tab.id, color: '#ffffff' });
    }
  }
}

chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.url || change.status === 'complete') void updateBadges();
});
chrome.tabs.onActivated.addListener(() => void updateBadges());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[ITEMS_KEY]) return;
  const items = (changes[ITEMS_KEY].newValue as Item[] | undefined) ?? [];
  void syncAlarms(items);
  void updateBadges(items);
});

// ---------- Sağ tık menüsü ve kısayollar ----------

function setupMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ADD,
      title: 'Bu sayfaya not / görev ekle',
      contexts: ['page', 'link', 'image'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });
    chrome.contextMenus.create({
      id: MENU_SELECTION,
      title: 'Seçili metni not olarak kaydet: "%s"',
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*'],
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // sidePanel.open kullanıcı hareketi gerektirir; await'ten önce çağrılmalı
  if (tab?.windowId != null) void chrome.sidePanel.open({ windowId: tab.windowId });
  if (info.menuItemId === MENU_SELECTION && info.selectionText && tab?.url) {
    void addItem({
      kind: 'note',
      text: `“${info.selectionText.trim()}”`,
      scope: 'page',
      url: tab.url,
      pageTitle: tab.title,
    });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-side-panel' && tab?.windowId != null) {
    void chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// ---------- Yaşam döngüsü ----------

chrome.runtime.onInstalled.addListener(() => {
  setupMenus();
  void syncAlarms();
  void updateBadges();
});

chrome.runtime.onStartup.addListener(() => {
  void syncAlarms();
  void updateBadges();
});
