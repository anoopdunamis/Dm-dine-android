import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: './runtimeConfig',
        replacement: './runtimeConfig.browser',
      },
    ]
  },
  build: {
    // Specify the output directory for Amplify Hosting (commonly 'build' or 'dist')
    outDir: 'dist', 
  }
});

