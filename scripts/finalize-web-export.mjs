// Post-processes `expo export --platform web` output for static hosting (GitHub Pages).
// Node-only, zero dependencies, cross-platform — GOTCHAS #8: the dev machine is
// PowerShell, so build steps must not rely on POSIX shell tools.
import { copyFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

async function main() {
  try {
    await access(DIST);
  } catch {
    console.error('finalize-web-export: dist/ not found — run `expo export --platform web` first.');
    process.exit(1);
  }

  // GitHub Pages runs Jekyll by default, which refuses to serve paths beginning with an
  // underscore. Every JS bundle lives under _expo/static/, so without this the app loads
  // an empty page with 404s on its own code.
  await writeFile(join(DIST, '.nojekyll'), '');

  // Static rendering emits one HTML file per known route, but a dynamic route can only be
  // emitted as the literal `task/[id].html`. A hard load of /task/<uuid> therefore 404s.
  // GitHub Pages serves 404.html for unmatched paths, so making it a copy of the shell
  // turns those into client-side route resolutions instead of dead ends.
  await copyFile(join(DIST, 'index.html'), join(DIST, '404.html'));

  console.log('finalize-web-export: wrote .nojekyll and 404.html');
}

await main();
