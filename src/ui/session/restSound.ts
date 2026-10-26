/**
 * Short beeps made on the phone (Web Audio): no sound file, nothing loaded.
 * Used at the end of the rest, when the app is open.
 */
let context: AudioContext | undefined;

function audio(): AudioContext | undefined {
  try {
    context ??= new AudioContext();
    return context;
  } catch {
    return undefined;
  }
}

/** Unlocked on a tap: browsers only play sound after a user gesture. */
export function unlockSound(): void {
  void audio()
    ?.resume()
    .catch(() => undefined);
}

/** Three rising beeps: the rest is over. */
export function playRestOver(): void {
  const ctx = audio();
  if (!ctx || ctx.state !== 'running') return;
  [660, 880, 1100].forEach((frequency, index) => {
    const start = ctx.currentTime + index * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}
