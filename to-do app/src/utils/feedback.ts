/**
 * Synthesizes a subtle, tactile mechanical click / pop sound on task completion
 * to provide ADHD / neurodivergent dopamine micro-rewards without requiring external assets.
 */
export function triggerCompletionFeedback(): void {
  try {
    if (typeof window === 'undefined') return;

    // 1. Subtle vibration for supported touch devices / trackpads
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15);
    }

    // 2. High-precision Web Audio synthetic mechanical click
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Warm, woody wooden-pebble mechanical click frequency envelope
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    // Auto-close audio context after short duration to release memory
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 100);
  } catch {
    // Graceful fallback for non-audio environments
  }
}
