const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
