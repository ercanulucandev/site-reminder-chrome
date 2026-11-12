import { Bell, BellOff, CalendarClock } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { reminderPresets, toLocalInput } from '../lib/time';
import { Button, cn, Popover } from './ui';

export function ReminderMenu({
  value,
  onChange,
  trigger,
  triggerClassName,
  label = 'Hatırlatıcı',
  onOpenChange,
}: {
  value: number | null;
  onChange: (ts: number | null) => void;
  trigger: ReactNode;
  triggerClassName?: string;
  label?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [custom, setCustom] = useState('');

  const setOpen = useCallback(
    (o: boolean) => {
      setOpenState(o);
      onOpenChange?.(o);
      if (o) setCustom(toLocalInput(value ?? Date.now() + 60 * 60_000));
    },
    [onOpenChange, value],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);

  const pick = (ts: number | null) => {
    onChange(ts);
    close();
  };

  const customTs = custom ? new Date(custom).getTime() : NaN;
  const customValid = Number.isFinite(customTs) && customTs > Date.now();

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen(!open)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <Popover open={open} onClose={close} anchor={anchor}>
        <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Hatırlat
        </div>
        {open &&
          reminderPresets().map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => pick(p.value)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="flex items-center gap-2">
                <Bell size={14} className="text-zinc-400" />
                {p.label}
              </span>
              <span className="text-xs text-zinc-400">{p.hint}</span>
            </button>
          ))}
        <div className="my-1.5 h-px bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5 px-1 pb-1">
          <CalendarClock size={14} className="ml-1 shrink-0 text-zinc-400" />
          <input
            type="datetime-local"
            value={custom}
            min={toLocalInput(Date.now())}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && customValid && pick(customTs)}
            className={cn(
              'h-8 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-transparent px-2 text-xs',
              'focus:border-indigo-500 focus:outline-none dark:border-zinc-700',
            )}
          />
          <Button className="h-8 px-2.5" disabled={!customValid} onClick={() => pick(customTs)}>
            Ayarla
          </Button>
        </div>
        {value != null && (
          <button
            type="button"
            onClick={() => pick(null)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <BellOff size={14} />
            Hatırlatıcıyı kaldır
          </button>
        )}
      </Popover>
    </>
  );
}
