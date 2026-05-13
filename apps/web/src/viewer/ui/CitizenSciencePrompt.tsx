/**
 * CitizenSciencePrompt — small invitation card surfaced in the sky
 * inspector when the clicked object is a candidate for a Zooniverse
 * citizen-science project (Galaxy Zoo for galaxies, Planet Hunters for
 * TOIs).
 *
 * Strictly non-blocking: if no project matches, the prompt renders
 * nothing. The card uses the same border / bg-white/5 styling as the
 * rest of the inspector so it slots in cleanly.
 */
import {
  matchProject,
  buildLink,
  type ZooniverseProject,
} from "../citizen-science";

type Props = {
  /** SIMBAD type code OR catalog ID prefix to test against. */
  typeOrId: string;
  /** Display label / id of the target, used to tag the outbound URL. */
  targetLabel: string;
};

export function CitizenSciencePrompt({ typeOrId, targetLabel }: Props) {
  const project = matchProject(typeOrId);
  if (!project) return null;
  return <CardInner project={project} targetLabel={targetLabel} />;
}

function CardInner({
  project,
  targetLabel,
}: {
  project: ZooniverseProject;
  targetLabel: string;
}) {
  const href = buildLink(project, targetLabel);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-4 block rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-3 transition hover:border-cyan-300/60 hover:bg-cyan-400/10"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">
          citizen science
        </span>
        <span className="font-mono text-[10px] text-cyan-300/60">
          via Zooniverse ↗
        </span>
      </div>
      <div className="mt-1.5 font-display text-sm text-white/95">
        Help classify this in {project.label}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-white/65">
        {project.blurb}
      </p>
    </a>
  );
}
