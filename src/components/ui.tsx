import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { faviconUrl } from '../lib/url';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors',
        'hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'outline' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:pointer-events-none disabled:opacity-40',
        variant === 'primary' &&
          'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500',
        variant === 'ghost' &&
          'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
        variant === 'outline' &&
          'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
        variant === 'danger' && 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50',
        className,
      )}
      {...props}
    />
  );
}

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex rounded-xl bg-zinc-100 p-0.5 dark:bg-zinc-900',
        size === 'md' ? 'gap-0.5' : 'gap-0',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] font-medium transition-all',
              size === 'md' ? 'h-8 px-3 text-[13px]' : 'h-6 px-2 text-xs',
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            {o.icon}
            {o.label}
            {o.count !== undefined && o.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums',
                  active
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                    : 'bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

type Tone = 'neutral' | 'indigo' | 'red' | 'amber' | 'green';

export function Chip({
  tone = 'neutral',
  children,
  title,
  onClick,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4',
        tone === 'neutral' && 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400',
        tone === 'indigo' && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
        tone === 'red' && 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        tone === 'amber' && 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        tone === 'green' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        onClick && 'hover:brightness-95 dark:hover:brightness-125',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Tetikleyiciye göre konumlanan basit açılır kutu; alta sığmazsa yukarı açılır. */
export function Popover({
  open,
  onClose,
  anchor,
  children,
  align = 'end',
  width = 248,
}: {
  open: boolean;
  onClose: () => void;
  anchor: HTMLElement | null;
  children: ReactNode;
  align?: 'start' | 'end';
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const h = ref.current?.offsetHeight ?? 300;
    const below = r.bottom + 6;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below;
    let left = align === 'end' ? r.right - width : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    setPos({ top, left });
  }, [open, anchor, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
      className="animate-pop-in fixed z-50 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40"
    >
      {children}
    </div>
  );
}

export function Favicon({ url, size = 16, className }: { url: string; size?: number; className?: string }) {
  return (
    <img
      src={faviconUrl(url, size * 2)}
      width={size}
      height={size}
      alt=""
      className={cn('shrink-0 rounded-sm', className)}
    />
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 font-sans text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
      {children}
    </kbd>
  );
}
