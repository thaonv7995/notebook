/**
 * Subtle Paper Rustle & Page Flip Audio Synthesizer
 *
 * Uses Web Audio API to procedurally generate a soft, organic
 * paper page flip sound without loading any external audio files.
 * Zero bytes downloaded, zero latency, works completely offline.
 */

const SOUND_PREF_KEY = 'notebook_sound_enabled';

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  if (typeof localStorage === 'undefined') return true;
  const val = localStorage.getItem(SOUND_PREF_KEY);
  // Default to enabled (true)
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SOUND_PREF_KEY, String(Boolean(enabled)));
}

export function toggleSound() {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  if (next) {
    playPaperFlipSound();
  }
  return next;
}

/**
 * Plays a realistic, gentle physical paper flip/rustle sound.
 * Procedurally synthesized via shaped noise & bandpass filtering.
 */
export function playPaperFlipSound() {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const duration = 0.14; // 140ms — crisp & quick
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate gentle noise with soft texture
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish noise filter for gentle rustle
      lastOut = (lastOut * 0.5) + (white * 0.5);
      output[i] = lastOut;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Bandpass filter to shape noise like paper fiber friction (~1400Hz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1400, ctx.currentTime);
    bandpass.Q.setValueAtTime(1.8, ctx.currentTime);

    // Highpass filter to eliminate any low-end thud
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(500, ctx.currentTime);

    // Gain envelope: fast attack, organic exponential decay
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02); // 20ms attack
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration); // 120ms decay

    // Connect audio graph
    whiteNoise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration + 0.01);
  } catch (err) {
    // Non-critical: AudioContext may be blocked before first user interaction
    console.debug('Paper sound skipped:', err);
  }
}
