'use client';

import { useEffect } from 'react';

export default function StatusBarInit() {
  useEffect(() => {
    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch {
        // Not on native platform
      }
    })();
  }, []);

  return null;
}
