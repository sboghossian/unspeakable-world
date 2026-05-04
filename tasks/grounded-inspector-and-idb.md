# Grounded inspector + IndexedDB cache + imagery fixup

Plan for `feat/grounded-inspector-and-idb`.

## 1. IndexedDB cache (`apps/web/src/lib/idb-cache.ts`)

- [x] `idb.get<T>(store, key)` / `put` (with TTL) / `clear` / `clearAll`
- [x] Versioned upgrade creating stores: `simbad`, `wikipedia`, `ads`,
  `imagery`, `pulsars`, `exoplanets`
- [x] Best-effort: any error / missing IDB returns null, never throws

## 2. Wire-through cache reads

- [x] `wikipedia.ts` — read-through, 7-day TTL
- [x] `simbad.ts` — read-through, 24-hour TTL
- [x] Universe catalog binary fetches (pulsars, exoplanets) — IDB write-through

## 3. Grounded summary (`apps/web/src/viewer/info/grounded-summary.ts`)

- [x] Pure deterministic concat: Wikipedia lead + SIMBAD type/params
- [x] Returns `{ summary, sources: [{label,url}] }`
- [x] InfoSection kind `'grounded'`
- [x] InfoPanel renders collapsible block with sources + disclaimer
- [x] `bodyFactsToPayload` and `cosmicLandmarkFactsToPayload` add a
  placeholder grounded section that fills via React state

## 4. Settings panel

- [x] "Clear local cache" button calls `idb.clearAll()` + localStorage

## 5. Imagery URL fixup

- [x] Replace placeholders with verified URLs (subject to HEAD verifier)
- [x] `scripts/verify-imagery.ts` — HEAD all URLs, exit non-zero on any 404
- [x] `pnpm --filter web verify:imagery` script
