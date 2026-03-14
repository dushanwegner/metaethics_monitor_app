'use client';

import { useState } from 'react';
import { TbAdjustments } from 'react-icons/tb';
import type { ModuleDefinition } from './types';

interface Props {
  modules: ModuleDefinition[];
  isEnabled: (id: string) => boolean;
  toggle: (id: string) => void;
}

export default function ModuleToggles({ modules, isEnabled, toggle }: Props) {
  const [open, setOpen] = useState(false);

  if (modules.length === 0) return null;

  return (
    <div className="module-toggles">
      <button
        className="module-toggles__trigger"
        onClick={() => setOpen(!open)}
        aria-label="Module settings"
      >
        <TbAdjustments size={18} />
      </button>

      {open && (
        <div className="module-toggles__panel">
          {modules.map((mod) => (
            <button
              key={mod.id}
              className={`module-toggles__item${isEnabled(mod.id) ? ' module-toggles__item--active' : ''}`}
              onClick={() => toggle(mod.id)}
            >
              {mod.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
