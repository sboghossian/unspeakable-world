# milky-way-real

Curated Milky Way structure layer — famous **HII regions** and **OB
associations** plotted in the galactic frame.

## What ships today (v1)

- `data/hii-regions.json` — 20 hand-curated bright HII regions
  (Orion, Rosette, Carina, Tarantula, …) with galactic `l`, `b`,
  distance in kpc, and size in pc.
- `data/ob-associations.json` — 10 famous OB associations
  (Sco-Cen, Orion OB1, Cyg OB2, Per OB1, …).
- `mw-field.ts` — renders each catalog as an additive-blended `Points`
  cloud in heliocentric Cartesian light-years (red for HII, blue for
  OB). Galactic `(l, b, d)` is converted via the standard
  `x = d·cos b·cos l`, `y_plane = d·cos b·sin l`, `z = d·sin b` then
  re-mapped to match the existing galactic-mode camera convention.
- `index.ts` — `LAYER_META` + `mountLayer` matching the
  `ExtraLayerModule` contract in `extra-layers/registry.ts`.

## What is deferred to Phase 2

Two pieces of real work, each multi-day:

### 1. Full WISE Catalog of Galactic HII Regions

Anderson+ 2014 published a ~8000-object catalog at IRSA / NRAO. To swap
the curated 20 for the full set:

```sh
# Phase 2 bake (one-time):
node --experimental-strip-types scripts/bake-mw-hii.ts
# → writes apps/web/public/data/mw-hii.bin (Float32 packed)
```

`bake-mw-hii.ts` doesn't exist yet — it needs to fetch from VizieR
(`J/ApJS/212/1`), filter to confirmed regions, decimate by distance to
roughly 5000 objects, and pack `[l, b, distKpc, sizePc]` as Float32.

### 2. Wright+ 2020 OB-association atlas

Same shape, ~200 entries from Gaia DR2 kinematics. VizieR table
`J/MNRAS/498/93`. Bake script `bake-mw-ob.ts` mirrors the HII pattern.

### 3. Spiral-arm tracers

A separate sub-layer should overlay the canonical Reid+ 2019 spiral-arm
model as a thin polyline ribbon. That's well-documented in their MNRAS
paper and the polyline takes < 1 KB. Add to `mw-field.ts` as a third
`Object3D`.

## Why we shipped a starter set

Three reasons:

1. Visual debugging. Twenty famous nebulae let us verify the galactic
   → world coordinate mapping renders correctly without waiting for
   the full catalog.
2. Honest scope. The "20 famous HII regions" subset is genuinely
   useful for the educational/tour use case — most users will never
   need the full 8000.
3. Time. A real bake + decimation pipeline for the WISE catalog is a
   multi-day task; the curated set takes a single afternoon.

## Wiring

Register in `apps/web/src/viewer/extra-layers/registry.ts`:

```ts
{
  id: "milky-way-real",
  loader: () => import("../milky-way-real") as unknown as Promise<ExtraLayerModule>,
  meta: { …mirror LAYER_META… },
}
```

(Already done in the same commit that introduced this module.)
