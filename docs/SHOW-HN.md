# Show HN — launch kit (v4)

## TL;DR (the post)

**Title (≤ 80 chars):**

```
Show HN: The Unspeakable World – federated browser planetarium, free forever
```

**URL:**

```
https://unspeakable-world.dashable.dev
```

**Body (first comment, posted right after submission):**

```
Hi HN — I'm Stephane, a solo builder in Beirut. The Unspeakable World
is a free, MIT, browser-only viewer that federates ~25 public sky
datasets and lets you fly through them on one seamless camera, from
Earth's atmosphere out to the cosmic web.

What you can do in a tab:

  • Cross-fade 14 HiPS surveys: Pan-STARRS · SDSS9 · DESI Legacy DR10 ·
    2MASS · WISE · GALEX UV · NVSS / VLASS / TGSS radio · Fermi γ ·
    Planck CMB · INTEGRAL X-ray · HST.
  • Drift through 1,000,000 parallax-derived Gaia DR3 stars (real
    distances, not a 2D sphere).
  • Toggle 136,596 nearby galaxies in 3D from 2MRS + 6dFGS, with
    Laniakea, the Great Attractor, Shapley Concentration and the CfA2
    Great Wall as labeled rendered structures.
  • Listen to LIGO/Virgo GWTC-3 gravitational-wave chirps and watch
    IceCube neutrinos / Auger UHECRs / NANOGrav pulsar timing array on
    the same celestial sphere.
  • Ask the Cosmic Copilot (Cloudflare Workers AI Llama 3.1 8B w/
    tool-calling) — "Show me M31 in infrared" actually flies the
    camera and switches the overlay.
  • Walk through 15 lessons w/ printable Ed25519-signed certificates,
    20-30 of 40 procedurally-rendered named galaxies (Sombrero, M51,
    Cen A), 6 quality presets, AR Sky on mobile, FITS upload + ADQL
    against VizieR, real Planck PR3 SMICA polarization baked at NSIDE
    16, real SPICE trajectories for Voyager 1/2/New Horizons/Parker/
    JWST, live ZTF/ATel/Sentry transient alerts, and 16 sky cultures
    (Western, Chinese, Polynesian, Lakota, Arab, Inuit, Egyptian,
    Maya, Boorong, Norse, Maori, Japanese, Korean, Sami, Tongan,
    Tukano).

  No ads. No accounts. No paid tiers, ever. Sponsorships from
  observatories accepted in exchange for layer attribution, never
  user data. Funded by a Ko-fi tip jar.

Stack (everything MIT):
  Vite 6 · React 19 · TypeScript strict · Three.js r171
  @hscmap/healpix (pure-TS HEALPix) · AstronomyEngine · satellite.js
  Cloudflare Pages + Pages Functions + Workers AI + KV
  Three.js WebGPU renderer opt-in behind a flag

What it is NOT: a planetarium app (Stellarium does that better in
2D), a spacecraft viewer (NASA Eyes does that), or a procedural
universe (SpaceEngine does that on desktop). It's the same view, but
every dot is a real observation.

Source: https://github.com/sboghossian/unspeakable-world
Manifesto: https://unspeakable-world.dashable.dev/#manifesto
Whoami: https://unspeakable-world.dashable.dev/#whoami

Happy to answer questions about the federation architecture, the
HiPS tile streaming, the multi-messenger sky pipeline, or anything
else. Built in public — every commit on `main`.
```

## Pre-launch checklist

- [ ] **Sanity-test the demo URL** — open `https://unspeakable-world.dashable.dev/` in a fresh tab. Landing page renders. Hero CTA reaches `/#universe`. The viewer loads. Toggle gaia-stars in the ✨ panel — see 1M stars. Toggle multi-messenger — see the 4 sub-layers. Click "🧠 ask" — Cosmic Copilot panel opens. Type "fly to M31" — Copilot answers (verify Cloudflare Workers AI is responding).
- [ ] **OG card** — `https://unspeakable-world.dashable.dev/og-card.png` returns the v4 image. (If still old, regenerate.)
- [ ] **Mobile sanity** — open on iPhone Safari. Top bar collapses cleanly. ✨ layers panel works. AR Sky button visible. Tutorial-overlay onboarding doesn't block initial paint.
- [ ] **Performance** — first paint < 3 s on a mid-range desktop / < 6 s on a slow phone. Verify via Lighthouse on the production URL.
- [ ] **Telemetry** — confirm PostHog + Sentry env vars are set in Cloudflare Pages, OR confirmed env-empty no-op (no console errors related to telemetry init).
- [ ] **Cron** — `wrangler tail unspeakable-cron` runs cleanly. Manual trigger via wrangler dashboard or `wrangler triggers cron unspeakable-cron` if available.
- [ ] **Rate limits** — Cloudflare Workers AI free tier is ~10K neurons/day. HN front page = potential 100K+ hits. Set rate limit on `/api/copilot` aggressively (already KV-backed, but verify the limit values).

## Best time to post

- Tuesday or Wednesday, **10:00 AM Eastern (15:00 UTC)** — historically the strongest HN window.
- Avoid Mondays (post-weekend noise) and Fridays (drop-off into weekend).
- Avoid major news days (election cycles, AI launches).

## Tags + cross-post strategy

After 30 min on HN front page:
- Reddit r/space, r/astronomy, r/astrophotography (separate posts, NOT cross-posts — each community gets a tailored intro)
- r/threejs — focus on the engine + WebGL2/WebGPU swap
- r/webdev — focus on the data federation + Cloudflare stack
- Twitter / Bluesky / Mastodon — short thread with screenshots, tag #unspeakable-world
- Lobsters — `astronomy` and `web` tags

## Q&A prep (likely questions)

**Q: How is this different from Stellarium / NASA Eyes / Aladin Lite?**
A: Federation. Stellarium is a planetarium (2D, no flight). NASA Eyes is a spacecraft viewer (no stars, no DSO). Aladin is a sky atlas (gorgeous, but 2D and GPL). UW is the first browser-native viewer that federates ~25 different public catalogs + 14 HiPS surveys into one seamless 6DOF scene from AU to Gly.

**Q: Why MIT not GPL?**
A: I want this work to be usable everywhere — research, education, journalism, observatories, even commercial planetariums. MIT removes friction. The catalogs retain their own licenses (mostly CC-BY); attribution is in the in-app credits panel.

**Q: How do you handle 1M Gaia stars at 60 fps?**
A: GPU-instanced Points cloud with a custom shader: BP-RP → temperature → blackbody RGB via lookup table, Pogson-magnitude sizing, distance-based opacity falloff. Render-on-demand: pause rAF after 250ms of camera idle. Density buckets (100K / 500K / 1M) via the quality preset. Real parallax 3D positions, so flying past a foreground star feels right.

**Q: Why federate vs ingest?**
A: I host nothing > 50 MB total. CDS Strasbourg has 30 years of HiPS infrastructure I'll never match. Every observatory keeps publishing; my job is to make their data flyable, not to mirror it. Federation also means catalogs stay live — when Gaia DR4 drops, I swap one URL.

**Q: How do you pay for this?**
A: Cloudflare's free tier covers everything currently. Ko-fi tip jar live. Sponsorships from observatories accepted in exchange for layer attribution. Never paid tiers, never user-data resale.

**Q: AI tool-calling — what model, how grounded?**
A: Cloudflare Workers AI `@cf/meta/llama-3.1-8b-instruct` via Pages Function. Tool schema: fly_to / set_layer / set_time / set_overlay / take_snapshot / set_mode. Grounded by current scene state (focused object, FOV, active overlays). Fallback: 32-answer curated offline lookup table.

**Q: Mobile?**
A: PWA installable. AR Sky mode with rear-camera passthrough + gyro fusion on iOS Safari ≥ 13 + Chrome Android. Quality preset auto-detects mobile → low. Big buttons, hamburger drawer, embed mode for iframes on phones.

**Q: WebGPU?**
A: Opt-in behind a flag. Three.js r171's WebGPURenderer handles our ShaderMaterials. Falls back to WebGL2 silently on init failure. Default users pay 0 extra bundle cost (the WebGPU chunk is lazy).

**Q: Why "Unspeakable" World?**
A: Roughly: there's a tradition in negative theology where some experiences are "unspeakable" — you can't fully capture them in words. The night sky is one of those. The product is an attempt to *show* what can't be said.

## After the post

Engage in the thread for ~12 hours. Answer every question that isn't hostile. Take feedback seriously. Don't argue.

If the post hits front page:
- Watch Cloudflare Workers AI neuron usage. If approaching the daily cap, throttle Copilot temporarily by lowering the rate limit values in KV.
- Watch Sentry for crashes — fix top 3 within 1 hour if any.
- Capture the moment: screenshot the HN front page + a few good comments. Add to `docs/MEDIA.md`.

If the post doesn't take off:
- It's fine. Not every great product wins HN. Try Lobsters next, then r/astronomy with a tailored post.
- Iterate on the headline. The most common reason a Show HN flops is the title.
