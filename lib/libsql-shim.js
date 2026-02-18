// This is an empty shim for @libsql/client.
// In this app, all database access goes through expo-sqlite (with useLibSQL:true in app.json).
// @libsql/client uses Node.js built-ins that cannot run in React Native's JS runtime.
module.exports = {};
