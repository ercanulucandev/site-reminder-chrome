import type { Item } from './types';

export interface PageInfo {
  host: string;
  pageKey: string;
  cleanUrl: string;
}

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_|igshid$|ref_src$)/i;

export function parsePage(raw?: string | null): PageInfo | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
  }
  const host = u.hostname.replace(/^www\./, '');
  let path = u.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const search = u.searchParams.toString();
  return {
    host,
    pageKey: host + path + (search ? `?${search}` : ''),
    cleanUrl: u.toString(),
  };
}

/** Bir sayfada görünmesi gereken öğeler: site geneli olanlar + bu sayfaya özel olanlar */
export function itemsForPage(items: Item[], page: PageInfo): Item[] {
  return items.filter(
    (i) => i.host === page.host && (i.scope === 'domain' || i.pageKey === page.pageKey),
  );
}

export function faviconUrl(pageUrl: string, size = 32): string {
  return chrome.runtime.getURL(
    `/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`,
  );
}
