import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from "three";

/**
 * 🌞 Solar System Zones — five toggleable concentric rings drawn on the
 * ecliptic plane in the Universe Mode `solarGroup` (1 unit = 1 AU).
 *
 * Each zone is a child Mesh whose visibility is independently controlled.
 * All zones default OFF; the user toggles them via the LeftRail or the
 * `K` master hotkey. Materials are flat MeshBasicMaterial — no shading,
 * just transparent rings that quietly contextualize distance.
 */

export type ZoneId = "habitable" | "asteroid" | "frost" | "kuiper" | "oort";

const ZONE_SPECS: Record<
  ZoneId,
  { inner: number; outer: number; color: number; opacity: number }
> = {
  // Habitable zone — soft green tint.
  habitable: { inner: 0.95, outer: 1.37, color: 0x4ad19c, opacity: 0.3 },
  // Main asteroid belt — dim grey-orange.
  asteroid: { inner: 2.2, outer: 3.2, color: 0xb89868, opacity: 0.2 },
  // Frost line — thin 1-AU-wide ring centered at 4.85 AU, cyan.
  frost: { inner: 4.85, outer: 5.85, color: 0x9be0d8, opacity: 0.5 },
  // Kuiper belt — faint violet.
  kuiper: { inner: 30, outer: 50, color: 0xb389ff, opacity: 0.15 },
  // Inner Oort cloud — barely-visible amber outline. Drawn huge, but
  // typically only meaningful when the camera is very far out.
  oort: { inner: 2_000, outer: 100_000, color: 0xffc080, opacity: 0.05 },
};

export class SolarZones extends Group {
  private zones = new Map<ZoneId, Mesh>();

  constructor() {
    super();
    this.name = "SolarZones";
    for (const id of Object.keys(ZONE_SPECS) as ZoneId[]) {
      const spec = ZONE_SPECS[id];
      const geom = new RingGeometry(spec.inner, spec.outer, 128);
      const mat = new MeshBasicMaterial({
        color: spec.color,
        side: DoubleSide,
        transparent: true,
        opacity: spec.opacity,
        depthWrite: false,
      });
      const mesh = new Mesh(geom, mat);
      // RingGeometry sits in the XY plane; rotate to ecliptic (XZ).
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.zones.set(id, mesh);
      this.add(mesh);
    }
  }

  setVisible(zone: ZoneId, on: boolean): void {
    const m = this.zones.get(zone);
    if (m) m.visible = on;
  }

  setAllVisible(on: boolean): void {
    for (const m of this.zones.values()) m.visible = on;
  }

  isVisible(zone: ZoneId): boolean {
    return this.zones.get(zone)?.visible ?? false;
  }

  state(): Record<ZoneId, boolean> {
    return {
      habitable: this.isVisible("habitable"),
      asteroid: this.isVisible("asteroid"),
      frost: this.isVisible("frost"),
      kuiper: this.isVisible("kuiper"),
      oort: this.isVisible("oort"),
    };
  }

  dispose(): void {
    for (const m of this.zones.values()) {
      m.geometry.dispose();
      (m.material as MeshBasicMaterial).dispose();
    }
    this.zones.clear();
  }
}
