import { useState } from "react";

type Phase = {
  day: string;
  title: string;
  detail: string;
  status: "shipped" | "now" | "next" | "soon";
};

const PHASES: Phase[] = [
  {
    day: "Day 1",
    title: "Foundation",
    detail: "Public repo · MIT license · landing live at unspeakable.world",
    status: "shipped",
  },
  {
    day: "Day 2-3",
    title: "HEALPix engine",
    detail:
      "Real DSS2 sky tiles streaming on a 3D Three.js sphere · Voyager camera with touch + pinch + tap-to-fly · Norder 1+ LOD on zoom",
    status: "shipped",
  },
  {
    day: "Day 4",
    title: "Catalogs + Solar System",
    detail:
      "8,921 bright stars (HYG v4.0) GPU-instanced · Sun, Moon, 8 planets via AstronomyEngine · time scrubbing",
    status: "shipped",
  },
  {
    day: "Day 5",
    title: "Live ISS + Quick Targets",
    detail:
      "Live ISS position from wheretheiss.at · Sun/Moon/Planets/ISS targets menu · click-to-fly with eased camera",
    status: "shipped",
  },
  {
    day: "Day 6",
    title: "Multi-wavelength + SIMBAD",
    detail:
      "Visible ↔ 2MASS (near-IR) ↔ AllWISE (mid-IR) cross-fade slider · click any sky → SIMBAD info panel with name, type, magnitude",
    status: "shipped",
  },
  {
    day: "Day 7",
    title: "Public launch (v1)",
    detail:
      "Show HN, Reddit, Product Hunt — first public sharing of the OSS viewer.",
    status: "shipped",
  },
  {
    day: "Day 8",
    title: "Tonight's sky",
    detail:
      'Geolocation-gated "↑ tonight\'s sky" button computes your local zenith via IAU GMST and flies the camera straight up — coordinates stay on-device.',
    status: "shipped",
  },
  {
    day: "Day 9",
    title: "Polar seam tightened",
    detail:
      "Bumped tile subdivision SUB=16→32. The wide diagonal cracks at lat ±41.81° collapse to thin lines.",
    status: "shipped",
  },
  {
    day: "Day 10",
    title: "Deep-sky overlay",
    detail:
      "879 Messier + bright NGC/IC objects from OpenNGC — type-coded ring markers (galaxy / cluster / nebula).",
    status: "shipped",
  },
  {
    day: "Day 11",
    title: "Constellation lines",
    detail:
      "All 88 IAU constellations from d3-celestial — toggle with ✦ LINES.",
    status: "shipped",
  },
  {
    day: "Day 12",
    title: "X-ray wavelength",
    detail:
      "INTEGRAL hard X-ray (20-100 keV color) joins DSS2 / 2MASS / WISE in the wavelength toggle. Visible → mid-IR → X-ray cross-fade.",
    status: "shipped",
  },
  {
    day: "Day 13",
    title: "Search bar",
    detail:
      "⌘K opens search across stars, deep-sky objects, planets, constellations — fly to any of them.",
    status: "shipped",
  },
  {
    day: "Day 14",
    title: "Mobile UX",
    detail:
      "Top bar collapses to icons on phones; engineering chrome hidden on small screens.",
    status: "shipped",
  },
  {
    day: "Day 15",
    title: "Grand Tour",
    detail:
      "9-step guided walkthrough: Sun → Andromeda → Pleiades → Orion → Sgr A* → Crab → LMC → Jupiter + Galilean moons → Voyager 1, each with the right wavelength.",
    status: "shipped",
  },
  {
    day: "Day 16",
    title: "Shareable URLs",
    detail:
      "Every camera state, FOV, time, overlay + mix, and toggles round-trip via the URL hash. Copy-paste any view.",
    status: "shipped",
  },
  {
    day: "Day 17",
    title: "Wikipedia inspector",
    detail:
      "Click the sky → SIMBAD identifies the object + Wikipedia article excerpt + thumbnail in the side panel.",
    status: "shipped",
  },
  {
    day: "Day 18",
    title: "Famous-name aliases",
    detail:
      'Type "Crab" or "Pleiades" — search and Wikipedia lookups now bridge SIMBAD codes to common names.',
    status: "shipped",
  },
  {
    day: "Day 19",
    title: "Constellation labels",
    detail:
      "88 three-letter IAU codes overlay the sky at each constellation centroid when ✦ LINES is on.",
    status: "shipped",
  },
  {
    day: "Day 20",
    title: "v2 ship",
    detail:
      "Refreshed README, updated OG card, new screenshots, fresh hello on socials.",
    status: "shipped",
  },
  {
    day: "v3.A",
    title: "Educational reference",
    detail:
      "8-lesson curriculum with narrated camera tours · 100 named objects with one-paragraph 'why this matters' + SIMBAD/Wikipedia/ADS citations · 98-term glossary · achievements + Scholar / Mythbuster unlocks.",
    status: "shipped",
  },
  {
    day: "v3.B",
    title: "SETI · UAP · Biosignatures",
    detail:
      "5 candidate SETI signals · 3 interstellar visitors · 6 biosignature exoplanets · 5 famous UAP cases with skeptical framing · Drake equation sliders · 52 myths debunked with citations.",
    status: "shipped",
  },
  {
    day: "v3.C",
    title: "Solar flight + gravity sandbox",
    detail:
      "3-D heliocentric scene · 935 SGP4-propagated satellites · gravity sandbox (n-body integration with comet → black hole projectiles) · tracking mode · 3,927 SIMBAD pulsars.",
    status: "shipped",
  },
  {
    day: "v3.D",
    title: "AstroGrid parity",
    detail:
      "Scene Editor (keyframed cinematic camera walks) · Cosmic flows · dark matter halos · GraceDB + GCN + ATel transient streams · spacecraft trajectories · Explore drawer.",
    status: "shipped",
  },
  {
    day: "v4.A",
    title: "+ 6 HiPS surveys",
    detail:
      "Pan-STARRS DR1 · SDSS9 · DESI Legacy DR10 · VLASS · TGSS · HST color composite — all CDS / NRAO / ASTRON CORS-verified at Norder3.",
    status: "shipped",
  },
  {
    day: "v4.B",
    title: "Federation sweep — 15 datasets",
    detail:
      "Gaia DR3 (1M stars) · 6,286 NASA exoplanets + PHL habitability · 84 Chandra X-ray · 7,931 TESS TOIs + 72 VSX variables · 136K galaxies (2MRS + 6dFGS) · multi-messenger (IceCube + Auger + LIGO GWTC-3 + NANOGrav) · ZTF/Lasair · JPL Sentry · Starlink opt-in · Planck E/B · CosmicFlows-4 · 12 sky cultures · Globe at Night · OPAL HST · Mars Rover IoTD.",
    status: "shipped",
  },
  {
    day: "v4.C",
    title: "Cosmic Copilot — Layer 2 AI",
    detail:
      "Ask 'what am I looking at?' with citations. Offline-first 32-answer fallback · optional Ollama backend (qwen3:8b default) · pluggable OpenAI-compatible · grounded by current scene state · threads persist in localStorage.",
    status: "shipped",
  },
  {
    day: "v4.D",
    title: "Universe Mode v2 — seamless tiers",
    detail:
      "One scene, two coordinate frames (AU + LY). Camera-relative rendering, tier-aware opacity cross-fades, adaptive WASD speed. Fly from a planet to the cosmic web without a scene swap.",
    status: "shipped",
  },
  {
    day: "v4.E",
    title: "AR Sky + WebGPU + URL deep-link",
    detail:
      "Mobile AR with rear-camera passthrough + gyro fusion + tap-to-identify · opt-in WebGPU renderer behind a flag (WebGL2 fallback on failure) · every layer toggle round-trips via `&layers=` URL hash.",
    status: "shipped",
  },
  {
    day: "v4.F",
    title: "Universe v2 as front door + horizon polish",
    detail:
      "Universe Mode is now the primary landing CTA — fly from a planet to the cosmic web in one camera. Plus tagline rework, public manifesto, hashtag-led distribution, and a friendlier support nudge.",
    status: "now",
  },
];

const STATUS_BADGE: Record<Phase["status"], string> = {
  shipped: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  now: "border-plasma-500/40 bg-plasma-500/10 text-plasma-400",
  next: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  soon: "border-white/10 bg-white/5 text-white/50",
};

const STATUS_LABEL: Record<Phase["status"], string> = {
  shipped: "✓ Shipped",
  now: "● Now",
  next: "○ Next",
  soon: "○ Soon",
};

function PhaseCard({ p }: { p: Phase }) {
  return (
    <li
      className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-white/40">
          {p.day}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_BADGE[p.status]}`}
        >
          {STATUS_LABEL[p.status]}
        </span>
      </div>
      <h3 className="font-display text-xl font-semibold text-white">
        {p.title}
      </h3>
      <p className="text-sm text-white/60">{p.detail}</p>
    </li>
  );
}

export function Roadmap() {
  const [shippedOpen, setShippedOpen] = useState(false);

  const shipped = PHASES.filter((p) => p.status === "shipped");
  const upcoming = PHASES.filter((p) => p.status !== "shipped");
  // Default: "Now" + next 2 upcoming (next/soon). Falls back gracefully
  // when there are fewer than 3 non-shipped phases.
  const nowPhase = upcoming.find((p) => p.status === "now");
  const nextTwo = upcoming.filter((p) => p.status !== "now").slice(0, 2);
  const headlinePhases: Phase[] = nowPhase
    ? [nowPhase, ...nextTwo]
    : upcoming.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="mb-10 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            30 phases, building in public.{" "}
            <span className="text-white/40">{shipped.length} shipped, {upcoming.length} live now.</span>
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Every commit on{" "}
            <a
              href="https://github.com/sboghossian/unspeakable-world"
              target="_blank"
              rel="noreferrer"
              className="text-white/70 underline-offset-2 hover:text-plasma-400 hover:underline"
            >
              github.com/sboghossian/unspeakable-world
            </a>{" "}
            since hour zero.
          </p>
        </div>
        <a
          href="https://github.com/sboghossian/unspeakable-world"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          GitHub →
        </a>
      </div>

      {shipped.length > 0 && (
        <div className="mb-6">
          {!shippedOpen ? (
            <button
              type="button"
              onClick={() => setShippedOpen(true)}
              className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3 text-left text-sm text-emerald-200 transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
            >
              {shipped.length} phases shipped · expand →
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShippedOpen(false)}
                className="mb-3 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3 text-left text-sm text-emerald-200 transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
              >
                {shipped.length} phases shipped · collapse ↑
              </button>
              <ol className="grid gap-3 md:grid-cols-2">
                {shipped.map((p) => (
                  <PhaseCard key={p.day} p={p} />
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      <ol className="grid gap-3 md:grid-cols-2">
        {headlinePhases.map((p) => (
          <PhaseCard key={p.day} p={p} />
        ))}
      </ol>
    </section>
  );
}
