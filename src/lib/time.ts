const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
const timeFmt = new Intl.DateTimeFormat('tr', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('tr', { day: 'numeric', month: 'short' });
const weekdayFmt = new Intl.DateTimeFormat('tr', { weekday: 'long' });
const fullFmt = new Intl.DateTimeFormat('tr', { dateStyle: 'full', timeStyle: 'short' });

export function relative(ts: number, now = Date.now()): string {
  const diff = ts - now;
  const abs = Math.abs(diff);
  if (abs < MIN) return diff >= 0 ? 'şimdi' : 'az önce';
  if (abs < HOUR) return rtf.format(Math.round(diff / MIN), 'minute');
  if (abs < 22 * HOUR) return rtf.format(Math.round(diff / HOUR), 'hour');
  if (abs < 7 * DAY) return rtf.format(Math.round(diff / DAY), 'day');
  return dayFmt.format(ts);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Bugün 14:30", "Yarın 09:00", "Cuma 18:00", "12 Kas 09:00" */
export function reminderLabel(ts: number, now = Date.now()): string {
  const dayDiff = Math.round((startOfDay(new Date(ts)) - startOfDay(new Date(now))) / DAY);
  const t = timeFmt.format(ts);
  if (dayDiff === 0) return `Bugün ${t}`;
  if (dayDiff === 1) return `Yarın ${t}`;
  if (dayDiff === -1) return `Dün ${t}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const w = weekdayFmt.format(ts);
    return `${w.charAt(0).toLocaleUpperCase('tr')}${w.slice(1)} ${t}`;
  }
  return `${dayFmt.format(ts)} ${t}`;
}

export function fullDate(ts: number): string {
  return fullFmt.format(ts);
}

export interface Preset {
  label: string;
  hint: string;
  value: number;
}

export function reminderPresets(now = new Date()): Preset[] {
  const at = (days: number, h: number, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const presets: Preset[] = [
    { label: '30 dakika sonra', hint: '', value: now.getTime() + 30 * MIN },
    { label: '1 saat sonra', hint: '', value: now.getTime() + HOUR },
    { label: '3 saat sonra', hint: '', value: now.getTime() + 3 * HOUR },
  ];
  if (now.getHours() < 19) presets.push({ label: 'Bu akşam', hint: '', value: at(0, 20) });
  presets.push({ label: 'Yarın sabah', hint: '', value: at(1, 9) });
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  presets.push({ label: 'Gelecek hafta', hint: '', value: at(daysToMonday, 9) });
  return presets.map((p) => ({ ...p, hint: reminderLabel(p.value, now.getTime()) }));
}

/** datetime-local input formatı: yyyy-MM-ddTHH:mm (yerel saat) */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
