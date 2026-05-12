/**
 * 🐛 Report-a-bug — a small floating chip in the bottom-right that
 * opens a GitHub issue pre-filled with the current URL hash, scene,
 * and a stack of useful environment fields. AstroGrid v1.2.2 ships
 * this on every legal/support/release page; we surface it on the
 * viewer scenes so the affordance is always one click away.
 */

const REPO_ISSUES =
  "https://github.com/sboghossian/unspeakable-world/issues/new";

function buildIssueUrl(): string {
  const body = [
    `**What I expected**`,
    "",
    "",
    `**What happened**`,
    "",
    "",
    `**Steps to reproduce**`,
    "1. ",
    "2. ",
    "",
    `---`,
    `**URL**: ${typeof window !== "undefined" ? window.location.href : "(unknown)"}`,
    `**User agent**: ${typeof navigator !== "undefined" ? navigator.userAgent : "(unknown)"}`,
    `**Viewport**: ${typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "(unknown)"}`,
    `**Time**: ${new Date().toISOString()}`,
  ].join("\n");
  const params = new URLSearchParams({
    title: "Bug: ",
    body,
    labels: "bug",
  });
  return `${REPO_ISSUES}?${params.toString()}`;
}

export function ReportBugButton() {
  return (
    <a
      href={buildIssueUrl()}
      target="_blank"
      rel="noopener noreferrer"
      title="Report a bug — opens GitHub Issues with the current view info prefilled"
      aria-label="Report a bug"
      className="pointer-events-auto fixed bottom-3 right-3 z-30 inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/75 px-2 font-mono text-[10px] uppercase tracking-widest text-white/55 backdrop-blur transition hover:bg-white/10 hover:text-white"
    >
      <span aria-hidden>🐛</span>
      <span>report bug</span>
    </a>
  );
}
