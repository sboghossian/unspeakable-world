import { useEffect, useRef } from "react";

/**
 * Starfield — pure-Canvas2D twinkling background with shooting stars
 * and a slow horizontal drift so the sky actually feels like it's
 * rotating overhead.
 *
 * Pre-renders ~900 stars at random magnitudes; animates twinkle on a
 * lightweight rAF that pauses when the document is hidden. Meteors
 * spawn every ~5–10 s and trail across the field on a short fading
 * gradient line.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect prefers-reduced-motion + low-end CPUs: halve the star
    // count on ≤4-core machines, and render a single static layer with
    // no rAF loop when the user has reduced-motion turned on.
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowCpu =
      typeof navigator !== "undefined" &&
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency > 0 &&
      navigator.hardwareConcurrency <= 4;
    const countScale = lowCpu ? 0.5 : 1;

    let raf = 0;
    let stars: Array<{
      x: number;
      y: number;
      r: number;
      phase: number;
      speed: number;
    }> = [];
    type Meteor = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    };
    const meteors: Meteor[] = [];
    let lastSpawn = 0;
    let nextSpawnDelay = 4000 + Math.random() * 6000;
    let lastT = 0;
    let driftPx = 0; // accumulated x-drift in CSS px

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(
        900,
        Math.round(((w * h) / 1800) * countScale),
      );
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.6,
      }));
    };

    const drawStatic = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const grad = ctx.createRadialGradient(
        w * 0.7,
        h * 0.85,
        0,
        w * 0.7,
        h * 0.85,
        Math.max(w, h),
      );
      grad.addColorStop(0, "rgba(14, 165, 233, 0.10)");
      grad.addColorStop(0.4, "rgba(7, 10, 20, 0.95)");
      grad.addColorStop(1, "rgba(3, 5, 10, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.fillStyle = "#e2e8f0";
      for (const s of stars) {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const spawnMeteor = (w: number, h: number) => {
      // Bias to upper portion + 30°-ish downward angle to read as a
      // typical Perseid streak.
      const angle = Math.PI * 0.78 + (Math.random() - 0.5) * 0.5;
      const speed = 480 + Math.random() * 360; // px/sec
      const startX = Math.random() * w - 60;
      const startY = Math.random() * h * 0.4 - 40;
      meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.6, // seconds
      });
    };

    const draw = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dtSec = lastT === 0 ? 0 : Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      // Sky drift — ~3 px / second horizontally. Wraps so stars never
      // disappear off the edge.
      driftPx = (driftPx + dtSec * 3) % w;

      // Spawn timer.
      if (t - lastSpawn > nextSpawnDelay) {
        spawnMeteor(w, h);
        lastSpawn = t;
        nextSpawnDelay = 4000 + Math.random() * 6000;
      }

      // gradient backdrop — deep space + a faint plasma glow toward bottom-right
      const grad = ctx.createRadialGradient(
        w * 0.7,
        h * 0.85,
        0,
        w * 0.7,
        h * 0.85,
        Math.max(w, h),
      );
      grad.addColorStop(0, "rgba(14, 165, 233, 0.10)");
      grad.addColorStop(0.4, "rgba(7, 10, 20, 0.95)");
      grad.addColorStop(1, "rgba(3, 5, 10, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase);
        ctx.globalAlpha = 0.25 + 0.75 * tw;
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        const x = (s.x + driftPx) % w;
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Meteors — short trail rendered as a fading gradient line.
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]!;
        m.life += dtSec;
        if (m.life > m.maxLife) {
          meteors.splice(i, 1);
          continue;
        }
        const p = m.life / m.maxLife;
        m.x += m.vx * dtSec;
        m.y += m.vy * dtSec;
        const tailLen = 60 + (1 - p) * 40;
        const tx = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * tailLen;
        const ty = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * tailLen;
        const fade = Math.sin(Math.PI * p); // bell curve over lifetime
        const lineGrad = ctx.createLinearGradient(tx, ty, m.x, m.y);
        lineGrad.addColorStop(0, "rgba(255,240,200,0)");
        lineGrad.addColorStop(1, `rgba(255,240,200,${0.85 * fade})`);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        // Bright head.
        ctx.fillStyle = `rgba(255,250,230,${0.95 * fade})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();

    if (reducedMotion) {
      // Static layer only — re-render on resize, no rAF loop.
      drawStatic();
      const onResize = () => {
        resize();
        drawStatic();
      };
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
      };
    }

    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
