import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { getConsent } from "./lib/consent";
import { initErrorTracking } from "./lib/error-tracking";
import { initTelemetry } from "./lib/telemetry";
import "./styles.css";

// Init observability layers before React mounts. Both are designed
// to be cheap no-ops when their env vars are empty — see
// `lib/telemetry.ts` and `lib/error-tracking.ts`.
initErrorTracking();
initTelemetry({ optOut: !getConsent()?.telemetry });

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
