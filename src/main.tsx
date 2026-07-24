import './polyfill.ts';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {FirebaseProvider} from './context/FirebaseContext.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';

console.log("🔥 APP BOOT STARTING...");

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered');
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failure:', error);
      });
  });
}

console.log("🔥 Rendering root...");
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FirebaseProvider>
        <App />
      </FirebaseProvider>
    </ErrorBoundary>
  </StrictMode>,
);
console.log("🔥 Render called.");
