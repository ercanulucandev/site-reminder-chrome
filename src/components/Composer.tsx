import { Bell, FileText, Flag, Globe, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { addItem } from '../lib/storage';
import { reminderLabel } from '../lib/time';
import type { Kind, Priority, Scope } from '../lib/types';
import { ReminderMenu } from './ReminderMenu';
import { Button, cn, Kbd, Segmented } from './ui';

const PRIORITY_NEXT: Record<Priority, Priority> = { normal: 'high', high: 'low', low: 'normal' };
const PRIORITY_LABEL: Record<Priority, string> = {
  normal: 'Öncelik: normal',
  high: 'Öncelik: yüksek',
  low: 'Öncelik: düşük',
};

export function Composer({
  kind,
  url,
  pageTitle,
  defaultScope,
}: {
  kind: Kind;
  url: string;
  pageTitle: string;
  defaultScope: Scope;
}) {
  const [text, setText] = useState('');
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [priority, setPriority] = useState<Priority>('normal');
  const [remindAt, setRemindAt] = useState<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setScope(defaultScope), [defaultScope]);
  useEffect(() => ref.current?.focus(), [kind]);

  // içerik kadar uzayan textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text, kind]);

  const submit = async () => {
    if (!text.trim()) return;
    await addItem({ kind, text, scope, url, pageTitle, priority, remindAt });
    setText('');
    setPriority('normal');
    setRemindAt(null);
    ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    const modifier = e.ctrlKey || e.metaKey;
    if ((kind === 'todo' && !e.shiftKey) || modifier) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow focus-within:border-indigo-300 focus-within:shadow-md focus-within:shadow-indigo-500/5 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-indigo-500/50">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={kind === 'note' ? 3 : 1}
        placeholder={kind === 'todo' ? 'Yeni görev ekle… (#etiket kullanabilirsin)' : 'Bu site hakkında bir not yaz…'}
        className="block w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-sm leading-relaxed placeholder:text-zinc-400 focus:outline-none dark:placeholder:text-zinc-500"
      />
      <div className="flex items-center gap-1 px-2 pb-2">
        <Segmented
          size="sm"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'domain', label: 'Site', icon: <Globe size={12} /> },
            { value: 'page', label: 'Sayfa', icon: <FileText size={12} /> },
          ]}
        />
        {kind === 'todo' && (
          <button
            type="button"
            title={PRIORITY_LABEL[priority]}
            aria-label={PRIORITY_LABEL[priority]}
            onClick={() => setPriority(PRIORITY_NEXT[priority])}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
              priority === 'high' && 'text-red-500',
              priority === 'normal' && 'text-zinc-400',
              priority === 'low' && 'text-sky-500',
            )}
          >
            <Flag size={14} fill={priority === 'normal' ? 'none' : 'currentColor'} />
          </button>
        )}
        <ReminderMenu
          value={remindAt}
          onChange={setRemindAt}
          triggerClassName={cn(
            'inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800',
            remindAt ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400',
          )}
          trigger={
            <>
              <Bell size={14} fill={remindAt ? 'currentColor' : 'none'} />
              {remindAt && reminderLabel(remindAt)}
            </>
          }
        />
        <div className="flex-1" />
        <span className="hidden items-center gap-1 text-[11px] text-zinc-400 min-[360px]:flex">
          {kind === 'note' && <Kbd>Ctrl</Kbd>}
          <Kbd>Enter</Kbd>
        </span>
        <Button className="h-7 w-7 px-0" onClick={submit} disabled={!text.trim()} aria-label="Ekle" title="Ekle">
          <Plus size={16} />
        </Button>
      </div>
    </div>
  );
}
