/**
 * Public manifesto — the project's stance on funding and governance.
 * Sits between <Highlights/> and <OpenData/> on the landing route.
 *
 * Tone: friendly + matter-of-fact. We don't lecture; we tell visitors
 * exactly what kind of project this is so they're never surprised by a
 * paywall (because there will never be one).
 */

const TIP_URL =
  import.meta.env.VITE_TIP_URL ??
  "https://github.com/sponsors/sboghossian";

const RFC_URL =
  "https://github.com/sboghossian/unspeakable-world/discussions/categories/rfcs";

const POINTS: ReadonlyArray<{ glyph: string; title: string; body: string }> = [
  {
    glyph: "∞",
    title: "Zero paid tiers, ever.",
    body: "No Pro plan. No Premium layers. No login wall. The viewer you see today is the viewer everyone gets — on every device, in every country, forever.",
  },
  {
    glyph: "◇",
    title: "Sponsorships, not surveillance.",
    body: "Observatories and agencies can sponsor a layer in exchange for attribution on that layer. We accept funding for hosting, never for user data. We don't ship trackers, sell sessions, or operate a mailing list.",
  },
  {
    glyph: "✦",
    title: "Open governance by RFC.",
    body: "Anyone can propose changes via a public RFC on GitHub Discussions. Roadmap, layer roster, copy, license — all of it on the table, all of it in the open.",
  },
];

export function Manifesto() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-20">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          public stance
        </div>
        <h2 className="font-display text-3xl font-semibold md:text-4xl">
          Free forever.{" "}
          <span className="text-white/40">Free as in physics.</span>
        </h2>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {POINTS.map((p) => (
          <li
            key={p.title}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur"
          >
            <div className="font-display text-2xl text-emerald-200" aria-hidden>
              {p.glyph}
            </div>
            <div className="mt-2 font-display text-base text-white/95">
              {p.title}
            </div>
            <p className="mt-2 text-[13px] leading-snug text-white/60">
              {p.body}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-center text-sm text-white/55">
        If you want this to last,{" "}
        <a
          href={TIP_URL}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-amber-200 underline-offset-2 hover:underline"
        >
          tip the jar
        </a>
        . If you want to shape it,{" "}
        <a
          href={RFC_URL}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-cyan-200 underline-offset-2 hover:underline"
        >
          open an RFC on GitHub
        </a>
        .
      </p>

      <p className="mt-4 text-center text-sm text-white/45">
        <a
          href="#whoami"
          className="font-mono text-white/65 underline-offset-2 hover:text-white hover:underline"
        >
          Read the full story →
        </a>
      </p>
    </section>
  );
}
