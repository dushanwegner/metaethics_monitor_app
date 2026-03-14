"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

interface ScrollHeaderProps {
  expandedContent: React.ReactNode;
  condensedContent: React.ReactNode;
  threshold?: number; // Scroll distance before showing condensed header
  autoThreshold?: boolean; // If true, compute threshold from expanded header height and safe-top
  instant?: boolean; // If true, show/hide without fade/slide transition
  condensedClassName?: string; // Optional extra class for condensed header container
}

export default function ScrollHeader({
  expandedContent,
  condensedContent,
  threshold = 100,
  autoThreshold = false,
  instant = false,
  condensedClassName,
}: ScrollHeaderProps) {
  const [showCondensed, setShowCondensed] = useState(false);
  const expandedRef = useRef<HTMLDivElement | null>(null);
  const [autoThresholdValue, setAutoThresholdValue] = useState<number | null>(null);
  const ticking = useRef(false);

  const readSafeTopPx = () => {
    try {
      const root = document.documentElement;
      const raw = root ? getComputedStyle(root).getPropertyValue('--safe-top') : '';
      const fromVar = Number.parseFloat(raw || '0') || 0;
      if (fromVar > 0) return fromVar;

      // Fall back to reading env(safe-area-inset-top) via a probe element.
      const probe = document.createElement('div');
      probe.style.cssText =
        'position:fixed;top:0;left:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top, 0px)';
      document.body.appendChild(probe);
      const v = Number.parseFloat(getComputedStyle(probe).paddingTop || '0') || 0;
      probe.remove();
      return v;
    } catch {
      return 0;
    }
  };

  const effectiveThreshold = useMemo(() => {
    if (autoThreshold) return autoThresholdValue ?? threshold;
    return threshold;
  }, [autoThreshold, autoThresholdValue, threshold]);

  useEffect(() => {
    if (!autoThreshold) return;

    const compute = () => {
      const el = expandedRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const safeTopPx = readSafeTopPx();

      const next = Math.max(0, rect.height - safeTopPx);
      if (Number.isFinite(next)) {
        setAutoThresholdValue(next);
      }
    };

    const rafId = window.requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);

    // SafeAreaInit may set --safe-top shortly after mount.
    const t = window.setTimeout(compute, 250);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(t);
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [autoThreshold]);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          if (currentScrollY > effectiveThreshold) {
            setShowCondensed(true);
          } else {
            setShowCondensed(false);
          }
          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [effectiveThreshold]);

  return (
    <>
      {/* Expanded header - always in document flow */}
      <div ref={expandedRef} className="scroll-header-expanded">
        {expandedContent}
      </div>

      {/* Condensed sticky header - appears whenever the page is scrolled past the header */}
      <div
        className={`scroll-header-condensed ${instant ? 'scroll-header-condensed--instant' : ''} ${condensedClassName || ''} ${showCondensed ? 'visible' : ''}`.trim()}
        aria-hidden={!showCondensed}
      >
        {condensedContent}
      </div>
    </>
  );
}
