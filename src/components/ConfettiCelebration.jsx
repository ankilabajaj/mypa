import { useEffect, useRef } from "react";

const COLORS = ["#2563eb", "#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
const DURATION_MS = 2500;

function createParticles(count, width, height) {
  return Array.from({ length: count }, () => ({
    x: width * 0.3 + Math.random() * width * 0.4,
    y: height * 0.35 + Math.random() * height * 0.15,
    size: 4 + Math.random() * 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    velocityX: (Math.random() - 0.5) * 6,
    velocityY: -3 - Math.random() * 5,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    opacity: 1,
  }));
}

export default function ConfettiCelebration({ trigger, onDone }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const particles = createParticles(48, width, height);
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = elapsed / DURATION_MS;

      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.velocityY += 0.18;
        particle.rotation += particle.rotationSpeed;
        particle.opacity = Math.max(0, 1 - progress * 1.15);

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
        ctx.restore();
      });

      if (elapsed < DURATION_MS) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
        onDone?.();
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [trigger, onDone]);

  if (!trigger) return null;

  return <canvas ref={canvasRef} className="confetti-celebration" aria-hidden="true" />;
}
