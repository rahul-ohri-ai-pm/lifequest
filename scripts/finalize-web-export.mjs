// Post-processes the Vite build for static hosting (GitHub Pages).
// Node-only, zero dependencies, cross-platform — GOTCHAS #8: the dev machine is
// PowerShell, so build steps must not rely on POSIX shell tools.
import { copyFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

async function main() {
  try {
    await access(DIST);
  } catch {
    console.error('finalize-web-export: dist/ not found — run `vite build` first.');
    process.exit(1);
  }

  // GitHub Pages runs Jekyll by default, which refuses to serve paths beginning with an
  // underscore. Vite's own output lives under assets/, but Jekyll also strips files it
  // doesn't recognise, so this stays as cheap insurance for anything copied from public/.
  await writeFile(join(DIST, '.nojekyll'), '');

  // The app is a single-page build: only index.html exists, so a hard load of a deep link
  // like /lifequest/task/<uuid> 404s. GitHub Pages serves 404.html for unmatched paths, so
  // making it a copy of the shell turns those into client-side route resolutions instead
  // of dead ends.
  await copyFile(join(DIST, 'index.html'), join(DIST, '404.html'));

  console.log('finalize-web-export: wrote .nojekyll and 404.html');
}

await main();
