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
    const hadController = Boolean(navigator.serviceWorker?.controller);
    let reloadedForNewSw = false;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !reloadedForNewSw) {
          reloadedForNewSw = true;
          window.location.reload();
        }
      });
    }

    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            void updateSW(true);
          },
          onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            void registration.update().catch(() => {});
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                void registration.update().catch(() => {});
              }
            });
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
