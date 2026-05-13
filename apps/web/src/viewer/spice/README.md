# spice — spacecraft trajectory archive (scaffold)

A federation module that overlays heliocentric polylines for famous
deep-space probes on the solar-mode scene.

## What ships today

End-to-end scaffold:

- `index.ts` — `LAYER_META` + `mountLayer` per the
  `ExtraLayerModule` contract.
- `trajectory-loader.ts` — typed fetcher / parser for
  `apps/web/public/data/spice-trajectories.json`.
- `field.ts` — `SpiceTrajectoryField` three.js group that renders each
  probe's path as a colored `Line` in heliocentric AU.
- Registered in `extra-layers/registry.ts` under id
  `spice-trajectories`, mode `solar`.

**The data file is intentionally missing.** Without it the layer
mounts cleanly and renders nothing — toggling it on is a safe no-op.

## How to ship real trajectories

```sh
pnpm --filter @unspeakable/web bake:spice
```

That's the goal. The script is also a scaffold:

`scripts/bake-spice.ts` hits `https://ssd.jpl.nasa.gov/api/horizons.api`
per probe, parses the vector-table response, and writes
`apps/web/public/data/spice-trajectories.json` matching the schema
documented in `trajectory-loader.ts`.

Until you run it, you'll see a `404` for the JSON in the network panel.
The loader downgrades that to a single `log.warn` and the layer stays
visible-but-empty.

## v1 probes (five)

| id                  | label              | SPK ID | era covered      |
| ------------------- | ------------------ | ------ | ---------------- |
| `voyager-1`         | Voyager 1          | -31    | 1977-09 → today  |
| `voyager-2`         | Voyager 2          | -32    | 1977-08 → today  |
| `new-horizons`      | New Horizons       | -98    | 2006-01 → today  |
| `parker-solar-probe`| Parker Solar Probe | -96    | 2018-08 → today  |
| `jwst`              | JWST               | -170   | 2021-12 → today  |

(See `EXPECTED_PROBES` in `trajectory-loader.ts`.)

## Phase 2 — every probe ever flown

Two paths, each multi-week:

### A) WASM SPICE wrapper

Build `cspice` to WebAssembly (NAIF publishes a CMake build). Ship the
kernels for general-purpose probes (~50 MB) and let the browser query
positions for ANY epoch. Heavy, but fully offline.

### B) Scripted Horizons fetches

Extend `bake-spice.ts` to loop the ~80 SPK IDs of every interesting
probe, decimate aggressively (1-week resolution for inactive missions,
1-day for active), and ship a larger JSON (~5 MB ungzipped). Cheap,
but locked to whatever bake-time slice we shipped.

Recommendation: ship B for v1.1 (one afternoon to add 20 more probes
to `EXPECTED_PROBES` and re-bake), defer A to v2.

## Format reminder

```json
{
  "attribution": "NASA JPL Horizons · public domain",
  "epoch_iso": "2026-05-13T00:00:00Z",
  "probes": [
    {
      "id": "voyager-1",
      "label": "Voyager 1",
      "spk_id": -31,
      "start": "1977-09-05",
      "stop": "2026-05-13",
      "step_days": 1,
      "frame": "ECLIPJ2000",
      "center": "Sun",
      "positions_au": [x0, y0, z0, x1, y1, z1, ...]
    }
  ]
}
```
