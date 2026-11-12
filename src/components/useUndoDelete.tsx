import { Undo2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { removeItem, restoreItem } from '../lib/storage';
import type { Item } from '../lib/types';

/** Silme + "Geri al" bildirimi */
export function useUndoDelete() {
  const [deleted, setDeleted] = useState<Item | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const deleteItem = useCallback((item: Item) => {
    void removeItem(item.id);
    setDeleted(item);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDeleted(null), 5000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const toast = deleted ? (
    <div
      role="status"
      className="animate-slide-up fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-zinc-900 py-2 pl-4 pr-2 text-[13px] text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-900"
    >
      {deleted.kind === 'todo' ? 'Görev silindi' : 'Not silindi'}
      <button
        type="button"
        onClick={() => {
          void restoreItem(deleted);
          setDeleted(null);
        }}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-indigo-300 hover:bg-white/10 dark:text-indigo-600 dark:hover:bg-black/5"
      >
        <Undo2 size={14} />
        Geri al
      </button>
    </div>
  ) : null;

  return { deleteItem, toast };
}
