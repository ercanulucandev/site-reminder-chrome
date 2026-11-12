import { Bell, BellRing, Check, FileText, Globe, Pencil, StickyNote, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNow } from '../lib/hooks';
import { updateItem } from '../lib/storage';
import { fullDate, relative, reminderLabel } from '../lib/time';
import type { Item } from '../lib/types';
import { ReminderMenu } from './ReminderMenu';
import { Chip, cn, IconButton } from './ui';

const TOKEN_RE = /(https?:\/\/[^\s]+|#[\p{L}\p{N}_-]+)/gu;

function renderText(text: string): ReactNode[] {
  return text.split(TOKEN_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith('#')) {
      return (
        <span key={i} className="font-medium text-indigo-600 dark:text-indigo-400">
          {part}
        </span>
      );
    }
    return (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="break-all text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-600 dark:text-indigo-400"
      >
        {part}
      </a>
    );
  });
}

export function ItemRow({
  item,
  onDelete,
  context = 'site',
}: {
  item: Item;
  onDelete: (item: Item) => void;
  context?: 'site' | 'dashboard';
}) {
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = editRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  useEffect(() => {
    const el = editRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  const cancelled = useRef(false);
  const startEdit = () => {
    cancelled.current = false;
    setDraft(item.text);
    setEditing(true);
  };
  const save = () => {
    if (!editing || cancelled.current) return;
    const t = draft.trim();
    setEditing(false);
    if (!t) return onDelete(item);
    if (t !== item.text) void updateItem(item.id, { text: t });
  };

  const isTodo = item.kind === 'todo';
  const overdue = item.remindAt != null && !item.done && item.remindAt <= now;
  const long = !isTodo && (item.text.length > 220 || item.text.split('\n').length > 4);

  return (
    <div
      className={cn(
        'group relative flex gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
        menuOpen && 'bg-zinc-50 dark:bg-zinc-900/60',
      )}
    >
      {isTodo ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={item.done}
          aria-label={item.done ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
          onClick={() => void updateItem(item.id, { done: !item.done })}
          className={cn(
            'mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
            item.done
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : item.priority === 'high'
                ? 'border-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                : item.priority === 'low'
                  ? 'border-sky-300 hover:bg-sky-50 dark:border-sky-700 dark:hover:bg-sky-500/10'
                  : 'border-zinc-300 hover:border-indigo-400 hover:bg-indigo-50 dark:border-zinc-600 dark:hover:bg-indigo-500/10',
          )}
        >
          {item.done && <Check size={11} strokeWidth={3} />}
        </button>
      ) : (
        <StickyNote size={16} className="mt-[2px] shrink-0 text-amber-500" />
      )}

      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            ref={editRef}
            value={draft}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                cancelled.current = true;
                setEditing(false);
              } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (isTodo && !e.shiftKey))) {
                e.preventDefault();
                save();
              }
            }}
            className="-mx-1 -my-0.5 block w-[calc(100%+0.5rem)] resize-none rounded-md bg-white px-1 py-0.5 text-sm leading-relaxed ring-2 ring-indigo-500/40 focus:outline-none dark:bg-zinc-900"
          />
        ) : (
          <p
            onDoubleClick={startEdit}
            className={cn(
              'whitespace-pre-wrap break-words text-sm leading-relaxed',
              item.done && 'text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500 dark:decoration-zinc-600',
              long && !expanded && 'line-clamp-4',
            )}
          >
            {renderText(item.text)}
          </p>
        )}
        {long && !editing && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {expanded ? 'Daha az göster' : 'Devamını göster'}
          </button>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1 empty:hidden">
          {item.remindAt != null && !(item.done && isTodo) && (
            <Chip
              tone={overdue && isTodo ? 'red' : item.reminded ? 'neutral' : 'indigo'}
              title={fullDate(item.remindAt)}
            >
              {overdue && isTodo ? <BellRing size={11} /> : <Bell size={11} />}
              {reminderLabel(item.remindAt, now)}
              <span className="opacity-60">· {relative(item.remindAt, now)}</span>
            </Chip>
          )}
          {isTodo && !item.done && item.priority === 'high' && <Chip tone="red">Yüksek</Chip>}
          {isTodo && !item.done && item.priority === 'low' && <Chip>Düşük</Chip>}
          {context === 'site' && item.scope === 'page' && (
            <Chip title={item.url}>
              <FileText size={11} />
              Bu sayfa
            </Chip>
          )}
          {context === 'dashboard' &&
            (item.scope === 'page' ? (
              <Chip title={item.url} onClick={() => chrome.tabs.create({ url: item.url })}>
                <FileText size={11} />
                <span className="truncate">{item.pageTitle || item.pageKey}</span>
              </Chip>
            ) : (
              <Chip>
                <Globe size={11} />
                Site geneli
              </Chip>
            ))}
          {(!isTodo || item.done) && (
            <span className="text-[11px] text-zinc-400" title={fullDate(item.updatedAt)}>
              {item.done && item.completedAt ? `${relative(item.completedAt, now)} tamamlandı` : relative(item.updatedAt, now)}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          'flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100',
          menuOpen && 'opacity-100',
        )}
      >
        {!item.done && (
          <ReminderMenu
            value={item.remindAt}
            onChange={(ts) => void updateItem(item.id, { remindAt: ts })}
            onOpenChange={setMenuOpen}
            triggerClassName="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            trigger={<Bell size={14} />}
          />
        )}
        <IconButton label="Düzenle" onClick={startEdit} className="hover:bg-zinc-200/70">
          <Pencil size={14} />
        </IconButton>
        <IconButton
          label="Sil"
          onClick={() => onDelete(item)}
          className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
        >
          <Trash2 size={14} />
        </IconButton>
      </div>
    </div>
  );
}
