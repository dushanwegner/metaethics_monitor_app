'use client';

import { TbNews, TbActivity, TbBook } from 'react-icons/tb';

export type TabId = 'news' | 'loop' | 'docs';

const TAB_STORAGE_KEY = 'app:activeTab';
const VALID_TABS: TabId[] = ['news', 'loop', 'docs'];

const ALL_TABS: { id: TabId; label: string; Icon: typeof TbNews }[] = [
  { id: 'news', label: 'News', Icon: TbNews },
  { id: 'loop', label: 'Loop', Icon: TbActivity },
  { id: 'docs', label: 'Docs', Icon: TbBook },
];

export function saveActiveTab(tab: TabId) {
  try { localStorage.setItem(TAB_STORAGE_KEY, tab); } catch {}
}

export function loadActiveTab(): TabId {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    if (raw && VALID_TABS.includes(raw as TabId)) return raw as TabId;
  } catch {}
  return 'loop';
}

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export default function TabBar({ active, onSelect }: Props) {
  return (
    <nav className="tab-bar">
      {ALL_TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`tab-bar__item${active === id ? ' tab-bar__item--active' : ''}`}
          onClick={() => onSelect(id)}
          aria-label={label}
        >
          <Icon size={22} />
          <span className="tab-bar__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
