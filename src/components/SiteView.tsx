import { ChevronRight, CircleCheckBig, LayoutGrid, ListTodo, NotebookPen, PanelRight, ShieldOff } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useActiveTab, useItems, useSettings, useTheme } from '../lib/hooks';
import { sortItems } from '../lib/storage';
import type { Kind } from '../lib/types';
import { itemsForPage, parsePage } from '../lib/url';
import { Composer } from './Composer';
import { ItemRow } from './ItemRow';
import { cn, Favicon, IconButton, Segmented } from './ui';
import { useUndoDelete } from './useUndoDelete';

export function SiteView({ variant }: { variant: 'popup' | 'panel' }) {
  const tab = useActiveTab();
  const items = useItems();
  const settings = useSettings();
  useTheme(settings?.theme);
  const [kind, setKind] = useState<Kind>('todo');
  const [showDone, setShowDone] = useState(false);
  const { deleteItem, toast } = useUndoDelete();

  const page = parsePage(tab?.url);

  const { open, done, notes } = useMemo(() => {
    const list = page && items ? sortItems(itemsForPage(items, page)) : [];
    return {
      open: list.filter((i) => i.kind === 'todo' && !i.done),
      done: list.filter((i) => i.kind === 'todo' && i.done),
      notes: list.filter((i) => i.kind === 'note'),
    };
  }, [items, page?.host, page?.pageKey]);

  const openDashboard = () => {
    chrome.runtime.openOptionsPage();
    if (variant === 'popup') window.close();
  };
  const openPanel = async () => {
    const w = await chrome.windows.getCurrent();
    if (w.id != null) await chrome.sidePanel.open({ windowId: w.id });
    window.close();
  };

  const loading = tab === undefined || !items || !settings;

  return (
    <div
      className={cn(
        'flex flex-col',
        variant === 'popup' ? 'max-h-[580px] min-h-[460px] w-[390px]' : 'h-screen',
      )}
    >
      {/* Başlık */}
      <header className="flex items-center gap-2.5 border-b border-zinc-100 px-3.5 py-3 dark:border-zinc-900">
        {page ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <Favicon url={tab!.url!} size={16} />
          </div>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <NotebookPen size={16} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{page?.host ?? 'Site Notları'}</div>
          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {page ? tab?.title || page.pageKey : 'Her site için notlar ve görevler'}
          </div>
        </div>
        {variant === 'popup' && (
          <IconButton label="Yan panelde aç" onClick={openPanel}>
            <PanelRight size={16} />
          </IconButton>
        )}
        <IconButton label="Tüm notlar" onClick={openDashboard}>
          <LayoutGrid size={16} />
        </IconButton>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : !page ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <ShieldOff size={28} className="text-zinc-300 dark:text-zinc-700" />
          <div className="text-sm font-medium">Bu sayfaya not eklenemiyor</div>
          <p className="max-w-[260px] text-xs text-zinc-500">
            Tarayıcının kendi sayfalarında (ayarlar, yeni sekme vb.) not tutulamaz. Bir web sitesine geç ya da tüm notlarına göz at.
          </p>
          <button
            type="button"
            onClick={openDashboard}
            className="mt-2 text-[13px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Tüm notları aç →
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2.5 px-3.5 pt-3">
            <Segmented
              className="w-full"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'todo', label: 'Yapılacaklar', icon: <ListTodo size={14} />, count: open.length },
                { value: 'note', label: 'Notlar', icon: <NotebookPen size={14} />, count: notes.length },
              ]}
            />
            <Composer
              key={page.pageKey}
              kind={kind}
              url={tab!.url!}
              pageTitle={tab?.title ?? ''}
              defaultScope={settings.defaultScope}
            />
          </div>

          <div className="mt-2 flex-1 overflow-y-auto px-1.5 pb-4">
            {kind === 'todo' ? (
              <>
                {open.length === 0 && done.length === 0 && (
                  <Empty
                    icon={<CircleCheckBig size={26} />}
                    title="Bu site için görev yok"
                    text="Yukarıdan bir görev ekle; istersen hatırlatıcı da kur."
                  />
                )}
                {open.length === 0 && done.length > 0 && (
                  <Empty icon={<CircleCheckBig size={26} />} title="Hepsi tamam!" text="Bu sitedeki tüm görevleri bitirdin." />
                )}
                {open.map((i) => (
                  <ItemRow key={i.id} item={i} onDelete={deleteItem} />
                ))}
                {done.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowDone(!showDone)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      <ChevronRight size={14} className={cn('transition-transform', showDone && 'rotate-90')} />
                      Tamamlananlar ({done.length})
                    </button>
                    {showDone && done.map((i) => <ItemRow key={i.id} item={i} onDelete={deleteItem} />)}
                  </div>
                )}
              </>
            ) : (
              <>
                {notes.length === 0 && (
                  <Empty
                    icon={<NotebookPen size={26} />}
                    title="Henüz not yok"
                    text="Bu siteyle ilgili fikirlerini, bilgileri ya da bağlantıları buraya yaz."
                  />
                )}
                {notes.map((i) => (
                  <ItemRow key={i.id} item={i} onDelete={deleteItem} />
                ))}
              </>
            )}
          </div>
        </>
      )}
      {toast}
    </div>
  );
}

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-2 text-zinc-300 dark:text-zinc-700">{icon}</div>
      <div className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{title}</div>
      <p className="mt-0.5 max-w-[240px] text-xs text-zinc-500">{text}</p>
    </div>
  );
}
