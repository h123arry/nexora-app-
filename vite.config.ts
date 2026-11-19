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
          manualChunks(id) {
            if (id.includes('node_modules/firebase/app/') || id.includes('node_modules/@firebase/app/')) return 'firebase-app';
            if (id.includes('node_modules/firebase/auth/') || id.includes('node_modules/@firebase/auth/')) return 'firebase-auth';
            if (id.includes('node_modules/firebase/firestore/') || id.includes('node_modules/@firebase/firestore/')) return 'firebase-firestore';
            if (id.includes('node_modules/firebase/functions/') || id.includes('node_modules/@firebase/functions/')) return 'firebase-functions';
            if (id.includes('node_modules/firebase/messaging/') || id.includes('node_modules/@firebase/messaging/')) return 'firebase-messaging';
            if (id.includes('node_modules/firebase/storage/') || id.includes('node_modules/@firebase/storage/')) return 'firebase-storage';
            if (id.includes('node_modules/firebase/app-check/') || id.includes('node_modules/@firebase/app-check/')) return 'firebase-app-check';
            if (id.includes('node_modules/motion/') || id.includes('node_modules/framer-motion/')) return 'motion';
            if (id.includes('node_modules/lucide-react/')) return 'icons';
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
