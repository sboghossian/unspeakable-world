/**
 * field — three.js renderer for SPICE-style spacecraft trajectories.
 *
 * Each probe's daily-resolution path becomes a single `Line` in the
 * heliocentric scene. Colour per probe is hard-coded to match the
 * solar-flight mode preset palette. AU is converted to scene units
 * using the same scale factor the rest of solar-mode uses.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
} from "three";
import type { ProbeId, ProbeTrajectory } from "./trajectory-loader";

/**
 * Scene units per AU. The solar-flight scene's existing convention is
 * 1 unit = 1 AU; if that ever changes, mirror it here.
 */
const UNITS_PER_AU = 1.0;

const COLORS: Record<ProbeId, string> = {
  "voyager-1": "#ffcc66",
  "voyager-2": "#ff8866",
  "new-horizons": "#66ddff",
  "parker-solar-probe": "#ff6688",
  jwst: "#ccffaa",
};

export class SpiceTrajectoryField {
  readonly group: Group;
  private readonly lines = new Map<ProbeId, Line>();

  constructor() {
    this.group = new Group();
    this.group.name = "spice-trajectories";
  }

  setTrajectories(probes: readonly ProbeTrajectory[]): void {
    for (const line of this.lines.values()) {
      this.group.remove(line);
      line.geometry.dispose();
      const mat = line.material as LineBasicMaterial;
      mat.dispose();
    }
    this.lines.clear();

    for (const probe of probes) {
      const positions = probe.positionsAu;
      if (positions.length < 6) continue;
      const scaled = new Float32Array(positions.length);
      for (let i = 0; i < positions.length; i++) {
        const v = positions[i] ?? 0;
        scaled[i] = v * UNITS_PER_AU;
      }
      const geom = new BufferGeometry();
      geom.setAttribute("position", new BufferAttribute(scaled, 3));
      geom.computeBoundingSphere();
      const colorHex = COLORS[probe.id];
      const mat = new LineBasicMaterial({
        color: new Color(colorHex),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const line = new Line(geom, mat);
      line.name = `spice-${probe.id}`;
      this.group.add(line);
      this.lines.set(probe.id, line);
    }
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  dispose(): void {
    for (const line of this.lines.values()) {
      line.geometry.dispose();
      const mat = line.material as LineBasicMaterial;
      mat.dispose();
    }
    this.lines.clear();
  }
}
