import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Prevent Vite preload errors from forcing automatic page reloads
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
});

if (import.meta.env.DEV) {
  // Ensure stale service workers or Workbox caches never interfere in dev mode (no auto-reload)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});
  }
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => keys.forEach((k) => caches.delete(k)))
      .catch(() => {});
  }
} else if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: false,
          onNeedReload() {
            // Never auto-reload the active page
          },
          onNeedRefresh() {
            // Never auto-reload the active page
          },
          onRegisterError(err) {
            console.warn('Service worker registration skipped:', err);
          },
        });
      })
      .catch(() => {});
  });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
