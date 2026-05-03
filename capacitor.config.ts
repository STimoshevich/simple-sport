import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simplesport.app',
  appName: 'SimpleSport',
  webDir: 'dist/simple-sport/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
