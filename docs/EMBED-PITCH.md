# Embed pitch — outreach copy

A template email plus a target list for getting the
[embed templates](./embed/README.md) onto science blogs, popular
astronomy outlets, and Wikipedia-adjacent communities.

## Template email (3 paragraphs)

> **Subject:** A free, MIT-licensed sky viewer your readers can embed —
> The Unspeakable World

> Hi `[NAME]`,
>
> I'm Stephane, the maintainer of
> [The Unspeakable World](https://unspeakable-world.dashable.dev) — an
> open-source, MIT-licensed front-end to the entire Virtual Observatory.
> Every wavelength of every public sky survey (HiPS via CDS, IRSA,
> ESASky), live ISS / planets / transients, no account or API key, in
> a browser. It costs us \$0/month per reader thanks to Cloudflare R2's
> free egress, so we can guarantee it stays free.
>
> I built five drop-in iframe embed templates — tonight's sky, single
> Messier object, multi-wavelength compare, live ISS, multi-messenger
> alerts — that I think `[OUTLET]` could use directly in posts.
> Snippets are at <https://github.com/sboghossian/unspeakable-world/tree/main/docs/embed>
> and the embed mode is real (`?embed=1` strips the chrome). A reader
> on your `[M31 / Crab / black-hole / GW170817]` piece would actually
> *fly* through it instead of looking at a static JPEG.
>
> No fee, no asks — just credit ("Sky embed: The Unspeakable World")
> if you use one. Happy to send a custom embed pre-pointed at any
> specific object your editorial calendar covers next month. Source's
> all MIT — fork it, host it, change it.
>
> — Stephane (stephanemboghossian@gmail.com)

## Target list (10 outlets)

1. **Phys.org** — Posts dozens of astronomy press-release rewrites every
   day; their articles already link out to imagery. An embed of the
   specific object in each piece would be a step-change upgrade with
   zero per-article work for their editors.
2. **ScienceDaily** — Same news-wire format as Phys.org but with a more
   curated front page; an embed adds the "now do it yourself" hook that
   ScienceDaily currently lacks.
3. **NASA APOD comments (Reddit `r/APOD` + APOD-discuss)** — Daily
   image of the day with a passionate technical audience; an embed of
   the exact RA/Dec of the day's image would be reposted nightly.
4. **Astronomy.com** — Magazine of the AAS-adjacent audience, big on
   "what's up this month" features; the `today.html` template *is* that
   feature.
5. **Sky & Telescope** — The other amateur-astronomy magazine of record;
   their digital "interactive sky chart" widget is paywalled — ours is
   free and MIT.
6. **Universe Today (Fraser Cain)** — Long-form science blogging with a
   strong YouTube cross-promo; Fraser's already an embedder of third-
   party visualizations.
7. **Bad Astronomy / Phil Plait (now `In Saturn's Rings` newsletter)** —
   The genre-defining astronomy blog; Phil already links Aladin Lite and
   would notice a free MIT alternative.
8. **xkcd what-if** — Randall Munroe occasionally writes astronomy "what
   if?" pieces; a single embed of the specific object in question would
   be a perfect fit and an outsized traffic spike.
9. **Aeon** — Long-form essays where embeds are rare *because* most
   sky viewers are paywalled / unstable; Aeon's editorial bar means
   getting in there is a credibility multiplier.
10. **Quanta Magazine** — Simons Foundation-funded, exquisitely
    illustrated; their multimedia team has shipped custom D3 explorers
    before. An MIT viewer they can embed without legal review is rare.

## Suggested first 3 (highest-leverage)

If you only have time to send three emails this week, send to:

1. **Phys.org** — fastest funnel; an embed in even one article ≈ tens
   of thousands of viewer sessions.
2. **Universe Today** — Fraser will say yes within a day and rebroadcast
   on his channel.
3. **Sky & Telescope** — institutional credibility; "embedded in S&T"
   unlocks every museum and planetarium afterward.

## Wikipedia-adjacent outreach

In parallel with the blog list, the
[`apps/wiki-ext/`](../apps/wiki-ext/) browser extension is the
distribution channel for the Wikipedia audience itself. Once it
clears Chrome Web Store + Mozilla Add-ons review, the post to
seed it is:

- **r/Astronomy** ("I built a free Chrome extension that adds a
  'Fly to in The Unspeakable World' button to every Wikipedia
  astronomy article")
- **Hacker News** Show HN
- **Wikipedia astronomy WikiProject talk page** (gauge interest in
  an official `mw.hook` integration that doesn't need an extension)
