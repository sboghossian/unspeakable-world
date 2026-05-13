/**
 * 🌌 Grand Tour v2 — 12-step Universe-mode walkthrough.
 *
 * Built on top of Universe Mode v2 + the 15 federated extra layers
 * added in the 2026-05 swarm. Each step pins a camera target (Universe
 * `flyTo` name, named scene preset, or raw logical-frame position) plus
 * an optional list of layer ids to enable / disable for the duration of
 * that step. The `TourRunner` cleans up any layers it turned on when
 * the user exits or finishes.
 *
 * Layer ids match `apps/web/src/viewer/extra-layers/registry.ts`. The
 * runner persists toggles through the existing zustand store
 * (`useExtraLayersStore`), which the scene's `ExtrasController` already
 * subscribes to — so the federated chunk is fetched + mounted on demand
 * exactly as if the user had clicked the layer panel themselves.
 *
 * Scope is intentionally narrower than the original sky tour: we only
 * use camera mechanisms Universe Mode exposes today (`flyTo` named
 * targets, `setCameraLogical` for raw frame positions). Anything that
 * would need a galactic-frame fly tween we don't have falls back to
 * the nearest available `flyTo` preset — content first, mechanism
 * perfection second (per the spec).
 */

/** Camera target shape — Universe mode only supports three kinds today. */
export type TourTargetV2 =
  | {
      /** A high-level scripted destination Universe Mode already knows
       *  about (`Sun`, `Earth`, `Galactic Center`, `M31`, `Local Group`,
       *  `Virgo Supercluster`, `Laniakea`, `Cosmic Web`,
       *  `Observable Universe`, or a planet name). */
      kind: "preset";
      name: string;
    }
  | {
      /** A search-index named entry (resolved through `scene.flyTo`).
       *  Falls back to the closest preset when not found. */
      kind: "named";
      name: string;
      /** Optional preset fallback if the name isn't a known fly target. */
      fallback?: string;
    }
  | {
      /** Raw camera position in the active logical frame (Solar AU when
       *  the tier is solar, Galactic LY when galactic). yaw + pitch are
       *  in radians and aim the camera; if omitted, the camera keeps
       *  its current orientation. */
      kind: "logicalPos";
      x: number;
      y: number;
      z: number;
      yaw?: number;
      pitch?: number;
    };

/** Optional HiPS overlay hint — re-uses the Day-15 mapping. */
export type TourWavelengthHint =
  | "visible"
  | "near-ir"
  | "mid-ir"
  | "x-ray"
  | "cmb"
  | "halpha";

export type TourStepV2 = {
  readonly id: string;
  readonly title: string;
  /** 1-3 sentences. Plain text (light markdown allowed: `code`, *em*). */
  readonly body: string;
  readonly target: TourTargetV2;
  /** Recommended dwell before auto-advance (ms). 0 = manual only. */
  readonly duration_ms: number;
  /** Federated-extra layer ids to enable for this step. Toggles back
   *  off when the runner finishes / exits (unless the user already had
   *  them on). */
  readonly enable_layers?: readonly string[];
  /** Extra layer ids to force-disable (rarely needed). */
  readonly disable_layers?: readonly string[];
  /** Optional HiPS overlay survey hint — runner switches the survey
   *  + cross-fade mix at step entry. */
  readonly wavelengthHint?: TourWavelengthHint;
  /** When true, the TourCard suggests a snapshot button on this step. */
  readonly capture?: boolean;
};

/** Map of wavelength hint → (HiPS survey id, mix). `null` clears the
 *  overlay. Mirrors the helper baked into Viewer.tsx for the old tour. */
export const WAVELENGTH_OVERLAY: Record<
  TourWavelengthHint,
  { survey: string | null; mix: number }
> = {
  visible: { survey: null, mix: 0 },
  "near-ir": { survey: "2mass", mix: 0.55 },
  "mid-ir": { survey: "allwise", mix: 0.55 },
  "x-ray": { survey: "integral", mix: 0.55 },
  // Planck SMICA CMB temperature map — already shipped in `SURVEYS`.
  cmb: { survey: "planck", mix: 0.8 },
  halpha: { survey: "halpha", mix: 0.55 },
};

/**
 * The Grand Tour v2 — 12 steps from Earth's vicinity to the heat death
 * of the cosmos. Designed to run *inside* Universe Mode so the tier
 * cross-fades carry the user from Solar → Galactic → Cosmic without a
 * scene swap.
 *
 * Each step names the extra layers it depends on so a viewer with all
 * layers off still gets the intended visual on every step.
 */
export const GRAND_TOUR_V2: readonly TourStepV2[] = [
  {
    id: "where-we-are",
    title: "1. Where we are",
    body: "You're a passenger on a small, wet planet orbiting an average star, in the suburbs of a barred spiral galaxy. We'll start here — Earth, seen from the Sun-Earth L1 vantage — and zoom out by a factor of 10²⁶ over the next 11 steps.",
    target: { kind: "preset", name: "Earth" },
    duration_ms: 9000,
  },
  {
    id: "the-sun-is-a-star",
    title: "2. The Sun is a star",
    body: "Our Sun is a *G2V* main-sequence star — middle-aged, ~4.6 Gyr in, with another ~5 Gyr to go before it swells into a red giant. The live SDO imagery layer paints today's actual photosphere onto the sphere.",
    target: { kind: "preset", name: "Sun" },
    duration_ms: 9000,
    wavelengthHint: "visible",
  },
  {
    id: "planets-in-true-scale",
    title: "3. Planets in true scale",
    body: "Pull back into the inner Solar System. Distances here are 1 AU = 1 unit; planet diameters are exaggerated by ~1000× for visibility (everything would be invisible at true scale at this zoom). Toggle the OPAL layer to see Hubble's latest Jupiter & Saturn cloud bands.",
    target: { kind: "preset", name: "Jupiter" },
    duration_ms: 9000,
    enable_layers: ["opal-giants"],
  },
  {
    id: "beyond-pluto",
    title: "4. Beyond Pluto",
    body: "Past Neptune, the Kuiper belt thins into the Oort cloud — a spherical shell of frozen comets stretching halfway to the nearest star. We're at ~100 AU now; the spacecraft Voyager 1 is out there somewhere, the most distant human-made object in history.",
    // ~100 AU in LY along +x from the Sun, slightly above the ecliptic.
    target: {
      kind: "logicalPos",
      x: 26000 + 100 / 63241,
      y: 30 / 63241,
      z: 30 / 63241,
      yaw: Math.PI,
      pitch: -0.3,
    },
    duration_ms: 8500,
  },
  {
    id: "the-nearest-star",
    title: "5. The nearest star",
    body: "Proxima Centauri is *4.24 light-years* away — close enough that Gaia DR3 has its parallax to better than 1 part in 100 000. Enable the Gaia DR3 layer to see a million parallax-derived stars; Proxima is one of them.",
    target: { kind: "named", name: "Proxima Centauri", fallback: "Sun" },
    duration_ms: 9000,
    enable_layers: ["gaia-stars"],
  },
  {
    id: "local-neighborhood",
    title: "6. Our local neighborhood",
    body: "Inside a 100 light-year bubble around the Sun there are roughly 14 000 stars. The Gaia layer plus the AAVSO variables overlay shows the ones that pulse, eclipse, and outburst — the heartbeat of the local Milky Way.",
    // ~100 LY out from the Sun, looking back toward the disk plane.
    target: {
      kind: "logicalPos",
      x: 26000,
      y: 100,
      z: 100,
      yaw: Math.PI,
      pitch: -0.55,
    },
    duration_ms: 8500,
    enable_layers: ["gaia-stars", "variables"],
  },
  {
    id: "galactic-center",
    title: "7. The Galactic Center",
    body: "**Sgr A***, the Milky Way's supermassive black hole, is 26 000 light-years away. Visible light from here is blocked by dust — but the Chandra X-ray layer punches right through, lighting up the X-ray binaries and magnetars near the central parsec.",
    target: { kind: "preset", name: "Galactic Center" },
    duration_ms: 10000,
    enable_layers: ["chandra"],
    wavelengthHint: "x-ray",
  },
  {
    id: "multi-messenger-sky",
    title: "8. Multi-messenger sky",
    body: "On 2017-08-17, a neutron-star merger in NGC 4993 lit up the sky in *gravitational waves, gamma rays, and visible light* — the first multi-messenger event in history. The multi-messenger layer marks every LIGO event, IceCube neutrino, and Auger UHECR detected so far.",
    target: { kind: "named", name: "NGC 4993", fallback: "M31" },
    duration_ms: 10000,
    enable_layers: ["multimessenger"],
  },
  {
    id: "the-cmb",
    title: "9. The CMB",
    body: "Push out to ~46 billion light-years and you hit the **Cosmic Microwave Background** — the surface of last scattering, 380 000 years after the Big Bang. Planck's SMICA temperature map paints the sky; the polarization layer overlays the dust-corrected E-mode pattern.",
    target: { kind: "preset", name: "Observable Universe" },
    duration_ms: 11000,
    enable_layers: ["planck-polarization"],
    wavelengthHint: "cmb",
    capture: true,
  },
  {
    id: "local-group",
    title: "10. The Local Group",
    body: "Pull back in. We share our gravitational island — the *Local Group* — with Andromeda (M31), the Triangulum Galaxy (M33), and ~50 dwarfs. M31 is on a collision course with the Milky Way; they'll merge in ~4.5 Gyr to form Milkomeda.",
    target: { kind: "preset", name: "Local Group" },
    duration_ms: 9000,
    enable_layers: ["galaxy-cone"],
  },
  {
    id: "cosmic-web",
    title: "11. The Cosmic Web",
    body: "At 100 megaparsecs the universe stops being a soup of galaxies and starts looking *organized* — filaments, walls, and voids 10⁸ ly across. The Cosmicflows-4 layer paints peculiar-velocity vectors showing the gravitational flow toward the Great Attractor.",
    target: { kind: "preset", name: "Cosmic Web" },
    duration_ms: 11000,
    enable_layers: ["galaxy-cone", "cosmicflows4"],
  },
  {
    id: "heat-death-awaits",
    title: "12. Heat death awaits",
    body: "Dark energy is accelerating the expansion. In ~10¹⁰⁰ years the last stars will burn out, the last black holes will evaporate, and the universe will fade to a uniform 0 K — *heat death*. You are here, now, at the only moment in cosmic history when things are interesting. Take a snapshot.",
    target: { kind: "preset", name: "Observable Universe" },
    duration_ms: 0,
    capture: true,
  },
];
