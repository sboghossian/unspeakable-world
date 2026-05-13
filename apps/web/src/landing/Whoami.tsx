import { Starfield } from "./Starfield";

/**
 * /whoami — long-form author page. Single column, max-width 720px,
 * served at `/#whoami` via the hash router.
 *
 * Tone: solo-dev integrity. Honest about what's shipped, what's not,
 * and how the project stays free. No "follow me" socials that don't
 * exist, no fake metrics, no asks beyond a tip jar.
 */

const KOFI_URL =
  import.meta.env.VITE_KOFI_URL ?? "https://ko-fi.com/sboghossian";

const GITHUB_SPONSORS_URL =
  import.meta.env.VITE_GITHUB_SPONSORS_URL ??
  "https://github.com/sponsors/sboghossian";

const SPONSOR_INQUIRY_EMAIL = "sponsor@unspeakable.world";

const LAST_UPDATED = "2026-05-13";

const SHIPPED_WAVES: ReadonlyArray<{ era: string; title: string; body: string }> = [
  {
    era: "Wave 1",
    title: "HiPS surveys + Voyager camera",
    body:
      "Real DSS2, 2MASS and WISE tiles streaming from CDS Strasbourg onto a 3-D celestial sphere. Voyager-style target-anchored orbit, tap-to-fly, render-on-demand to keep laptops cool.",
  },
  {
    era: "Wave 2",
    title: "Federation, not ingestion",
    body:
      "SIMBAD / NED / VizieR through a Cloudflare Worker proxy. ISS, satellite TLEs, NEO risk, ZTF supernova alerts, solar wind — every feed pulled live from the source archive that owns it.",
  },
  {
    era: "Wave 3",
    title: "Universe Mode v2, Copilot, WebGPU spike",
    body:
      "One camera from AU to gigaparsecs. A grounded AI copilot that answers from open catalogs (not hallucinations). Optional WebGPU path for the renderer when the browser exposes it.",
  },
  {
    era: "Wave 4",
    title: "Polish, mission narratives, cosmic web",
    body:
      "JWST / Chandra / Planck mosaics. Mission timelines (Voyager, JWST, Perseverance) as scrubbable stories. CosmicFlows-4 galaxy velocity field and a Local Group structure layer.",
  },
];

const ROADMAP: ReadonlyArray<string> = [
  "Production HEALPix renderer — fix the polar seam, proper LOD crossfade, texture atlas",
  "Multi-language UI past English (already wired; need translators for FR / ES / AR / ZH)",
  "Citizen-science prompts — Zooniverse hand-off when you click an unclassified source",
  "Teacher dashboard hardening — class codes, lesson assignment, progress export",
  "Offline-first PWA cache for the bundled Hipparcos / HYG / NGC catalogs",
  "Native AR / gyro mode for `/#tonight` on iOS Safari without the permission cliff",
  "Federated comments — annotate any object, mirror to a public ATProto feed",
  "An RFC-driven public roadmap (already drafted in GOVERNANCE.md, needs the actual board)",
];

const OTHER_PROJECTS: ReadonlyArray<{
  name: string;
  blurb: string;
  href: string | null;
}> = [
  {
    name: "HAQQ Legal AI",
    blurb:
      "My day job — building grounded legal-research tooling for HAQQ Inc. Where the rent comes from.",
    href: "https://haqq.ai",
  },
  {
    name: "STARK",
    blurb:
      "A 500-page sci-fi novel, 26 chapters drafted with painterly cinematic plates. Read it in the browser.",
    href: "https://stark.dashable.dev",
  },
  {
    name: "Awkar family compound",
    blurb:
      "Pre-architect package for a two-house family build above Beirut — 3-D site model and survey SVGs.",
    href: "https://awkar.dashable.dev",
  },
  {
    name: "Groot",
    blurb:
      "Dead-man-switch legacy site for the people I love — a wiki that turns public the day I stop checking in.",
    href: "https://groot.dashable.dev",
  },
];

const CONTACT_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  detail: string;
}> = [
  {
    label: "GitHub Discussions",
    href: "https://github.com/sboghossian/unspeakable-world/discussions",
    detail: "RFCs, feature debate, roadmap input",
  },
  {
    label: "GitHub Issues",
    href: "https://github.com/sboghossian/unspeakable-world/issues",
    detail: "bug reports, repro steps welcome",
  },
  {
    label: "Twitter / X",
    href: "https://twitter.com/search?q=%23UnspeakableWorld&src=typed_query",
    detail: "tag #UnspeakableWorld",
  },
  {
    label: "Bluesky",
    href: "https://bsky.app/search?q=%23UnspeakableWorld",
    detail: "tag #UnspeakableWorld",
  },
  {
    label: "Email",
    href: "mailto:hello@unspeakable.world",
    detail: "personal mail — read, not always answered fast",
  },
];

export function Whoami() {
  return (
    <main className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-space-950">
      <Starfield />
      <div className="relative z-10 mx-auto w-full max-w-[720px] px-6 pb-24 pt-20">
        {/* Hero */}
        <header className="mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300/90">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            whoami
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-white/95 md:text-5xl">
            Stephane Boghossian
          </h1>
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.18em] text-white/55">
            solo builder · Beirut, Lebanon
          </p>
          <p className="mt-6 text-lg leading-relaxed text-white/75">
            Currently building{" "}
            <span className="text-white/95">The Unspeakable World</span> — a
            free, OSS, federated front-end to the entire universe. Open it in
            a browser tab. Pan from your living room to the edge of the
            observable cosmos. Nothing to install, no account, no paywall.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            This page exists so visitors know who's behind the project, where
            it stands, and how it stays alive without anyone selling anyone
            else.
          </p>
        </header>

        {/* Why this exists */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-white/95">
            Why this exists
          </h2>
          <div className="mt-5 space-y-5 text-[15px] leading-relaxed text-white/70">
            <p>
              There are good planetarium apps. Stellarium is a marvel.
              NASA's Eyes is gorgeous. Aladin Lite lets professionals
              federate sky surveys from a research workstation. None of
              them, though, are the same thing: a single browser tab a
              curious teenager can open from a school chromebook in
              Beirut, Lagos or Quito, and see — actually see — the entire
              visible universe, with the actual data behind it.
            </p>
            <p>
              I started this because the gap was embarrassing. The world's
              observatories ship terabytes of public-domain imagery every
              year. Their archives are the largest open dataset humans
              have ever produced about anything. And the consumer-facing
              way most people experience that data is a Google Image
              search.
            </p>
            <p>
              I picked <span className="text-white/90">federate, don't ingest</span>{" "}
              because it's the only design that scales without me. I will
              never run a CDN big enough to mirror DSS2, 2MASS, WISE,
              Chandra and JWST. CDS Strasbourg already does, brilliantly.
              The Unspeakable World streams from them, attributes them,
              and stays out of their way. If I disappear tomorrow, the
              archives outlive me.
            </p>
            <p>
              And I picked <span className="text-white/90">free forever</span>{" "}
              because the alternative is the alternative. A pacifist
              politics about open data, public observatories, and
              anti-monopoly tools isn't a posture — it's the only design
              that doesn't end with another walled garden charging rent
              on the night sky. The publicly funded science that makes
              this app possible should stay publicly accessible. Full
              stop.
            </p>
          </div>
        </section>

        {/* What's shipped */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-white/95">
            What's shipped
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Four waves so far, all in the open. Every commit lands on{" "}
            <span className="font-mono text-white/70">main</span> the day
            it's written.
          </p>
          <ol className="mt-6 space-y-4">
            {SHIPPED_WAVES.map((w) => (
              <li
                key={w.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
                  {w.era}
                </div>
                <div className="mt-1 font-display text-lg text-white/95">
                  {w.title}
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-white/65">
                  {w.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* What's next */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-white/95">
            What's next
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Honest list, not a marketing pitch. Some of these are weeks
            of work, some are months, some need a collaborator I haven't
            met yet.
          </p>
          <ul className="mt-6 space-y-3 text-[14px] leading-relaxed text-white/70">
            {ROADMAP.map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-400/70"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Sustainability */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-white/95">
            How this stays alive
          </h2>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-white/70">
            <p>
              The Unspeakable World is{" "}
              <span className="text-white/95">free, forever</span>. There
              is no Pro tier in the roadmap, no Premium layer, no login
              wall, no enterprise SKU. Not "free for now" — free as a
              public commitment, the same way the observatories whose
              data we stream are public commitments.
            </p>
            <p>
              Sponsorships are accepted from observatories, agencies and
              academic groups in exchange for attribution on the layer
              they fund. No user-data resale, no behavioural tracking,
              no mailing list rented to a third party. If a feed shows
              up here, it's because the archive said yes and the
              attribution is on the badge.
            </p>
            <p>
              If you find the project useful and want to keep the
              R2 buckets paid for, the tip jar lives here:
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-amber-200 transition hover:bg-amber-400/20"
            >
              <span aria-hidden>☕</span>
              Tip on Ko-fi
            </a>
            <a
              href={GITHUB_SPONSORS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/10"
            >
              GitHub Sponsors
            </a>
            <a
              href={`mailto:${SPONSOR_INQUIRY_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              Sponsor inquiry →
            </a>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
            sponsor inquiry inbox is a placeholder — DNS lands when the
            first observatory says yes.
          </p>
        </section>

        {/* Other projects */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-white/95">
            Other things I'm building
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Solo builders never have just one project. These are the
            ones with public surfaces.
          </p>
          <ul className="mt-6 space-y-3">
            {OTHER_PROJECTS.map((p) => (
              <li
                key={p.name}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-display text-base text-white/95">
                    {p.name}
                  </div>
                  {p.href ? (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-mono text-[11px] uppercase tracking-[0.18em] text-plasma-300/80 transition hover:text-plasma-300"
                    >
                      {p.href.replace(/^https?:\/\//, "")} →
                    </a>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">
                  {p.blurb}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Get in touch */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-white/95">
            Get in touch
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Only the places that actually exist. No Discord, no Slack,
            no Telegram — I'd rather keep the conversation searchable.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {CONTACT_LINKS.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer noopener"
                  className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/5"
                >
                  <div className="font-display text-sm text-white/90">
                    {l.label}
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/45">
                    {l.detail}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/5 pt-8 text-[12px] text-white/40">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>
              © Stephane Boghossian · MIT licensed source ·{" "}
              <a
                href="https://github.com/sboghossian/unspeakable-world/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer noopener"
                className="text-white/55 hover:text-white"
              >
                LICENSE
              </a>
            </span>
            <span className="font-mono">last updated {LAST_UPDATED}</span>
          </div>
          <p className="mt-3">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "";
              }}
              className="text-white/55 hover:text-white"
            >
              ← back to the landing page
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
