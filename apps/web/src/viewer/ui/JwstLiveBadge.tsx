import { useEffect, useState } from "react";
import { Vector3 } from "three";

import { log } from "../../lib/logger";
import { useExtraLayerEnabled, useExtraLayersStore } from "../extra-layers/state";
import { fetchJwstStatus, type JwstStatus } from "../jwst-live/feed";
import type { ExtraLayersHost } from "./ExtraLayersPanel";

/**
 * 🔭 JwstLiveBadge — small top-bar pill showing "🔭 JWST: <target>"
 * when the JWST Live Pointing layer is active. Clicking the pill flies
 * the camera to the current target's RA/Dec.
 *
 * The badge enables the layer on first click — so even if the user
 * never opened the layers panel, the reticle appears on the sky.
 */

const LAYER_ID = "jwst-live";

type SceneFlyHost = ExtraLayersHost & {
  flyTo(dir: Vector3, durationMs?: number): void;
};

type Props = {
  scene: SceneFlyHost | null;
};

export function JwstLiveBadge({ scene }: Props) {
  const enabled = useExtraLayerEnabled(LAYER_ID);
  const [status, setStatus] = useState<JwstStatus | null>(null);

  // Always show whatever cached/live data we can pull — the badge is
  // informational even when the reticle layer is off.
  useEffect(() => {
    let cancelled = false;
    void fetchJwstStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    const id = window.setInterval(() => {
      void fetchJwstStatus(true).then((s) => {
        if (!cancelled) setStatus(s);
      });
    }, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const target = status?.current?.target ?? status?.next?.target ?? null;
  const raDeg =
    typeof status?.current?.raDeg === "number"
      ? status.current.raDeg
      : typeof status?.next?.raDeg === "number"
        ? status.next.raDeg
        : null;
  const decDeg =
    typeof status?.current?.decDeg === "number"
      ? status.current.decDeg
      : typeof status?.next?.decDeg === "number"
        ? status.next.decDeg
        : null;

  if (!target) return null;

  const onClick = () => {
    // Enable the layer if it isn't already so the reticle renders.
    if (!enabled) {
      try {
        useExtraLayersStore.getState().set(LAYER_ID, true);
      } catch (err) {
        log.warn("[jwst-live] enable failed", err);
      }
    }
    if (scene && raDeg !== null && decDeg !== null) {
      const raRad = (raDeg * Math.PI) / 180;
      const decRad = (decDeg * Math.PI) / 180;
      const cdec = Math.cos(decRad);
      const x = cdec * Math.cos(raRad);
      const y = cdec * Math.sin(raRad);
      const z = Math.sin(decRad);
      // Z-up → Y-up rotation matches the rest of the sky frame.
      scene.flyTo(new Vector3(x, z, -y).normalize(), 1200);
    }
  };

  const pretty = target.replace(/-+/g, " ").trim();
  const label = status?.current ? `JWST: ${pretty}` : `JWST next: ${pretty}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — click to fly to coordinates`}
      aria-label={label}
      className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-cyan-300/40 bg-cyan-300/10 px-2 text-[12px] text-cyan-100 backdrop-blur transition hover:bg-cyan-300/20"
    >
      <span aria-hidden>🔭</span>
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}
