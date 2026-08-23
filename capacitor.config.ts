import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.simplesport.app',
    appName: 'SimpleSport',
    webDir: 'dist/simple-sport/browser',
    server: {
        androidScheme: 'https',
    },
    plugins: {
        Keyboard: {
            resizeOnFullScreen: true,
        },
    },
};

export default config;
