import {
  AlarmClock,
  Bell,
  CircleCheckBig,
  Download,
  ExternalLink,
  Inbox,
  ListTodo,
  NotebookPen,
  Search,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ItemRow } from '../components/ItemRow';
import { Button, cn, Favicon, IconButton, Segmented } from '../components/ui';
import { useUndoDelete } from '../components/useUndoDelete';
import { useItems, useNow, useSettings, useTheme } from '../lib/hooks';
import { mutateItems, saveSettings, sortItems } from '../lib/storage';
import type { Item, Settings } from '../lib/types';
import { applyInitialTheme } from './boot';
import '../styles.css';

type Filter = 'all' | 'todo' | 'note' | 'reminders' | 'overdue' | 'done';

const FILTERS: { value: Filter; label: string; icon: ReactNode }[] = [
  { value: 'all', label: 'Tümü', icon: <Inbox size={16} /> },
  { value: 'todo', label: 'Yapılacaklar', icon: <ListTodo size={16} /> },
  { value: 'note', label: 'Notlar', icon: <NotebookPen size={16} /> },
  { value: 'reminders', label: 'Hatırlatıcılar', icon: <Bell size={16} /> },
  { value: 'overdue', label: 'Gecikmiş', icon: <AlarmClock size={16} /> },
  { value: 'done', label: 'Tamamlananlar', icon: <CircleCheckBig size={16} /> },
];

function matchesFilter(i: Item, f: Filter, now: number): boolean {
  const openTodo = i.kind === 'todo' && !i.done;
  switch (f) {
    case 'all':
      return !(i.kind === 'todo' && i.done);
    case 'todo':
      return openTodo;
    case 'note':
      return i.kind === 'note';
    case 'reminders':
      return i.remindAt != null && !i.done && (i.remindAt > now || !i.reminded || openTodo);
    case 'overdue':
      return openTodo && i.remindAt != null && i.remindAt <= now;
    case 'done':
      return i.kind === 'todo' && i.done;
  }
}

function Dashboard() {
  const items = useItems();
  const settings = useSettings();
  useTheme(settings?.theme);
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('all');
  const [host, setHost] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { deleteItem, toast } = useUndoDelete();

  const all = items ?? [];
  const q = query.trim().toLocaleLowerCase('tr');

  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    for (const f of FILTERS) c[f.value] = all.filter((i) => matchesFilter(i, f.value, now)).length;
    return c;
  }, [all, now]);

  const sites = useMemo(() => {
    const m = new Map<string, { host: string; url: string; count: number }>();
    for (const i of all) {
      if (!matchesFilter(i, filter, now)) continue;
      const s = m.get(i.host) ?? { host: i.host, url: i.url, count: 0 };
      s.count++;
      m.set(i.host, s);
    }
    return [...m.values()].sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));
  }, [all, filter, now]);

  const groups = useMemo(() => {
    const filtered = all.filter(
      (i) =>
        matchesFilter(i, filter, now) &&
        (!host || i.host === host) &&
        (!q ||
          i.text.toLocaleLowerCase('tr').includes(q) ||
          i.host.includes(q) ||
          i.pageTitle.toLocaleLowerCase('tr').includes(q) ||
          i.tags.some((t) => t.includes(q.replace(/^#/, '')))),
    );
    const sorted =
      filter === 'reminders' || filter === 'overdue'
        ? [...filtered].sort((a, b) => (a.remindAt ?? 0) - (b.remindAt ?? 0))
        : sortItems(filtered);
    const m = new Map<string, Item[]>();
    for (const i of sorted) m.set(i.host, [...(m.get(i.host) ?? []), i]);
    return [...m.entries()];
  }, [all, filter, host, q, now]);

  const total = groups.reduce((n, [, list]) => n + list.length, 0);
  const title = FILTERS.find((f) => f.value === filter)!.label;

  return (
    <div className="flex h-screen bg-zinc-50/60 dark:bg-zinc-950">
      {/* Kenar çubuğu */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/icons/icon48.png" width={28} height={28} alt="" />
          <div className="text-[15px] font-semibold">Site Notları</div>
        </div>
        <nav className="space-y-0.5 px-3">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                filter === f.value
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900',
              )}
            >
              <span className={cn(f.value === 'overdue' && counts.overdue > 0 && 'text-red-500')}>{f.icon}</span>
              <span className="flex-1 text-left">{f.label}</span>
              {counts[f.value] > 0 && (
                <span className="text-xs tabular-nums text-zinc-400">{counts[f.value]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6 px-5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Siteler
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {sites.length === 0 && <div className="px-2.5 text-xs text-zinc-400">Henüz site yok</div>}
          {sites.map((s) => (
            <button
              key={s.host}
              type="button"
              onClick={() => setHost(host === s.host ? null : s.host)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
                host === s.host
                  ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900',
              )}
            >
              <Favicon url={s.url} size={16} />
              <span className="flex-1 truncate text-left">{s.host}</span>
              <span className="text-xs tabular-nums text-zinc-400">{s.count}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-zinc-200/70 p-3 dark:border-zinc-900">
          <Button variant="ghost" className="w-full justify-start" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={16} />
            Ayarlar
          </Button>
        </div>
      </aside>

      {/* İçerik */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-4 border-b border-zinc-200/70 bg-white/80 px-8 py-4 backdrop-blur dark:border-zinc-900 dark:bg-zinc-950/80">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              {title}
              {host && (
                <button
                  type="button"
                  onClick={() => setHost(null)}
                  className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {host}
                  <X size={12} />
                </button>
              )}
            </h1>
            <div className="text-xs text-zinc-500">{total} öğe</div>
          </div>
          <div className="relative ml-auto w-full max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Notlarda, sitelerde, #etiketlerde ara…"
              className="h-9 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-[13px] placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {items === null ? null : groups.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center">
              <Inbox size={36} className="mb-3 text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-medium">{q ? 'Sonuç bulunamadı' : 'Burada henüz bir şey yok'}</div>
              <p className="mt-1 max-w-xs text-xs text-zinc-500">
                {q
                  ? 'Farklı bir arama terimi dene.'
                  : 'Bir web sitesindeyken araç çubuğundaki simgeye tıkla ya da Alt+Shift+N kısayolunu kullan.'}
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {groups.map(([h, list]) => (
                <section
                  key={h}
                  className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40"
                >
                  <header className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800/80">
                    <Favicon url={list[0].url} size={16} />
                    <span className="text-[13px] font-semibold">{h}</span>
                    <span className="text-xs text-zinc-400">{list.length}</span>
                    <div className="flex-1" />
                    <IconButton label="Siteyi aç" onClick={() => chrome.tabs.create({ url: `https://${h}` })}>
                      <ExternalLink size={14} />
                    </IconButton>
                  </header>
                  <div className="p-1.5">
                    {list.map((i) => (
                      <ItemRow key={i.id} item={i} onDelete={deleteItem} context="dashboard" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {settingsOpen && settings && (
        <SettingsDialog settings={settings} items={all} onClose={() => setSettingsOpen(false)} />
      )}
      {toast}
    </div>
  );
}

function SettingsDialog({
  settings,
  items,
  onClose,
}: {
  settings: Settings;
  items: Item[];
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const doneCount = items.filter((i) => i.kind === 'todo' && i.done).length;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: Date.now(), items }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `site-notlari-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const incoming: Item[] = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(incoming)) throw new Error();
      const valid = incoming.filter((i) => i && typeof i.id === 'string' && typeof i.text === 'string' && i.host);
      await mutateItems((cur) => {
        const ids = new Set(cur.map((i) => i.id));
        return [...cur, ...valid.filter((i) => !ids.has(i.id))];
      });
      setMsg(`${valid.length} öğe içe aktarıldı (var olanlar atlandı).`);
    } catch {
      setMsg('Dosya okunamadı. Geçerli bir dışa aktarma dosyası seç.');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/30 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="animate-pop-in w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold">Ayarlar</h2>
          <IconButton label="Kapat" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="space-y-5">
          <Field label="Tema">
            <Segmented
              size="sm"
              value={settings.theme}
              onChange={(theme) => saveSettings({ theme })}
              options={[
                { value: 'system', label: 'Sistem' },
                { value: 'light', label: 'Açık' },
                { value: 'dark', label: 'Koyu' },
              ]}
            />
          </Field>
          <Field label="Yeni öğelerin kapsamı" hint="Site: alan adının tüm sayfalarında görünür. Sayfa: yalnızca o adreste.">
            <Segmented
              size="sm"
              value={settings.defaultScope}
              onChange={(defaultScope) => saveSettings({ defaultScope })}
              options={[
                { value: 'domain', label: 'Site' },
                { value: 'page', label: 'Sayfa' },
              ]}
            />
          </Field>
          <Field label="Erteleme süresi">
            <select
              value={settings.snoozeMinutes}
              onChange={(e) => saveSettings({ snoozeMinutes: Number(e.target.value) })}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
            >
              {[5, 10, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} dakika
                </option>
              ))}
            </select>
          </Field>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          <div>
            <div className="mb-2 text-[13px] font-medium">Veriler</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportJson}>
                <Download size={14} />
                Dışa aktar
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload size={14} />
                İçe aktar
              </Button>
              <Button
                variant="danger"
                disabled={!doneCount}
                onClick={() => {
                  if (confirm(`${doneCount} tamamlanmış görev kalıcı olarak silinsin mi?`)) {
                    void mutateItems((cur) => cur.filter((i) => !(i.kind === 'todo' && i.done)));
                  }
                }}
              >
                <Trash2 size={14} />
                Tamamlananları sil
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importJson(f);
                  e.target.value = '';
                }}
              />
            </div>
            {msg && <p className="mt-2 text-xs text-zinc-500">{msg}</p>}
            <p className="mt-3 text-xs text-zinc-400">
              Tüm veriler yalnızca bu tarayıcıda saklanır, hiçbir sunucuya gönderilmez.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="mt-0.5 max-w-[220px] text-xs text-zinc-500">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

applyInitialTheme();
createRoot(document.getElementById('root')!).render(<Dashboard />);
