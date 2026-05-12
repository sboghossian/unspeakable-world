import { log } from "../../lib/logger";

/**
 * ✨ Surprise me — a sparkle button in the top-bar that flies the
 * camera to a random famous-and-photogenic target. Cheap fun on idle,
 * and a great onboarding affordance ("just click ✨ and explore").
 *
 * The pool is curated: every entry is something with a recognizable
 * payoff in the inspector and a striking visual on arrival. We
 * deliberately don't draw from the raw 120k star catalog because most
 * of those targets are spectroscopically anonymous.
 */

const POOL: ReadonlyArray<{
  name: string;
  tagline: string;
  emoji: string;
}> = [
  { name: "Saturn", tagline: "the ringed world", emoji: "🪐" },
  { name: "Jupiter", tagline: "the giant", emoji: "🌀" },
  { name: "Mars", tagline: "the red planet", emoji: "🔴" },
  { name: "Sun", tagline: "our star", emoji: "☀️" },
  { name: "Andromeda", tagline: "M31 — our cosmic neighbour", emoji: "🌌" },
  { name: "M31", tagline: "Andromeda Galaxy", emoji: "🌌" },
  { name: "Galactic Center", tagline: "Sagittarius A* lurks here", emoji: "⚫" },
  { name: "Sirius", tagline: "the brightest star", emoji: "★" },
  { name: "Betelgeuse", tagline: "red supergiant in Orion", emoji: "🟥" },
  { name: "Rigel", tagline: "blue supergiant in Orion", emoji: "🟦" },
  { name: "Vega", tagline: "the standard candle", emoji: "★" },
  { name: "Crab Pulsar", tagline: "millisecond-pulsar relic of SN 1054", emoji: "⚡" },
  { name: "Sgr A*", tagline: "the Milky Way's central black hole", emoji: "⚫" },
  { name: "Local Group", tagline: "our galactic neighbourhood", emoji: "🪐" },
  { name: "Orion Nebula", tagline: "M42 — stellar nursery", emoji: "🌠" },
  { name: "Pleiades", tagline: "the Seven Sisters", emoji: "✨" },
];

type Props = {
  onPick: (name: string) => void;
};

export function SurpriseButton({ onPick }: Props) {
  const fire = () => {
    const pick = POOL[Math.floor(Math.random() * POOL.length)];
    if (!pick) return;
    // eslint-disable-next-line no-console
    log.info(
      `[surprise] flying to ${pick.name} — ${pick.tagline} ${pick.emoji}`,
    );
    onPick(pick.name);
  };
  return (
    <button
      type="button"
      onClick={fire}
      title="Surprise me — fly to a random famous target"
      aria-label="Surprise me"
      className="pointer-events-auto inline-flex h-7 items-center justify-center gap-1 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 text-[13px] text-amber-200 backdrop-blur transition hover:bg-amber-400/20"
    >
      <span aria-hidden>✨</span>
      <span className="font-mono text-[10px] uppercase tracking-widest">
        surprise
      </span>
    </button>
  );
}
