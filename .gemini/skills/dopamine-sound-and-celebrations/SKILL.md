---
name: dopamine-sound-and-celebrations
description: Procedures for creating, testing, and optimizing lightweight Canvas celebration animations and Web Audio sound feedback.
---

# Dopamine Sound & Celebrations Skill

Use this skill when adding new celebration animation themes, micro-rewards, or audio feedback.

## 1. Zero External Asset Bloat
- **Visuals**: Procedurally generate animations using HTML5 Canvas 2D or SVGs. Do not import heavy `.gif` or `.mp4` video files.
- **Audio**: Synthesize clicks, chimes, and ticks directly using the browser's `WebAudio API` (`AudioContext`, `OscillatorNode`, `GainNode`). Do not bundle bulky `.mp3` or `.wav` files.

## 2. Dopamine Themes Architecture
Celebrations are registered in `src/utils/celebrations.ts`. Themes include:
- `confetti`: Classic joyful burst.
- `unicorns`: Kid-friendly pastel unicorns, stars, and rainbow arcs.
- `cartoons`: Minions, Smurfs, playful bouncy emojis.
- `memes`: Doge, sparkles, playful internet culture badges.
- `minimal`: Subtle floating emerald particles for low-stimulation mode.

## 3. Performance & DOM Lifecycle
- Always clean up the temporary `<canvas>` element when animations complete:
  ```ts
  if (progress < 1) {
    requestAnimationFrame(render);
  } else {
    canvas.remove();
  }
  ```
- Gracefully handle headless test environments (e.g. JSDOM where `canvas.getContext` may be undefined).
