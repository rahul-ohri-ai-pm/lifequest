import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

// Offline-first (§2): the service worker caches the shell so the installed PWA keeps
// launching with the radio off. It no longer has to inject COOP/COEP headers — the
// SQLite build now uses the opfs-sahpool VFS, which needs no cross-origin isolation.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        /* Blocked in private mode or on an insecure origin. The app still runs; it just
           won't launch offline. Nothing to recover here. */
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
