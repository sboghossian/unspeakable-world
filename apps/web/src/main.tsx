import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { getConsent } from "./lib/consent";
import { initErrorTracking } from "./lib/error-tracking";
import { getSettings, onSettingsChange } from "./lib/settings";
import { initTelemetry } from "./lib/telemetry";
import "./styles.css";

// Init observability layers before React mounts. Both are designed
// to be cheap no-ops when their env vars are empty — see
// `lib/telemetry.ts` and `lib/error-tracking.ts`.
initErrorTracking();
initTelemetry({ optOut: !getConsent()?.telemetry });

// Apply the persisted display-font preference to <html data-font="…">
// before React mounts so first paint doesn't flash the default face.
// Subsequent changes flow via onSettingsChange so the picker updates
// the whole tree without a remount.
(function applyDisplayFont() {
  try {
    const root = document.documentElement;
    root.setAttribute("data-font", getSettings().displayFont);
    onSettingsChange((s) => {
      root.setAttribute("data-font", s.displayFont);
    });
  } catch {
    /* ignore — SSR / very old browsers */
  }
})();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
