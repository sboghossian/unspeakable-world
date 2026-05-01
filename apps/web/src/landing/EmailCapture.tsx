import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Email capture for the launch list.
 * Day 1 stub: persists to localStorage. Day 5+ wires to a Cloudflare Worker
 * that writes to a D1 table. We never send marketing email; this is a single
 * launch ping when v1 hits.
 */
export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      // Day 1: localStorage stub. Day 5+: POST to /api/subscribe.
      const existing: string[] = JSON.parse(
        localStorage.getItem("uw:subscribers") ?? "[]",
      );
      if (!existing.includes(email)) existing.push(email);
      localStorage.setItem("uw:subscribers", JSON.stringify(existing));
      await new Promise((r) => setTimeout(r, 350));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="mt-8 inline-flex items-center gap-3 rounded-lg border border-plasma-500/30 bg-plasma-500/10 px-4 py-3 text-sm text-plasma-400">
        <span className="text-base">✓</span>
        <span>You'll get one email when v1 lands. That's it.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 flex w-full max-w-md flex-col gap-2 sm:flex-row"
      aria-label="Notify me at launch"
    >
      <input
        type="email"
        required
        placeholder="you@somewhere.cool"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/30 outline-none backdrop-blur transition focus:border-plasma-500 focus:bg-white/10"
        aria-invalid={status === "error"}
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-lg bg-plasma-500 px-5 py-3 text-sm font-semibold text-space-950 transition hover:bg-plasma-400 disabled:opacity-50"
      >
        {status === "submitting" ? "Saving…" : "Notify me"}
      </button>
    </form>
  );
}
