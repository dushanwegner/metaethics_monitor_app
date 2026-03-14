'use client';

import { useEffect, useRef, useState } from 'react';
import { TbMenu2 } from 'react-icons/tb';

export interface TabMenuItem {
  id: string;
  label: string;
  Icon?: React.ComponentType<{ size: number }>;
  badge?: string | number;
}

export interface TabMenuSection {
  title?: string;
  items: TabMenuItem[];
}

interface Props {
  sections: TabMenuSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Per-tab hamburger menu. Renders a trigger button (hamburger icon)
 * that opens a dropdown panel with grouped menu items.
 * Closes on item select or outside click.
 */
export default function TabMenu({ sections, activeId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="tab-menu" ref={ref}>
      <button
        className="tab-menu__trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Menu"
        aria-expanded={open}
      >
        <TbMenu2 size={20} />
      </button>

      {open && (
        <div className="tab-menu__panel">
          {sections.map((section, si) => (
            <div key={si} className="tab-menu__section">
              {section.title && (
                <div className="tab-menu__section-title">{section.title}</div>
              )}
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`tab-menu__item${item.id === activeId ? ' tab-menu__item--active' : ''}`}
                  onClick={() => { onSelect(item.id); setOpen(false); }}
                >
                  {item.Icon && <item.Icon size={16} />}
                  <span className="tab-menu__item-label">{item.label}</span>
                  {item.badge !== undefined && item.badge !== 0 && (
                    <span className="tab-menu__badge">{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
