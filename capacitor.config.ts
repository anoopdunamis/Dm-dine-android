import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amplifyapp.d1u6lsw4w5p1dc.main.twa',
  appName: 'Dyna-Menu Waiter',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a'
    }
  }
};

export default config;