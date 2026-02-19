import { spawnConfetti, stepConfetti } from './lights-out';

/**
 * Launch confetti from a viewport coordinate on a temporary
 * full-screen overlay canvas. The canvas self-destructs when
 * all particles have faded out.
 */
export function launchConfettiOverlay(
  viewportX: number,
  viewportY: number,
  count: number,
  spread: number,
  gravity: number,
  colors: string[],
): void {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9997';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const particles = spawnConfetti(viewportX, viewportY, count, spread, colors);
  let lastTime = performance.now();

  function animate(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const alive = stepConfetti(particles, dt, gravity);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      if (p.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (alive > 0) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}
