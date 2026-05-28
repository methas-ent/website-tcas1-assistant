// Explicit entry for monorepo workspace (Metro resolves `main: expo-router/entry`
// to the wrong root path when expo is hoisted; this local file pins the entry
// to apps/mobile so AppEntry.js fallback doesn't try to import App from workspace root).
import "expo-router/entry";
