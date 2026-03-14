import type { CapacitorConfig } from '@capacitor/cli';

// Live reload: set LIVE_RELOAD=1 to load from Next.js dev server instead of
// static files. Uses LAN IP so both simulator and physical devices can connect.
// Usage: LIVE_RELOAD=1 npx cap copy ios   (then run from Xcode)
const liveReloadUrl = process.env.LIVE_RELOAD
  ? `http://${process.env.DEV_IP || 'localhost'}:3000`
  : undefined;

const config: CapacitorConfig = {
  appId: 'com.metaethics.app',
  appName: 'Metaethics',
  webDir: 'out',
  server: liveReloadUrl
    ? { url: liveReloadUrl, cleartext: true }
    : undefined,
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F172A',
      showSpinner: false
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#0F172A'
    }
  }
};

export default config;
