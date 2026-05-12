import { log } from "../../lib/logger";
import type { ToiEntry } from "./toi-field";
import type { VariableEntry } from "./variables-field";

/**
 * Fetch helpers for the variables overlays. These do not go through the
 * idb-cache wrapper because (a) the VSX subset is tiny (~10 KB) and (b)
 * the TOI bundle changes every bake — we let the browser HTTP cache handle
 * it via the public/data path versioning Vite already does on build.
 */

type VsxPayload = {
  generated: string;
  attribution: string;
  count: number;
  sources: VariableEntry[];
};

type ToiPayload = {
  generated: string;
  attribution: string;
  count: number;
  sources: ToiEntry[];
};

export async function loadVsx(url: string): Promise<VariableEntry[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`VSX HTTP ${res.status}`);
    const payload = (await res.json()) as VsxPayload;
    return payload.sources;
  } catch (err) {
    log.warn("[variables] VSX load failed", err);
    return [];
  }
}

export async function loadToi(url: string): Promise<ToiEntry[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TOI HTTP ${res.status}`);
    const payload = (await res.json()) as ToiPayload;
    return payload.sources;
  } catch (err) {
    log.warn("[variables] TOI load failed", err);
    return [];
  }
}
