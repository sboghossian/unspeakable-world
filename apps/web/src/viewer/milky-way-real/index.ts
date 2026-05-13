/**
 * milky-way-real — federation module rendering hand-curated HII regions
 * and OB associations inside the galactic-mode scene.
 *
 * This is a SCAFFOLD. v1 ships 20 famous HII regions and 10 famous OB
 * associations as a starter dataset. Phase 2 will swap the data files
 * for the full WISE Galactic HII Region catalog (Anderson+ 2014,
 * ~8000 objects) and the Wright+ 2020 Gaia DR2 OB-association atlas.
 *
 * See `apps/web/src/viewer/milky-way-real/README.md` for the upgrade
 * path.
 */
import type { Group } from "three";
import { log } from "../../lib/logger";
import { MilkyWayField } from "./mw-field";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "milky-way-real",
  label: "Milky Way structure (HII + OB)",
  icon: "🌀",
  attribution:
    "Curated from SIMBAD, Sharpless 1959, Anderson+ 2014 (WISE HII), Wright+ 2020 (OB associations) — CC0",
  modes: ["galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "Famous HII regions (red H-alpha glow) and OB associations (blue clusters) in the Milky Way's galactic frame. Curated starter set — full WISE / Gaia DR2 catalogs in Phase 2.",
  synthetic: false,
} as const;

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  dispose(): void;
};

type HiiPoint = {
  id: string;
  name: string;
  l: number;
  b: number;
  distKpc: number;
  sizePc: number;
};
type ObPoint = HiiPoint;

type HiiJson = { regions?: unknown };
type ObJson = { associations?: unknown };

function parsePoints(raw: unknown, key: "regions" | "associations"): HiiPoint[] {
  const wrapper = raw as HiiJson & ObJson;
  const list = key === "regions" ? wrapper.regions : wrapper.associations;
  if (!Array.isArray(list)) return [];
  const out: HiiPoint[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e["id"] === "string" ? e["id"] : null;
    const name = typeof e["name"] === "string" ? e["name"] : null;
    const l = typeof e["l"] === "number" ? e["l"] : null;
    const b = typeof e["b"] === "number" ? e["b"] : null;
    const distKpc = typeof e["distKpc"] === "number" ? e["distKpc"] : null;
    const sizePc = typeof e["sizePc"] === "number" ? e["sizePc"] : null;
    if (!id || !name || l === null || b === null || distKpc === null || sizePc === null) {
      continue;
    }
    out.push({ id, name, l, b, distKpc, sizePc });
  }
  return out;
}

export function mountLayer(opts: MountOptions): MountedLayer {
  const field = new MilkyWayField();
  opts.parent.add(field.group);

  let currentMode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let loaded = false;
  let cancelled = false;

  const isModeSupported = (m: LayerMode): boolean =>
    m === "galactic" || m === "universe";

  const applyVisibility = (): void => {
    field.setVisible(enabled && isModeSupported(currentMode) && loaded);
  };

  const load = async (): Promise<void> => {
    try {
      const [hiiMod, obMod] = await Promise.all([
        import("./data/hii-regions.json"),
        import("./data/ob-associations.json"),
      ]);
      if (cancelled) return;
      const hii: HiiPoint[] = parsePoints(hiiMod.default, "regions");
      const ob: ObPoint[] = parsePoints(obMod.default, "associations");
      field.setHIIRegions(hii);
      field.setOBAssociations(ob);
      loaded = true;
      applyVisibility();
    } catch (err) {
      log.warn("[milky-way-real]", "load failed", err);
    }
  };

  void load();
  applyVisibility();

  return {
    setEnabled(v: boolean): void {
      enabled = v;
      applyVisibility();
    },
    setMode(m: LayerMode): void {
      currentMode = m;
      applyVisibility();
    },
    dispose(): void {
      cancelled = true;
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}
