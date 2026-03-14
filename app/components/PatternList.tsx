'use client';

import type { Pattern } from '../lib/types';

interface Props {
  patterns: Pattern[];
  selectedId: number | null;
  onSelect: (pattern: Pattern | null) => void;
}

export default function PatternList({ patterns, selectedId, onSelect }: Props) {
  if (patterns.length === 0) return null;

  return (
    <div className="pattern-list">
      {patterns.map((p) => (
        <button
          key={p.id}
          className={`pattern-list__btn${selectedId === p.id ? ' pattern-list__btn--active' : ''}`}
          onClick={() => onSelect(selectedId === p.id ? null : p)}
        >
          {p.pattern_display}
        </button>
      ))}
    </div>
  );
}
