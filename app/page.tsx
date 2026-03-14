'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TabBar, { type TabId, loadActiveTab, saveActiveTab } from './components/TabBar';
import ArticlesTab from './tabs/ArticlesTab';
import LoopLogTab from './tabs/LoopLogTab';
import DocsTab from './tabs/DocsTab';

const DEFAULT_TAB: TabId = 'articles';

const TABS: { id: TabId; Component: React.ComponentType }[] = [
  { id: 'articles', Component: ArticlesTab },
  { id: 'loop', Component: LoopLogTab },
  { id: 'docs', Component: DocsTab },
];

export default function HomePage() {
  // Always start with the default tab (avoids SSR hydration mismatch),
  // then restore the saved tab on the client after mount.
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const saved = loadActiveTab();
      if (saved !== DEFAULT_TAB) setActiveTab(saved);
    }
  }, []);

  // Track which tabs have been visited — only mount those.
  // Once visited, a tab stays mounted so its state persists.
  const visitedRef = useRef<Set<TabId>>(new Set([activeTab]));

  const selectTab = useCallback((tab: TabId) => {
    visitedRef.current.add(tab);
    setActiveTab(tab);
    saveActiveTab(tab);
  }, []);

  return (
    <>
      {TABS.map(({ id, Component }) => {
        if (!visitedRef.current.has(id)) return null;
        return (
          <div key={id} style={{ display: id === activeTab ? 'contents' : 'none' }}>
            <Component />
          </div>
        );
      })}
      <TabBar active={activeTab} onSelect={selectTab} />
    </>
  );
}
