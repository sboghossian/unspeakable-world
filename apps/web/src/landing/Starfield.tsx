import { useEffect, useRef } from "react";

/**
 * Starfield — pure-Canvas2D twinkling background.
 * Pre-renders ~600 stars at random magnitudes; animates twinkle on a
 * lightweight rAF that pauses when the document is hidden.
 *
 * Day 2-3 will replace this with the real Three.js HEALPix renderer.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stars: Array<{
      x: number;
      y: number;
      r: number;
      phase: number;
      speed: number;
    }> = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(900, Math.round((w * h) / 1800));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.6,
      }));
    };

    const draw = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
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
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    resize();
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
