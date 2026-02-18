// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @libsql/client uses Node.js built-ins (node:buffer, libsql native module)
// which cannot run in React Native. We use expo-sqlite with useLibSQL:true instead.
// Alias it to an empty shim so Metro doesn't try to bundle it.
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@libsql/client': path.resolve(__dirname, 'lib/libsql-shim.js'),
};

module.exports = config;
