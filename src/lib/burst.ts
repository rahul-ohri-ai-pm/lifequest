import { gsap, prefersReducedMotion } from './gsap';
import { colors } from '../constants/theme';

// Completion effects that need to draw *outside* their component's box — a shard of XP
// arcing from the quest you just cleared up to the status rail, and the ring that pops where
// you tapped.
//
// These deliberately live outside React. They are pure decoration with no state, they must
// survive the row they came from re-rendering or disappearing mid-flight (completing a quest
// re-sorts the list), and mounting a component per effect would mean reconciling nodes whose
// only job is to be removed 700ms later. So: append to <body>, animate, remove.

function overlayHost(): HTMLElement {
  let host = document.getElementById('fx-layer');
  if (!host) {
    host = document.createElement('div');
    host.id = 'fx-layer';
    // Above the app, below the level-up overlay (z-60) so a level-up still owns the screen.
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;';
    document.body.appendChild(host);
  }
  return host;
}

/** A ring pulse at the point of contact — the tactile "it registered" beat. */
export function ripple(origin: HTMLElement, tint: string = colors.accent): void {
  if (prefersReducedMotion()) return;
  const r = origin.getBoundingClientRect();
  const host = overlayHost();
  const ring = document.createElement('span');
  ring.style.cssText = `position:absolute;left:${r.left + r.width / 2}px;top:${
    r.top + r.height / 2
  }px;width:${r.width}px;height:${r.width}px;margin:${-r.width / 2}px 0 0 ${
    -r.width / 2
  }px;border:2px solid ${tint};border-radius:9999px;`;
  host.appendChild(ring);
  gsap.to(ring, {
    scale: 2.6,
    opacity: 0,
    duration: 0.55,
    ease: 'power2.out',
    onComplete: () => ring.remove(),
  });
}

/**
 * Sends an XP shard from the completed quest up to the status rail, so the number the user
 * just earned visibly becomes the number in their level bar. Falls back to a plain fade if
 * the target isn't on screen (e.g. completing from the detail screen).
 */
export function flyXp(origin: HTMLElement, amount: number, tint: string = colors.accent): void {
  if (prefersReducedMotion()) return;
  const target = document.querySelector<HTMLElement>('[data-xp-target]');
  const from = origin.getBoundingClientRect();
  const host = overlayHost();

  const shard = document.createElement('span');
  shard.textContent = `+${amount}`;
  shard.style.cssText = `position:absolute;left:${from.left + from.width / 2}px;top:${
    from.top + from.height / 2
  }px;transform:translate(-50%,-50%);font-family:Rajdhani,system-ui,sans-serif;font-weight:700;font-size:18px;color:${tint};text-shadow:0 0 12px ${tint};white-space:nowrap;`;
  host.appendChild(shard);

  const done = () => shard.remove();

  if (!target) {
    gsap.to(shard, { y: -40, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: done });
    return;
  }

  const to = target.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  gsap
    .timeline({ onComplete: done })
    .to(shard, { scale: 1.35, duration: 0.18, ease: 'back.out(3)' })
    // Arc rather than a straight line — a curve reads as something being thrown, a straight
    // line reads as a tooltip sliding. Two tweens with different eases on the two axes gives
    // a proper ballistic curve without pulling in MotionPathPlugin for one effect.
    .to(shard, { x: dx, duration: 0.62, ease: 'power1.in' }, 'fly')
    .to(shard, { y: dy, duration: 0.62, ease: 'power2.out' }, 'fly')
    .to(shard, { scale: 0.7, duration: 0.62, ease: 'none' }, 'fly')
    .to(shard, { opacity: 0, duration: 0.16 }, '-=0.16')
    // The rail acknowledges the hit.
    .to(target, { scale: 1.25, duration: 0.14, ease: 'back.out(4)' }, '-=0.18')
    .to(target, { scale: 1, duration: 0.3, ease: 'elastic.out(1,0.5)' });
}

/** The row itself igniting when its quest is cleared. */
export function igniteRow(row: HTMLElement, tint: string = colors.accent): void {
  if (prefersReducedMotion()) return;
  gsap
    .timeline()
    .to(row, { boxShadow: `0 0 26px ${tint}`, duration: 0.16, ease: 'power2.out' })
    .to(row, { scale: 1.015, duration: 0.16 }, '<')
    .to(row, { scale: 1, duration: 0.42, ease: 'elastic.out(1,0.55)' })
    .to(row, { boxShadow: '0 0 0px rgba(0,0,0,0)', duration: 0.5 }, '-=0.3');
}
