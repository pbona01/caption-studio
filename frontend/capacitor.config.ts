import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.captionstudio.app',
  appName: 'Caption Studio',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
};

export default config;
