# Voice — The Unspeakable World

> One author wrote this. Every label, every error, every tour caption.
> When you write copy for this project, write like that author.

## Tone

**Confident · curious · plainspoken · slightly poetic.**

We are a working astronomer who reads to their kid at bedtime. We know
the cosmic microwave background is 380 000 years old, but we'd rather
tell you it's the moment the universe became transparent. We don't
hedge ("kind of", "sort of", "maybe"). We don't gush either ("amazing!",
"incredible!"). The sky is amazing on its own; our copy stays out of
the way.

## Person

- **2nd person ("you")** — for product UI, tooltips, errors,
  microcopy. *"Pick a target", "You're 4.2 light-years from Earth."*
- **1st singular ("I")** — only inside `/whoami`. Anywhere else, "I"
  reads like marketing. The author signs the about page; everything
  else is the tool talking.
- **3rd person impersonal** — for science prose in lessons, info
  panels, and tour bodies. *"The Crab Nebula's filaments race outward
  at 1 500 km/s."* No "we" except when describing humans-as-a-species
  in deep-time copy ("we are the universe looking at itself").

## Length

**Punchy.** A button is a verb. A tooltip is one sentence. A lesson
narration step is two-to-four sentences. If a label is more than five
words, it's a tooltip in disguise — rewrite it.

| Bad                                          | Better       |
| -------------------------------------------- | ------------ |
| "Open the Cosmic Copilot panel"              | "ask"        |
| "Click here to switch to Solar Flight Mode"  | "🚀 solar"   |
| "There was an error loading the data"        | "Couldn't fetch the catalog. Retry?" |
| "Welcome to The Unspeakable World!"          | (delete)     |

## Avoid

- **Jargon without context.** We can say "redshift" *if* the next
  clause tells you what that means. Never assume the reader has the
  vocab. Never sneer at them either.
- **Marketing buzzwords.** No "revolutionary", "unprecedented",
  "next-gen", "seamless experience", "delight". We have actual things
  to say.
- **Exclamation marks.** Forbidden inside the viewer chrome. Allowed
  on CTAs in the landing hero. *Two* exclamation marks per page max.
- **Passive voice.** "The catalog was loaded" → "We loaded the
  catalog." Or better: drop the sentence entirely.
- **Apologies.** "Sorry, an error occurred" → "Couldn't fetch — try
  again." (See `docs/ERROR-COPY.md` for the full error-copy guide.)
- **"Just" / "simply".** They patronise. Cut them.
- **Sentence-final emoji.** Decorative inline emoji is fine (🌌 🚀).
  But never end a sentence with a smiley.

## Specifically for astronomy

- Distances **always carry units**. "4.2 ly", not "4.2 light years"
  inline; the symbol is more readable in monospace and shorter on
  mobile. Long-form units are fine in prose ("4.2 light-years away").
- Magnitudes use the lowercase "mag" prefix. "mag 6.2", not "6.2
  magnitude".
- Right ascension / declination always carry the J2000 epoch label
  the first time they appear in a panel.
- The Sun is always "the Sun" (capital S) when we mean *our* star.
  "a sun" lowercase when we mean any star.
- "Black hole" not "blackhole". "Light-year" hyphenated as a noun
  modifier ("a 26 000 light-year journey"); "light years" two words
  when bare ("about 50 light years away").

## Examples — the 20 most-visible strings, rewritten

These are the strings used most often across landing + viewer. Each
one is the new canonical English in `apps/web/src/i18n/strings/en.ts`,
chosen against the rules above.

1. **Hero subtitle.** *"Every wavelength of every sky survey, one
   seamless camera. Free forever."*  — was 14 words, now 11.
2. **Hero CTA.** *"🌌 Enter the Universe"* — verb-led, single line.
3. **Hero secondary nav.** *"Free · MIT · No account · Works on
   every device"* — four staccato facts. No marketing fluff.
4. **Manifesto pull-quote.** *"Federate, don't ingest. Render only
   what's visible. Never charge for the sky."* (kept verbatim — it
   already nails the voice).
5. **Footer.** *"Built on the shoulders of"* — old: *"Built on the
   shoulders of"*. Already perfect.
6. **Footer share line.** *"Share what you see → tag #unspeakable-
   world on Twitter/X or Bluesky."* — was a 60-word paragraph.
7. **Viewer top-bar `exit`.** Lowercase, two letters. The Sky is the
   noun; the button is the chrome.
8. **Viewer search placeholder.** *"Search the sky"* — was *"Search
   the sky atlas (objects, stars, missions...)"*. Verbose hints
   belong in tooltips, not placeholders.
9. **Copilot button.** *"ask"* — the shortest verb that means it.
10. **Copilot placeholder (no focus).** *"What am I looking at?"* —
    was *"Ask anything about the sky…"*. Curiosity-first.
11. **Copilot placeholder (focus).** *"Ask about {name}…"* — gives
    the reader the verb and the noun, in that order.
12. **Layers panel title.** *"Federated data"* — was *"Extra
    federated layers"*. The "extra" was apologetic.
13. **Tour step counter.** *"Step {step} of {total}"* — full words.
    "1/12" reads like a fraction; "Step 1 of 12" reads like English.
14. **Tour `finish` button.** Single word, lowercase. Old "Done!"
    had a banned exclamation mark.
15. **Settings header.** *"⚙ settings"* — icon plus lowercase noun.
    Old: *"⚙ Settings panel"*.
16. **Settings groups.** *"Performance · Display · Audio · Identity
    · Power user · Privacy"* — six headings, each a single noun.
17. **Lessons intro.** *"Short, narrated tours of where we are in
    the universe. Each one takes you somewhere real."* — two
    sentences, second-person, no jargon.
18. **Certificate prompt.** *"We never asked for an account, so we
    don't know your name. Type whatever you'd like printed on the
    certificate."* — explains the design choice (no email) in the
    same breath as the question.
19. **Certificate award line.** *"has completed all 15 lessons of
    The Unspeakable World — Astronomy Fundamentals, a guided tour
    from the surface of Earth to the cosmic web."* — one sentence.
    The em-dash is doing real work.
20. **Generic load error (paired with `docs/ERROR-COPY.md`).**
    *"Couldn't reach the catalog. We'll keep what's already loaded
    and keep trying in the background."* — actionable, owns the
    failure, tells the reader what we're doing about it.

## Where this voice lives

- `apps/web/src/i18n/strings/en.ts` — source of truth for every
  flat-keyed UI string. PRs that add UI text MUST add the new key
  here; the build will not break if you skip it, but the i18n hook
  logs a missing-key warning once per session.
- `docs/ERROR-COPY.md` — error-message-specific patterns (sister
  document; this one wins on conflicts).
- `apps/web/src/landing/Manifesto.tsx`, `Hero.tsx`, `Whoami.tsx` —
  long-form prose. These three files are the voice ground-truth
  beyond the flat-key dictionary.

## When you're stuck

Read the string out loud. If it sounds like a marketing email, kill
it. If it sounds like a friend pointing at the sky and saying *"look
at this"*, ship it.
