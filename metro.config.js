const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build runs SQLite as WebAssembly (wa-sqlite) inside a worker.
// Metro must treat .wasm as an asset or the worker's `import wasmModule from
// './wa-sqlite/wa-sqlite.wasm'` fails to resolve. Native platforms ignore this.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Lightweight discipline (§3): expo-router's default tab icons pull in a 956KB
// Material Symbols font. We supply our own inline SVG tabBarIcons everywhere,
// so resolve that package to an empty module and keep it out of the bundle.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@expo-google-fonts/material-symbols')) {
    return { type: 'empty' };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
