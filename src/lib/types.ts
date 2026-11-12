export type Kind = 'todo' | 'note';
/** domain: sitenin tamamı (ör. github.com), page: yalnızca o sayfa */
export type Scope = 'domain' | 'page';
export type Priority = 'low' | 'normal' | 'high';
export type ThemePref = 'system' | 'light' | 'dark';

export interface Item {
  id: string;
  kind: Kind;
  text: string;
  done: boolean;
  priority: Priority;
  tags: string[];
  scope: Scope;
  /** www. olmadan hostname */
  host: string;
  /** host + path + (temizlenmiş) query; sayfa eşleştirmesi için */
  pageKey: string;
  url: string;
  pageTitle: string;
  remindAt: number | null;
  reminded: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface Settings {
  theme: ThemePref;
  defaultScope: Scope;
  snoozeMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultScope: 'domain',
  snoozeMinutes: 10,
};
