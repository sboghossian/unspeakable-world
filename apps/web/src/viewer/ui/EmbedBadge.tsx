/**
 * Tiny corner attribution shown in embed mode.
 *
 * Renders a single low-noise "Unspeakable World ↗" pill in the bottom-
 * right of the iframe that opens the full app in a new tab. The link
 * strips any `embed=1` flag from the destination so the user lands in
 * the full-chrome viewer.
 */
export function EmbedBadge() {
  const fullAppHref = buildFullAppHref();
  return (
    <a
      href={fullAppHref}
      target="_blank"
      rel="noopener noreferrer"
      title="Open The Unspeakable World in a new tab"
      className="pointer-events-auto absolute bottom-3 right-3 z-30 rounded-full border border-white/15 bg-space-950/70 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 backdrop-blur transition hover:border-white/30 hover:bg-space-950/90 hover:text-white"
    >
      Unspeakable World <span aria-hidden>↗</span>
    </a>
  );
}

function buildFullAppHref(): string {
  if (typeof window === "undefined") return "/";
  const url = new URL(window.location.href);
  // Drop ?embed=1 from the query string.
  url.searchParams.delete("embed");
  // Drop embed token from the hash.
  let hash = url.hash;
  if (hash === "#embed") hash = "";
  else if (hash.startsWith("#embed?")) hash = "#viewer?" + hash.slice("#embed?".length);
  else {
    const qIdx = hash.indexOf("?");
    if (qIdx !== -1) {
      const sub = new URLSearchParams(hash.slice(qIdx + 1));
      sub.delete("embed");
      const rest = sub.toString();
      hash = rest ? `${hash.slice(0, qIdx)}?${rest}` : hash.slice(0, qIdx);
    }
  }
  url.hash = hash;
  return url.toString();
}
