import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'globalThis.__NEXORA_APPCHECK_SITE_KEY__': JSON.stringify(process.env.VITE_FIREBASE_APPCHECK_SITE_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Keep long-lived third-party code cacheable independently from the
          // application shell and route chunks. This does not claim fewer
          // total bytes; it avoids invalidating vendor code on app changes.
          manualChunks: {
            firebase: [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/functions',
              'firebase/messaging',
              'firebase/storage',
            ],
            motion: ['motion'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      // Manus previews arrive through a forwarded *.us3.manus.computer host.
      // Keep the allowlist scoped to that preview domain instead of disabling
      // Vite host protection globally.
      allowedHosts: ['.us3.manus.computer'],
      // HMR is disabled via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
