const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable SEA (Single Executable Application) support to fix Node.js v24 compatibility issue
config.resolver = config.resolver || {};
config.resolver.enableGlobalPackages = true;

module.exports = config;
