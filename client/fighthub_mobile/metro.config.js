const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

// Keep this if you need it for some packages
config.resolver.sourceExts.push("cjs");

// Leave package exports ON. Turning it off can cause wrong entry resolution.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
