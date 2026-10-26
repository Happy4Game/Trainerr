import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.trainerr.app',
  appName: 'Trainerr',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
