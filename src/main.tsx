import './polyfill.ts';
import { isNativeRuntime } from './lib/nativeRuntime';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/nexora-midnight-luxury.css';
import {FirebaseProvider} from './context/FirebaseContext.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';

// Register the PWA worker only for production builds so local development is
// not served stale cached application assets.
if (import.meta.env.PROD && !isNativeRuntime() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let updateRegistration: ServiceWorkerRegistration | null = null;
    let applyingUpdate = false;
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        updateRegistration = registration;
        const announceWaitingWorker = () => {
          if (registration.waiting) {
            window.dispatchEvent(new CustomEvent('nexora-sw-update-ready'));
          }
        };
        announceWaitingWorker();
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announceWaitingWorker();
          });
        });
      })
      .catch(() => undefined);

    window.addEventListener('nexora-apply-sw-update', () => {
      if (!updateRegistration?.waiting) return;
      applyingUpdate = true;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (applyingUpdate) window.location.reload();
      }, { once: true });
      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  });
}

// Recover once from a stale/missing lazy-loaded chunk instead of leaving startup stuck.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    try {
      const key = 'nexora_chunk_recovery_at';
      const previous = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - previous > 30000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FirebaseProvider>
        <App />
      </FirebaseProvider>
    </ErrorBoundary>
  </StrictMode>,
);
