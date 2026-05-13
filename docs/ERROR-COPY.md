# Error-copy style guide

The viewer is free, federated, and ships with no support staff. When
something fails, the message on screen *is* the support experience. This
document is the canonical guide for how those messages should sound.

The implementation lives in `apps/web/src/lib/error-copy.ts`. Every
user-visible error string in the viewer should resolve to a `getCopy()`
call — or be added to this guide and the library if it doesn't fit one
of the existing kinds.

## Tone

Three rules. In priority order:

1. **Friendly.** Never accusatory. "We couldn't reach SIMBAD" not
   "SIMBAD failed". "Your camera permission was denied" not "You denied
   camera access". The user is here because they're curious — don't
   punish them for that.

2. **Blame-shift away from the user.** The browser, the upstream
   service, the device — those can fail. The user can't "fail to use
   the viewer". If the camera is blocked, the browser is the actor
   ("…was denied" passive voice). If a fetch returns 500, the service
   is the actor ("SIMBAD didn't respond").

3. **Offer the next action.** Every error message ends with a pivot:
   "Try again", "Re-allow in browser settings", "Try the WebGPU build".
   If the user can't do anything ("the catalog has no entry for this
   point") tell them *what would change the answer*: zoom in, click
   closer to a bright object, try a wider Bortle class.

## Anti-patterns

- "An error occurred" — gives the user zero information and zero agency.
- "Please check your network connection" — patronising; we don't know
  *which* network failed.
- "Failed to load data" — passive but blames nobody useful; replace
  with "We couldn't reach &lt;service&gt;".
- "Permission denied by user" — never identify the user as the
  culprit; the *browser* enforced the denial, that's the actor.
- Raw stack traces in the body — keep them in a collapsed
  `<details>` so power users can dig in without scaring everyone else.
- Long jargon-y catalog names without a hint at what they are
  ("ALeRCE rejected the query") — name the service then explain it
  inline if needed ("ALeRCE, the alert broker, didn't respond").

## Canonical phrasings (10 examples)

These are the gold-standard versions of the ten errors that come up
most often. The library returns substitution-friendly variants of each
via `getCopy(kind, ctx)`.

1. **SIMBAD lookup failure**
   *"We couldn't reach SIMBAD just now. SIMBAD didn't respond — the sky's
   still here, and your data is safe. Try again in a moment."*
   — kind: `network`, service: "SIMBAD"

2. **Camera permission denied (AR Sky)**
   *"Your camera permission was denied. AR Sky needs to see what your
   phone sees — you can re-allow it from your browser settings."*
   — kind: `permission`, permission: "camera", feature: "AR Sky"

3. **WebGL2 unsupported**
   *"WebGL2 isn't available on this device. Your GPU appears blocked,
   or the browser shipped without WebGL2. The viewer can still load in
   WebGPU mode (experimental) or as a static gallery."*
   — kind: `webgl`

4. **Cosmic Copilot backend unreachable**
   *"We couldn't reach the Copilot backend. The remote model didn't
   answer — try the offline backend from the cog, or wait a minute and
   retry."*
   — kind: `network`, service: "Copilot backend"

5. **Live alerts (ALeRCE/ATel/GraceDB) feed empty**
   *"No recent ALeRCE classifications. The feed is alive but quiet
   right now — astronomy comes in bursts. Check back in a few minutes."*
   — kind: `missing-data`, service: "ALeRCE"

6. **CDS rate limit hit**
   *"SIMBAD is asking us to slow down. Too many requests in a short
   window — we'll automatically resume when the limit clears."*
   — kind: `rate-limit`, service: "SIMBAD"

7. **HiPS tile CORS block**
   *"ESASky blocked the request. ESASky doesn't allow direct browser
   access (CORS) for this tile set. The rest of the viewer is
   unaffected."*
   — kind: `cors`, service: "ESASky"

8. **Extra-layer module failed to mount**
   *"The Multimessenger layer fell back. Something went sideways
   loading the module — the rest of the sky is fine. Try toggling it
   off and on."*
   — kind: `unknown`, feature: "Multimessenger"

9. **Geolocation denied (Tonight's targets)**
   *"Your location permission was denied. Tonight's targets needs your
   approximate location to compute what's above the horizon — pick a
   city from the observer picker instead."*
   — kind: `permission`, permission: "location",
   feature: "Tonight's targets"

10. **Generic crash caught by an error boundary**
    *"Something went sideways. The viewer fell back to a safe state —
    we've reported the error and your settings are untouched. Refresh
    to keep going, or reset settings if you'd like a clean slate."*
    — kind: `unknown`

## Wiring it up

```ts
import { getCopy, inferKind } from "../../lib/error-copy";

const copy = getCopy(inferKind(err), {
  service: "SIMBAD",
  retry: () => refetch(),
});

return (
  <div role="alert" className="…">
    <div>{copy.title}</div>
    <p>{copy.body}</p>
    {copy.action && (
      <button onClick={copy.action.onClick}>{copy.action.label}</button>
    )}
  </div>
);
```

The five most-visible error spots in the viewer (SkyInfoPanel,
ArSkyOverlay, CopilotPanel, TransientsPanel, ExtraLayersPanel) have
already been refactored to use this helper — see them for working
examples.

## Adding a new kind

1. Add a string to the `ErrorKind` union in `error-copy.ts`.
2. Add a `case` to the `switch` in `getCopy()`.
3. Add the canonical phrasing under "Canonical phrasings" in this file.
4. Update the heuristic in `inferKind()` so plain `.catch()` paths can
   resolve to the new kind without explicit tagging.

Keep the list short. Every new kind is another shape of failure the
user has to recognise — bundle them where you can.
