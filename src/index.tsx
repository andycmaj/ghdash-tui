// Entry point for ghdash TUI

import { render } from "@opentui/solid";
import { ErrorBoundary } from "solid-js";
import { App } from "./app";
import { ErrorFallback } from "./components/error-fallback";
import { ConsolePosition } from "@opentui/core";
import { parseCLI } from "./cli";
import { setGlobalRenderer, getGlobalRenderer } from "./global-renderer";
import { loadUserSettings } from "./config/user-settings";

const config = await parseCLI();
const userSettings = await loadUserSettings();

const pollMs = config.pollMs ?? userSettings.pollIntervalMs;

// Process-level error handlers for unrecoverable errors
function emergencyExit(error: unknown, source: string) {
  console.error(`[${source}]`, error);
  const renderer = getGlobalRenderer();
  if (renderer) {
    try {
      renderer.destroy();
    } catch {
      // Ignore cleanup errors during emergency exit
    }
  }
  process.exit(1);
}

process.on("uncaughtException", (error) => {
  emergencyExit(error, "uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  emergencyExit(reason, "unhandledRejection");
});

function RootApp() {
  return (
    <ErrorBoundary
      fallback={(err, reset) => <ErrorFallback error={err} reset={reset} />}
    >
      <App
        theme={userSettings.theme}
        pollMs={pollMs}
        tokenOverride={userSettings.githubToken}
        prSpec={config.prSpec}
      />
    </ErrorBoundary>
  );
}

render(RootApp, {
  targetFps: 30,
  exitOnCtrlC: false,
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    startInDebugMode: true,
  },
  onDestroy: () => {
    setGlobalRenderer(null);
  },
});
