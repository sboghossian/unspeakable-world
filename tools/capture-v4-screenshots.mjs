#!/usr/bin/env node
/**
 * v4 hero screenshot capture — the deliberate, cinematic set.
 *
 * Produces 10 polished hero shots for the v4 wave. Each is captured at
 * 1920x1080 against either production (default) or a local preview,
 * with localStorage pre-seeded so the tutorial / banners / consent
 * strip / first-run hints don't cover the canvas, and per-shot
 * "after-load" interactions to seed conversations or open panels.
 *
 * Targets (all written under docs/screenshots/v4/ AND
 * apps/web/public/screenshots/v4/):
 *
 *   1. gaia-dr3-million-stars.png   Universe Mode, gaia-stars on
 *   2. multi-messenger-sky.png      Sky viewer, full multimessenger on
 *   3. 136k-galaxy-cone.png         Universe Mode, galaxy-cone fills frame
 *   4. cosmic-copilot-conversation.png  Copilot panel mid-conversation
 *   5. universe-tier-handoff.png    Universe Mode at AU↔LY tier border
 *   6. layers-panel-with-sub-tabs.png   ✨ Layers panel + sub-tabs visible
 *   7. grand-tour-v2.png            Universe Mode mid-tour at step 7
 *   8. fits-upload-on-sky.png       Sky viewer + FITS panel + projection
 *   9. planck-cmb-polarization.png  Sky viewer + Planck T + polarization
 *  10. education-certificate.png    Certificate panel, 15 lessons done
 *
 * Usage:
 *   node tools/capture-v4-screenshots.mjs                         # prod
 *   node tools/capture-v4-screenshots.mjs --target http://localhost:4173
 *   node tools/capture-v4-screenshots.mjs --only gaia-dr3-million-stars
 *   node tools/capture-v4-screenshots.mjs --list
 */

import { chromium } from "playwright";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DOCS_OUT = join(REPO_ROOT, "docs", "screenshots", "v4");
const PUBLIC_OUT = join(
  REPO_ROOT,
  "apps",
  "web",
  "public",
  "screenshots",
  "v4",
);

const DEFAULT_TARGET = "https://unspeakable-world.dashable.dev";
const PER_SHOT_TIMEOUT_MS = 60_000;
const VIEWPORT = { width: 1920, height: 1080 };

/**
 * Aliases — when we write a new capture under a new filename, we also
 * copy it into the legacy filename used by the landing page Highlights
 * grid so existing <img src> tags keep working without code edits.
 * (We update README.md to point at the new names anyway.)
 */
const ALIASES = {
  "gaia-dr3-million-stars": "gaia-1m-stars",
  "multi-messenger-sky": "multi-messenger",
  "136k-galaxy-cone": "galaxy-cone",
  "cosmic-copilot-conversation": "cosmic-copilot",
  "universe-tier-handoff": "universe-tiers",
  "layers-panel-with-sub-tabs": "extra-layers-panel",
  "planck-cmb-polarization": "planck-cmb",
};

/**
 * Pre-seed flags so the canvas isn't covered by first-run chrome.
 * Also seeds:
 *   • completed lesson progress (15 lessons) for the certificate shot
 *   • a 3-turn copilot conversation for the copilot shot
 *   • the extra-layers store with the layers we want enabled per shot
 *     (set as `seedLayers` per-shot below)
 */
function buildLocalStorageSeed(extra = {}) {
  return {
    "uw:tutorial-done": "1",
    // F2's TutorialOverlayV2 (Wave 7) uses a new storage key; without
    // this the overlay covers the canvas in every capture. Set both
    // so legacy + v2 don't fire.
    "uw:tutorial-v2-done:v1": "1",
    "uw:pwa-install-dismissed": "1",
    "uw:first-run-hint-seen": "1",
    "uw:cosmic-flow-hint-seen": "1",
    "uw:support-ribbon:dismissed-v1": "yes",
    "uw:whats-new-v4:seen": "1",
    "uw:consent:v1": JSON.stringify({
      telemetry: false,
      errorTracking: false,
      decidedAt: Date.now(),
    }),
    "uw:extra-layers:active-tab": "alerts",
    ...extra,
  };
}

const LESSON_IDS = [
  "where-are-we-standing",
  "how-big-is-the-sun",
  "solar-system-true-scale",
  "keplers-laws",
  "why-planets-differ",
  "moons-rings-asteroids",
  "sun-is-a-star",
  "nearest-star",
  "constellations-human-invention",
  "milky-way-place-we-live",
  "other-galaxies-milky-ways",
  "redshift-universe-past",
  "cosmic-web",
  "how-we-know-m87",
  "what-we-still-dont-know",
];

/** Build a completed lesson-progress record for the certificate shot. */
function buildCompletedLessons() {
  // Backdate completions across the last 14 days so the certificate
  // shows a believable "Coursework dates" range.
  const out = {};
  const base = Date.now() - 14 * 86_400_000;
  for (let i = 0; i < LESSON_IDS.length; i++) {
    const id = LESSON_IDS[i];
    const when = new Date(base + i * 86_400_000).toISOString();
    out[`uw:lesson:${id}`] = JSON.stringify({
      lessonId: id,
      started: true,
      stepIdx: 99,
      completed: true,
      attempts: 1,
      bestScore: 1,
      firstCompletedAt: when,
      updatedAt: when,
    });
  }
  out["uw:certificate:name"] = "Stephane Boghossian";
  return out;
}

/**
 * Build a 3-turn copilot conversation that demonstrates the M31
 * question + tool-calling pills. Persisted under
 * `uw:copilot:thread:v1`.
 */
function buildCopilotThread() {
  return JSON.stringify([
    {
      role: "user",
      content: "What's M31?",
    },
    {
      role: "assistant",
      content:
        "M31 is the Andromeda Galaxy — the closest large spiral to our own, ~2.5 million light-years away. It's roughly 220,000 light-years across and contains a trillion stars. You can see it as a faint smudge from a dark sky on a moonless autumn night. It's blueshifted, falling toward the Milky Way: in ~4.5 Gyr they'll merge into a single elliptical called Milkomeda.",
      citations: [
        {
          title: "M31 — SIMBAD",
          url: "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=M31",
        },
        {
          title: "Andromeda Galaxy — Wikipedia",
          url: "https://en.wikipedia.org/wiki/Andromeda_Galaxy",
        },
      ],
    },
    {
      role: "user",
      content: "Show me in infrared.",
    },
    {
      role: "assistant",
      content:
        "Done — flying to M31 and switching the wavelength to 2MASS near-infrared (1.25–2.17 µm). The infrared cuts through interstellar dust so you'll see the underlying old stellar population light up, the bulge becomes obvious, and the dust-lane structure inverts compared to the visible image.",
      tools: [
        {
          id: "call_fly_m31",
          name: "fly_to",
          args: { name: "M31" },
          status: "ok",
        },
        {
          id: "call_overlay_2mass",
          name: "set_overlay",
          args: { survey: "2mass", mix: 0.85 },
          status: "ok",
        },
      ],
    },
  ]);
}

/**
 * Build a tiny synthetic FITS file (256×256 32-bit float, gradient with
 * a deliberate gaussian "source" near the centre) plus enough WCS to be
 * projectable on the sky. Returned as a Buffer the script then drops on
 * the FitsPanel's file <input>.
 *
 * Format reference: NASA FITS Standard v4.0 (Pence et al. 2010).
 */
function buildSyntheticFits() {
  const W = 256;
  const H = 256;
  const CARD = 80;
  const BLOCK = 2880;

  const cards = [];
  const card = (k, v, c) => {
    const key = String(k).padEnd(8, " ").slice(0, 8);
    let line;
    if (v === null || v === undefined) {
      line = `${key}        ${c ?? ""}`.padEnd(CARD, " ").slice(0, CARD);
    } else if (typeof v === "string") {
      // Quoted string value
      const quoted = `'${v}'`;
      line = `${key}= ${quoted.padEnd(20, " ")}${c ? ` / ${c}` : ""}`
        .padEnd(CARD, " ")
        .slice(0, CARD);
    } else {
      // Numeric/bool value, right-justified in cols 11-30
      const num = typeof v === "boolean" ? (v ? "T" : "F") : String(v);
      line = `${key}= ${num.padStart(20, " ")}${c ? ` / ${c}` : ""}`
        .padEnd(CARD, " ")
        .slice(0, CARD);
    }
    cards.push(line);
  };

  card("SIMPLE", true, "FITS standard");
  card("BITPIX", -32, "32-bit IEEE float");
  card("NAXIS", 2);
  card("NAXIS1", W);
  card("NAXIS2", H);
  card("OBJECT", "synthetic", "synthetic gaussian source");
  card("TELESCOP", "UW-SAMPLE", "Unspeakable World sample data");
  card("INSTRUME", "FAKECAM", "synthetic instrument");
  card("FILTER", "R", "broadband");
  card("DATE-OBS", "2026-05-13T00:00:00", "UTC");
  card("EXPTIME", 60, "seconds");
  card("BUNIT", "ADU");
  // WCS — tangent plane centred on M31.
  card("CTYPE1", "RA---TAN");
  card("CTYPE2", "DEC--TAN");
  card("CRVAL1", 10.6847, "RA at reference pixel (deg)");
  card("CRVAL2", 41.269, "Dec at reference pixel (deg)");
  card("CRPIX1", W / 2);
  card("CRPIX2", H / 2);
  card("CDELT1", -0.001388, "deg/pix (5 arcsec)");
  card("CDELT2", 0.001388);
  // 80-byte END card
  cards.push("END".padEnd(CARD, " "));

  // Pad header to a 2880-byte boundary with blank cards.
  const headerBytes = cards.length * CARD;
  const padCards = Math.ceil(headerBytes / BLOCK) * (BLOCK / CARD) - cards.length;
  const headerBuf = Buffer.alloc(Math.ceil(headerBytes / BLOCK) * BLOCK, 0x20);
  for (let i = 0; i < cards.length; i++) {
    headerBuf.write(cards[i], i * CARD, CARD, "ascii");
  }
  for (let i = 0; i < padCards; i++) {
    headerBuf.write(" ".repeat(CARD), (cards.length + i) * CARD, CARD, "ascii");
  }

  // Data: 32-bit big-endian floats — gradient + gaussian source at center.
  const dataLen = W * H * 4;
  const padded = Math.ceil(dataLen / BLOCK) * BLOCK;
  const data = Buffer.alloc(padded, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - W / 2;
      const dy = y - H / 2;
      const r2 = dx * dx + dy * dy;
      const bg = 0.15 + 0.6 * (y / H);
      const src = 2.4 * Math.exp(-r2 / (2 * 22 * 22));
      const ring = 0.18 * Math.exp(-Math.pow(Math.sqrt(r2) - 60, 2) / (2 * 6 * 6));
      const v = bg + src + ring;
      data.writeFloatBE(v, (y * W + x) * 4);
    }
  }
  return Buffer.concat([headerBuf, data]);
}

/**
 * Each shot:
 *   - name: file stem
 *   - hash: location.hash to load
 *   - viewport: optional override
 *   - seedLayers: extra-layers store map { id: true }
 *   - extraStorage: extra localStorage k/v
 *   - openPanel: list of selectors, click first that's present
 *   - afterOpen: extra interaction
 *   - postWaitMs: settle time after navigation
 *   - finalWaitMs: extra settle time AFTER openPanel + afterOpen
 */
const SHOTS = [
  // 1. Gaia DR3 — universe mode, camera ~50 AU above the ecliptic
  //    looking back down at the inner solar system + Sun. Universe-frame
  //    coords are absolute LY centred on the galactic origin; SUN_LY =
  //    (26000, 0, 0), so to sit 50 AU "above" the Sun we add 50/63241
  //    LY in the +y direction.
  {
    name: "gaia-dr3-million-stars",
    hash: "#universe?cx=26000&cy=0.00079&cz=0&yaw=3.14159&pitch=-1.55",
    seedLayers: { "gaia-stars": true },
    collapseLeftRail: true,
    postWaitMs: 8500,
  },

  // 2. Multi-messenger — sky viewer pulled out wide (FOV 150°) with all
  //    four sub-layers on. Aim at the galactic centre so the band of
  //    the Milky Way is visible behind the multi-messenger overlay.
  {
    name: "multi-messenger-sky",
    hash: "#viewer?fov=150&ra=180&dec=0&layers=multimessenger&c=1&n=1",
    extraStorage: {
      // The multimessenger sub-layers default-on inside the module, but
      // we set them explicitly to be safe — same keys the module reads.
      "uw:mm:sublayer:icecube": "1",
      "uw:mm:sublayer:auger": "1",
      "uw:mm:sublayer:ligo": "1",
      "uw:mm:sublayer:nanograv": "1",
    },
    postWaitMs: 6500,
  },

  // 3. Galaxy cone — universe mode, ~50 Mpc above the Milky Way disk
  //    looking back toward the Local Group. 50 Mpc ≈ 163 Mly. We sit
  //    in the LY frame at (26000, 1.6e8, 0) pitched almost straight
  //    down so the 2MRS+6dFGS cone (which centres on the Milky Way)
  //    fills the frame with its redshift hue gradient.
  {
    name: "136k-galaxy-cone",
    // Universe Mode at ~10 Mly out from the Sun looking back along
    // the +z axis. From this distance the 2MRS+6dFGS galaxy cone is
    // dense (Local Group + Virgo + Coma + Hercules) and the redshift
    // hue gradient is most visible. Yaw=π means "look in -x", pitch
    // tilts slightly down so the camera straddles the disk.
    hash: "#universe?cx=26000&cy=10000000&cz=0&yaw=3.14159&pitch=-1.4",
    seedLayers: { "galaxy-cone": true },
    collapseLeftRail: true,
    postWaitMs: 10000,
  },

  // 4. Cosmic Copilot — sky viewer aimed at M31, copilot opened mid-
  //    conversation. We seed `uw:copilot:thread:v1` with a 3-turn
  //    exchange so the panel opens already populated, including the
  //    tool-call pills on the assistant's second turn.
  {
    name: "cosmic-copilot-conversation",
    // Conversation is about M31 — but the AI's second turn calls
    // `fly_to` + `set_overlay` to put the camera there in 2MASS.
    // Wider FOV (12°) so the dust glow around M31 reads behind the
    // panel; gaia-stars on for star-field context. mix=0.95 so the
    // 2MASS overlay dominates and matches the chat's claim.
    hash: "#viewer?fov=12&ra=10.6847&dec=41.269&w=2mass&mix=0.95&c=1&n=1&layers=gaia-stars",
    extraStorage: { "uw:copilot:thread:v1": buildCopilotThread() },
    seedLayers: { "gaia-stars": true },
    openPanel: ['button:has-text("🧠 ask")', 'button[title*="Copilot" i]'],
    finalWaitMs: 2800,
    postWaitMs: 7500,
  },

  // 5. Universe Mode tier handoff — cinematic banked shot. The Sun
  //    sits at SUN_LY = (26000, 0, 0). Park the camera ~500 LY off
  //    the Sun on +y (above the ecliptic) and ~500 LY behind on +x,
  //    yawed back toward galactic centre, pitched slightly down so
  //    the gaia star field carpets the lower frame and the galactic
  //    disk + cosmic-web fill the upper-middle. Tier HUD reads
  //    "Galactic Tier" at this distance and the scale chip shows
  //    the LY frame is active — the "multiple scales at once"
  //    statement is right in the HUD.
  {
    name: "universe-tier-handoff",
    hash: "#universe?cx=26500&cy=500&cz=0&yaw=3.14159&pitch=-0.35",
    seedLayers: {
      "gaia-stars": true,
      "cosmic-web": true,
    },
    collapseLeftRail: true,
    postWaitMs: 12000,
  },

  // 6. Layers panel — sky viewer, ✨ layers popover open. Several
  //    layers ON across multiple sub-tabs. We start on the "alerts"
  //    sub-tab (seeded above) because it has the busiest icon set.
  {
    name: "layers-panel-with-sub-tabs",
    hash: "#viewer?fov=60&ra=180&dec=20&c=1&n=1&layers=gaia-stars,multimessenger,planck-polarization,chandra,variables,sky-cultures-extended",
    openPanel: [
      'button[aria-label*="federated" i]',
      'button[title*="federated data layers" i]',
      'button:has-text("✨ layers")',
      'button:has-text("layers")',
    ],
    finalWaitMs: 1500,
    postWaitMs: 4500,
  },

  // 7. Grand Tour — universe mode, tour started, jumped to step 7
  //    (Galactic Center + Chandra layer). The TourCard renders at the
  //    bottom with the 12-step timeline. We click "▶ grand tour" then
  //    use the timeline dots to jump to step 7. The fly-to takes
  //    ~5 s so we wait a beat for the camera to settle.
  {
    name: "grand-tour-v2",
    hash: "#universe",
    collapseLeftRail: true,
    openPanel: ['button:has-text("▶ grand tour")', 'button:has-text("grand tour")'],
    afterOpen: async (page) => {
      await page.waitForSelector('[aria-label*="Tour step" i], [aria-label*="grand tour" i], button:has-text("next")', { timeout: 5000 }).catch(() => {});
      const dots = page.locator('[aria-label*="Tour step" i]');
      const n = await dots.count().catch(() => 0);
      if (n >= 7) {
        await dots.nth(6).click({ timeout: 2000 }).catch(() => {});
      } else {
        for (let i = 0; i < 6; i++) {
          const nextBtn = page.locator('button:has-text("next →"), button:has-text("next")').first();
          if (await nextBtn.count()) {
            await nextBtn.click({ timeout: 1200 }).catch(() => {});
            await page.waitForTimeout(450);
          }
        }
      }
    },
    finalWaitMs: 6500,
    postWaitMs: 5500,
  },

  // 8. FITS upload — sky viewer at M31 (RA 10.68, Dec 41.27) with a
  //    1° FOV so the 256×256 synthetic FITS (0.36° on a side, WCS
  //    centred at M31) projects visibly. ⚙ pro tools panel open on
  //    the FITS tab; the synthetic gradient + gaussian + ring source
  //    is dropped on the input, then "project on sky" is clicked.
  {
    name: "fits-upload-on-sky",
    hash: "#viewer?fov=1.0&ra=10.6847&dec=41.269&w=2mass&mix=0.5",
    openPanel: ['button:has-text("⚙ pro tools")', 'button[title*="Power-user" i]'],
    afterOpen: async (page) => {
      const fitsTab = page.locator('button:has-text("FITS upload"), button:has-text("FITS")').first();
      if (await fitsTab.count()) {
        await fitsTab.click({ timeout: 1200 }).catch(() => {});
        await page.waitForTimeout(400);
      }
      const buf = buildSyntheticFits();
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count()) {
        await fileInput.setInputFiles({
          name: "uw-synthetic-256.fits",
          mimeType: "application/fits",
          buffer: buf,
        }).catch(() => {});
        await page.waitForTimeout(2500);
        const proj = page.locator('button:has-text("project on sky")').first();
        if (await proj.count()) {
          await proj.click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
    },
    finalWaitMs: 2800,
    postWaitMs: 4500,
  },

  // 9. Planck CMB + polarization. Sky viewer pointed at the Galactic
  //    Centre (Sgr A* ≈ 266.4, -29) so the galactic plane crosses the
  //    frame and the polarization vectors visibly streak along the
  //    plane. We use the maximum FOV the viewer supports (170°) so the
  //    full hemisphere fits. mix=0.95 so Planck dominates and the
  //    DSS2 background recedes.
  {
    name: "planck-cmb-polarization",
    // Note: as of 2026-05 the Planck HFI_Color HiPS endpoint at CDS is
    // returning 404 (upstream regression). We fall back to the WISE
    // mid-IR overlay (which traces the same warm-dust structure Planck
    // 353 GHz does) at a 60% mix so the polarization vectors still
    // clearly streak along the galactic plane. The polarization layer
    // ships our own data so it always renders.
    hash: "#viewer?fov=90&ra=266.4&dec=-29&w=wise&mix=0.6&layers=planck-polarization",
    seedLayers: { "planck-polarization": true },
    postWaitMs: 9500,
  },

  // 10. Certificate — seed lesson-progress at 100% (all 15 lessons
  //    completed) and pre-set the name. App.tsx auto-opens the
  //    CertificatePanel on route change when overall progress is
  //    100% and the `uw:certificate:dismissed` flag is NOT set,
  //    so we just need to navigate to /#viewer and wait.
  {
    name: "education-certificate",
    hash: "#viewer?fov=60&ra=180&dec=20&c=1",
    extraStorage: buildCompletedLessons(),
    afterOpen: async (page) => {
      // The cert auto-opens; just wait for the modal to mount.
      await page
        .waitForSelector('[aria-label*="certificate" i], h2:has-text("Certificate")', { timeout: 4000 })
        .catch(() => {});
    },
    finalWaitMs: 1800,
    postWaitMs: 4500,
  },

  // 11. Exoplanets habitability — sky viewer aimed at the Kepler field
  //     (Cygnus/Lyra, RA ≈ 285°, Dec ≈ +44°) where 2,836 of the 6,286
  //     confirmed planets live — a 16× density spike vs. any other 30°
  //     bin on the sky. Wide FOV 110° so the Kepler cluster reads as
  //     a galactic-plane band of dots spilling out toward the rest of
  //     the sky. gaia-stars on for star-field depth. Constellations and
  //     labels OFF so planet dots dominate. The exoplanet field colors
  //     dots by discovery method by default (Radial Velocity orange,
  //     Transit blue, Microlensing green, Imaging cyan, …) — a rich
  //     palette regardless of whether the habitability color-mode pref
  //     is wired through.
  {
    name: "exoplanets-habitability",
    // FOV 60° — the Kepler-field cluster (RA ~290°, Dec +45°) at 60°
    // shows ~3,000 planets dotted across the sky as discrete points,
    // with the Milky Way disk crossing the lower half. Wider than 25°
    // (which made each planet huge and confused the read) but tighter
    // than the spec's 110° (which lost planets to sub-pixel size).
    // 60° is the sweet-spot where (a) every planet is a clear dot,
    // (b) the cluster reads as a busy field, and (c) the milky way
    // background sells the celestial-sphere context.
    hash: "#viewer?fov=60&ra=290&dec=45&layers=exoplanets-full,gaia-stars",
    seedLayers: {
      "exoplanets-full": true,
      "gaia-stars": true,
    },
    extraStorage: {
      // Color-mode preference — the field doesn't currently read it,
      // but seed it so when the prefs hook is wired the shot picks up
      // ESI gradient automatically.
      "uw:exoplanets:color-mode": "habitability",
    },
    collapseLeftRail: true,
    // 6,286 planets are a 1.1 MB JSON streamed lazily on enable —
    // allow ample fetch + GPU upload + first frame before screenshot.
    postWaitMs: 15000,
  },
];

function parseArgs(argv) {
  const args = { target: DEFAULT_TARGET, only: null, list: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target" || a === "--base") args.target = argv[++i] ?? args.target;
    else if (a === "--only") args.only = argv[++i] ?? null;
    else if (a === "--list") args.list = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(
        "usage: node tools/capture-v4-screenshots.mjs [--target URL] [--only NAME] [--list]\n",
      );
      process.exit(0);
    }
  }
  return args;
}

function withTimeout(p, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function captureShot(ctx, target, shot) {
  // Build the per-shot localStorage seed: base flags + per-shot extras
  // + the extra-layers store (if `seedLayers` set).
  const seed = buildLocalStorageSeed({
    ...(shot.extraStorage ?? {}),
  });
  if (shot.seedLayers) {
    seed["uw:extra-layers:v1"] = JSON.stringify(shot.seedLayers);
  }
  // Per-page init script so each shot gets its own storage state.
  const initScript = `(() => { try { const s = ${JSON.stringify(seed)}; for (const k of Object.keys(s)) { localStorage.setItem(k, s[k]); } } catch {} })();`;

  const page = await ctx.newPage();
  page.on("pageerror", (err) => {
    process.stdout.write(`! ${shot.name} pageerror: ${err.message}\n`);
  });
  await page.addInitScript({ content: initScript });

  const url = `${target}/${shot.hash || ""}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(shot.postWaitMs ?? 3500);

  // Optionally collapse the universe-mode LeftRail so the chrome
  // doesn't dominate the hero shot. (No persisted flag for this, so
  // we click it imperatively.)
  if (shot.collapseLeftRail) {
    const collapseBtn = page.locator('button[title="Collapse"]').first();
    if (await collapseBtn.count()) {
      await collapseBtn.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(400);
    }
  }

  if (shot.openPanel) {
    for (const sel of shot.openPanel) {
      try {
        const el = page.locator(sel).first();
        if (await el.count()) {
          await el.click({ timeout: 2500 });
          await page.waitForTimeout(700);
          break;
        }
      } catch {
        /* try next */
      }
    }
    if (shot.afterOpen) {
      await shot.afterOpen(page).catch((err) => {
        process.stdout.write(`! ${shot.name} afterOpen: ${err?.message ?? err}\n`);
      });
    }
    if (shot.finalWaitMs) {
      await page.waitForTimeout(shot.finalWaitMs);
    } else {
      await page.waitForTimeout(900);
    }
  } else if (shot.afterOpen) {
    // Some shots need afterOpen without an openPanel (e.g. tour-v2 uses
    // openPanel; certificate needs afterOpen; we keep both paths.)
    await shot.afterOpen(page).catch(() => {});
    if (shot.finalWaitMs) await page.waitForTimeout(shot.finalWaitMs);
  }

  const docsPath = join(DOCS_OUT, `${shot.name}.png`);
  await page.screenshot({
    path: docsPath,
    fullPage: false,
    omitBackground: false,
    scale: "css",
  });
  await copyFile(docsPath, join(PUBLIC_OUT, `${shot.name}.png`));
  // Legacy alias copy so the existing landing page <img src> tags keep
  // resolving while the README and FEATURES doc migrate to the new names.
  const alias = ALIASES[shot.name];
  if (alias) {
    await copyFile(docsPath, join(DOCS_OUT, `${alias}.png`));
    await copyFile(docsPath, join(PUBLIC_OUT, `${alias}.png`));
  }
  await page.close().catch(() => {});
  return docsPath;
}

async function main() {
  const { target, only, list } = parseArgs(process.argv);
  if (list) {
    for (const s of SHOTS) process.stdout.write(`${s.name}\n`);
    return;
  }
  await mkdir(DOCS_OUT, { recursive: true });
  await mkdir(PUBLIC_OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--no-sandbox",
    ],
  });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });

  // --only accepts a single name or a comma-separated list. Trims and
  // ignores empties so `--only a, b ,c` works.
  const onlyNames = only
    ? new Set(
        only
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;
  const targets = onlyNames ? SHOTS.filter((s) => onlyNames.has(s.name)) : SHOTS;
  if (onlyNames && targets.length === 0) {
    process.stderr.write(`No shots match "${only}".\n`);
    process.exit(1);
  }

  const manifest = [];
  for (const shot of targets) {
    const t0 = Date.now();
    try {
      const path = await withTimeout(
        captureShot(ctx, target, shot),
        PER_SHOT_TIMEOUT_MS,
        shot.name,
      );
      manifest.push({ name: shot.name, ok: true, ms: Date.now() - t0 });
      process.stdout.write(
        `OK ${shot.name}.png (${Date.now() - t0}ms) -> ${path}\n`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      manifest.push({ name: shot.name, ok: false, error: msg });
      process.stdout.write(`!! ${shot.name} — ${msg}\n`);
    }
  }

  await writeFile(
    join(DOCS_OUT, ".capture-manifest.json"),
    JSON.stringify({ target, capturedAt: new Date().toISOString(), shots: manifest }, null, 2),
  );
  await browser.close();
  const failures = manifest.filter((m) => !m.ok);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});
