# Color System — The Unspeakable World

> Authoritative list of every color the viewer assigns *meaning* to.
> Decorative hex codes inside scene shaders are out of scope; everything
> here is a semantic association that future agents must preserve.
>
> Companion source file: `apps/web/src/lib/color-system.ts`
> Companion tokens file: `apps/web/src/lib/design-tokens.ts`

The system has four layers, top to bottom:

1. **Semantic tones** — UI feedback chrome (info / success / warning / danger / muted / accent)
2. **Event / instrument colors** — federated alert layers (IceCube blue, LIGO violet, …)
3. **Layer-group colors** — the four buckets in the Extra Layers popover
4. **Scene-mode colors** — the four top-level viewer modes

---

## 1. Semantic tones (6)

The `COLOR` map in `design-tokens.ts` exposes these as full Tailwind
class fragments (border + background + text). Use them in `<Pill>` and
ad-hoc status chrome. The single rule: pick by *meaning*, not by colour.

| Tone      | Hex hint     | Tailwind base   | When to use                                              |
|-----------|--------------|-----------------|----------------------------------------------------------|
| `info`    | sky-blue     | `sky-400`       | Neutral catalog labels, "tour v1" markers                |
| `success` | emerald      | `emerald-400`   | "Active", "on", confirmed, mission still operating       |
| `warning` | amber        | `amber-400`     | "Synthetic data", "preview", "loading", "en-route"       |
| `danger`  | rose         | `rose-400`      | Destructive actions, "lost mission", quota errors        |
| `muted`   | white-on-glass | `white/5–10`  | "Ended", neutral capsule, secondary metadata             |
| `accent`  | violet       | `violet-400`    | Brand-tinted chips ("tour v2", "extra layers" on-state)  |

---

## 2. Event / instrument colors (14)

Each federated alert layer / event-source has one canonical sRGB hex
listed once in `EVENT_COLORS`. Every other reference (legend dot, panel
header, shader uniform) should `import { EVENT_COLORS } …` from
`color-system.ts` instead of hardcoding.

### Multi-messenger channels

| Source       | Hex       | Channel                          |
|--------------|-----------|----------------------------------|
| IceCube      | `#4ec9ff` | High-energy neutrinos            |
| Auger        | `#ffb24e` | Ultra-high-energy cosmic rays    |
| LIGO         | `#c78bff` | Gravitational waves (compact-binary mergers) |
| NANOGrav     | `#7cffa1` | Pulsar-timing array (nHz GWs)    |

### Optical / robotic survey follow-ups

| Source       | Hex       | Channel                          |
|--------------|-----------|----------------------------------|
| BlackGEM     | `#ff5be8` | Optical kilonova hunt (magenta)  |
| GOTO         | `#5be8ff` | Wide-field optical GW follow-up  |
| ZTF          | `#ff9e38` | Zwicky Transient Facility alerts |
| ATel         | `#fdeb5c` | The Astronomer's Telegram        |

### X-ray / gamma-ray

| Source       | Hex       | Channel                          |
|--------------|-----------|----------------------------------|
| FXT          | `#ff5c2e` | Einstein Probe / Swift fast X-ray transients |
| Swift        | `#ff7a3b` | Swift-BAT gamma-ray bursts       |
| Chandra      | `#7aa8ff` | Chandra archival X-ray catalogue |

### Radio

| Source       | Hex       | Channel                          |
|--------------|-----------|----------------------------------|
| CHIME        | `#9d7cff` | CHIME FRB events                 |

### Synthesised / derived

| Source       | Hex       | Channel                          |
|--------------|-----------|----------------------------------|
| Kilonova     | `#ffb4e8` | GW-EM joint kilonova candidates  |
| GRB          | `#ff4e4e` | Legacy GRB markers               |

> Adding a new alert source: add the id to `EventTypeId`, append a hex
> to `EVENT_COLORS`, and document one new row above.

---

## 3. Layer-group colors (4)

The Extra Layers popover groups its 21 federated overlays into four
buckets. Each gets a single accent that drives both the tab strip and
the trigger pip when any layer in the group is on.

| Group       | Hex       | Meaning                                          |
|-------------|-----------|--------------------------------------------------|
| `catalogs`  | `#7cffa1` | Encyclopedic / static (green)                   |
| `alerts`    | `#ff9e38` | Live / time-sensitive (orange)                  |
| `structure` | `#c78bff` | 3D scaffolding / cosmography (violet)           |
| `imagery`   | `#5be8ff` | Visual / cultural (cyan)                        |

Exposed via `LAYER_GROUP_COLORS` in `color-system.ts`.

---

## 4. Scene-mode colors (4)

The four top-level viewer modes each have an accent that surfaces in
the mode-switcher pill, the active-mode chrome, and the focus state of
mode-specific HUD elements.

| Mode       | Hex       | Mnemonic              |
|------------|-----------|-----------------------|
| `sky`      | `#7dd3fc` | atmospheric blue (Tailwind `plasma-400`) |
| `solar`    | `#fbbf24` | solar yellow / amber  |
| `galactic` | `#c78bff` | galactic dust violet  |
| `universe` | `#7cffa1` | cosmic-web filament green |

Exposed via `MODE_COLORS` in `color-system.ts`.

---

## Editing rules

- **Never** hardcode a `#xxxxxx` for an event source — import from
  `color-system.ts`.
- **Never** dilute semantic tones — if you reach for "rose" instead of
  `COLOR.danger`, you'll drift the palette by next sprint.
- **Adding a new tone**: extend `SemanticTone` + `COLOR` + this
  document in the same commit.
- **Changing an existing hex**: that's a global re-skin. Open an RFC.
