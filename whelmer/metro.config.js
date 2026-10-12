const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Map node's punycode module to the installed polyfill package
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve('punycode/'),
};

module.exports = config;