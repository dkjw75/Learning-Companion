import { useEffect, useRef, useState } from 'react';

// Adapted from Nikolas Sapa's Background ASCII Wake (ns-ui / 21st.dev).
// The wake is rendered behind the entire app and observes pointer movement on
// window, so the decorative canvas never blocks links, buttons, or selection.
const ramp = ' .:-=+*#%@';

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function BackgroundAsciiWake({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const cellSize = 16;
    const motionOff = reducedMotion || systemReducedMotion;
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace';
    const ink = getComputedStyle(canvas).color;
    let columns = 0;
    let rows = 0;
    let heat = new Float32Array(0);
    let rates = new Float32Array(0);
    let ambient = new Float32Array(0);
    let frame = 0;
    let previousFrame = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const pointer = { x: 0, y: 0, time: 0, active: false };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.font = `${cellSize * .85}px ${font}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      columns = Math.max(1, Math.ceil(width / cellSize));
      rows = Math.max(1, Math.ceil(height / cellSize));
      const count = columns * rows;
      heat = new Float32Array(count);
      rates = new Float32Array(count).fill(1.4);
      ambient = new Float32Array(count);
      const random = seededRandom(0xa53f9c1 ^ (columns * 71 + rows));
      for (let index = 0; index < count; index++) {
        if (random() < .035) ambient[index] = .08 + random() * .14;
      }
      pointer.active = false;
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);
      context.fillStyle = ink;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const index = y * columns + x;
          const brightness = Math.max(ambient[index]!, heat[index]!);
          if (brightness <= .03) continue;
          const glyph = ramp[Math.min(ramp.length - 1, Math.floor(brightness * (ramp.length - 1)))];
          if (!glyph || glyph === ' ') continue;
          context.globalAlpha = Math.min(1, .15 + brightness * .85);
          context.fillText(glyph, x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
        }
      }
      context.globalAlpha = 1;
    };

    const stamp = (pixelX: number, pixelY: number, radius: number, rate: number) => {
      const centerX = pixelX / cellSize;
      const centerY = pixelY / cellSize;
      for (let y = Math.max(0, Math.floor(centerY - radius)); y <= Math.min(rows - 1, Math.ceil(centerY + radius)); y++) {
        for (let x = Math.max(0, Math.floor(centerX - radius)); x <= Math.min(columns - 1, Math.ceil(centerX + radius)); x++) {
          const distance = Math.hypot(x + .5 - centerX, y + .5 - centerY);
          if (distance > radius) continue;
          const index = y * columns + x;
          const brightness = 1 - distance / radius;
          if (brightness > heat[index]!) {
            heat[index] = brightness;
            rates[index] = rate;
          }
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const now = performance.now();
      if (pointer.active) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const speed = distance / Math.max(1, now - pointer.time);
        const radius = Math.max(.6, Math.min(2.6, 2.4 / (1 + speed * 1.6)));
        const rate = Math.max(.8, Math.min(4.5, 1 + speed * 3.2));
        const steps = Math.max(1, Math.ceil(distance / (cellSize * .5)));
        for (let step = 1; step <= steps; step++) {
          const fraction = step / steps;
          stamp(pointer.x + dx * fraction, pointer.y + dy * fraction, radius, rate);
        }
      } else {
        stamp(x, y, 1.4, 1.4);
      }
      pointer.x = x;
      pointer.y = y;
      pointer.time = now;
      pointer.active = true;
    };

    const tick = (now: number) => {
      const seconds = previousFrame ? Math.min(64, now - previousFrame) / 1000 : 1 / 60;
      previousFrame = now;
      for (let index = 0; index < heat.length; index++) {
        if (heat[index]! > 0) heat[index] = Math.max(0, heat[index]! - rates[index]! * seconds);
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); if (motionOff) draw(); }, 150);
    };
    const onBlur = () => { pointer.active = false; };
    resize();
    if (motionOff) draw();
    else {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('blur', onBlur);
      frame = requestAnimationFrame(tick);
    }
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onBlur);
    };
  }, [reducedMotion, systemReducedMotion]);

  return <canvas ref={canvasRef} className="app-ascii-wake" aria-hidden="true" />;
}
