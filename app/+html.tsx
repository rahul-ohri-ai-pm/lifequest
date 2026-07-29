// Web-only document shell. Expo Router renders this around every web page at export
// time; it never reaches the native bundle. Everything here is either PWA metadata
// (so the app installs to a phone home screen and launches chromeless) or the service
// worker registration that makes SQLite-wasm possible on a static host — see public/sw.js.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { colors } from '../src/constants/theme';

// app.json sets experiments.baseUrl because GitHub Pages serves project sites from a
// subpath (/lifequest/). Expo injects it here at export time; '' is correct for a
// root-hosted deploy and for the local dev server.
const BASE_PATH = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

// Registering the worker is what grants this page COOP/COEP, and a page can only be
// cross-origin isolated from its *first* byte — so the very first visit has to reload
// once, after the worker takes control. `controllerchange` fires exactly then (the
// worker calls clients.claim), and does not fire on later visits because the page is
// already controlled when it loads. No reload loop, no polling.
const REGISTER_SERVICE_WORKER = `
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (!navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      window.location.reload();
    });
  }
  navigator.serviceWorker
    .register('${BASE_PATH}/sw.js', { scope: '${BASE_PATH}/' })
    .catch(function () {
      /* Registration blocked (private mode, insecure origin). The DB error screen
         explains what to do — nothing to recover here. */
    });
})();
`;

// Paint the app background before React mounts, so a cold launch on a dark UI never
// flashes white. Also stops the whole-document rubber-band scroll: the app manages
// its own scroll views (§5 is a fixed-viewport, app-like layout).
const RESET_STYLES = `
html, body, #root {
  background-color: ${colors.background};
  color-scheme: dark;
}
body {
  margin: 0;
  overscroll-behavior-y: none;
}
#root {
  display: flex;
  min-height: 100%;
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <title>LifeQuest</title>
        <meta name="theme-color" content={colors.background} />
        <meta name="description" content="Offline-first gamified daily task tracker." />
        <link rel="manifest" href={`${BASE_PATH}/manifest.webmanifest`} />

        {/* iOS ignores the manifest for home-screen launches and reads these instead. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LifeQuest" />
        <link rel="apple-touch-icon" href={`${BASE_PATH}/apple-touch-icon.png`} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: RESET_STYLES }} />
        <script dangerouslySetInnerHTML={{ __html: REGISTER_SERVICE_WORKER }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
