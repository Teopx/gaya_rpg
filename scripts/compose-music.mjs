import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { TRACKS } from '../dist/music.mjs';

const TAU = Math.PI * 2;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);

export function renderScore(score, { sampleRate = 22050, bars = score.bars || 8 } = {}) {
  const beat = 60 / score.bpm, duration = bars * 4 * beat;
  const length = Math.round(duration * sampleRate);
  const left = new Float32Array(length), right = new Float32Array(length);
  let seed = 4109 + score.color;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  function note(midi, start, seconds, gain, voice, pan = 0) {
    const frequency = hz(midi), offset = Math.round(start * sampleRate);
    const count = Math.min(Math.ceil(seconds * sampleRate), length - offset);
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate, phase = TAU * frequency * t;
      const attack = voice === 'pad' || voice === 'string' ? .3 : .025;
      const envelope = Math.min(1, t / attack) * Math.min(1, (seconds - t) / .35);
      let value;
      if (voice === 'bell') value = (Math.sin(phase) + .28 * Math.sin(phase * 2.76) * Math.exp(-t * 2)) * Math.exp(-t * 1.1);
      else if (voice === 'pluck') value = (Math.sin(phase) + .25 * Math.sin(phase * 2) + .1 * Math.sin(phase * 3)) * Math.exp(-t * 2.3);
      else if (voice === 'flute') value = (Math.sin(phase + .025 * Math.sin(TAU * 4.8 * t)) + .12 * Math.sin(phase * 2)) * .85;
      else value = (Math.sin(phase) + .27 * Math.sin(phase * 1.003) + .14 * Math.sin(phase * 2)) * (.8 + .1 * Math.sin(TAU * .4 * t));
      value *= envelope * gain;
      left[offset + i] += value * Math.sqrt((1 - pan) / 2);
      right[offset + i] += value * Math.sqrt((1 + pan) / 2);
    }
  }
  function drum(start, gain, high = false) {
    const offset = Math.round(start * sampleRate), seconds = high ? .22 : .65;
    for (let i = 0; i < Math.min(seconds * sampleRate, length - offset); i++) {
      const t = i / sampleRate;
      const value = gain * (high ? random() * Math.exp(-t * 30) * .22 : Math.sin(TAU * (48 * t + 2.2 * (1 - Math.exp(-t * 15)))) * Math.exp(-t * 9));
      left[offset + i] += value * .7; right[offset + i] += value * .7;
    }
  }
  const harmony = [0, -2, 3, -5, 0, 5, 3, -2];
  for (let bar = 0; bar < bars; bar++) {
    const start = bar * 4 * beat, root = score.root + harmony[bar % harmony.length];
    // Trailer: seed (0–4), awakening (4–8), conflict (8–12), revelation (12–16).
    const act = score.id === 'trailer' ? Math.floor(bar / 4) : 1;
    const intensity = score.id === 'trailer' ? [.35, .6, 1, .8][act] : .65;
    for (const [i, interval] of [0, 7, 15].entries()) note(root - 12 + interval, start, beat * 4, .085, 'pad', (i - 1) * .45);
    note(root - 24, start, beat * 3.8, .1, 'pad');
    if (act > 0) for (let pulse = 0; pulse < 8; pulse++) {
      const interval = [0, 7, 12, 15, 7, 12, 19, 7][(pulse + score.color) % 8];
      note(root + interval, start + pulse * beat / 2, beat * 1.2, .052 * intensity, 'pluck', pulse % 2 ? .4 : -.4);
    }
    for (let phrase = 0; phrase < 2; phrase++) {
      const index = (bar * 2 + phrase + score.color) % score.melody.length;
      note(score.root + 12 + score.melody[index], start + phrase * 2 * beat, beat * 1.8, .14 * intensity, score.voice, phrase ? .18 : -.18);
    }
    if (act > 0) for (let pulse = 0; pulse < 4; pulse++) {
      const power = score.drums * intensity;
      if (pulse % 2 === 0) drum(start + pulse * beat, power * .45);
      drum(start + (pulse + .5) * beat, power, true);
    }
  }
  // A short stereo echo gives depth; a soft limiter and edge fades prevent clipping/clicks.
  const taps = [[.23,.16],[.41,.11],[.67,.06]];
  const dryL = left.slice(), dryR = right.slice();
  for (const [seconds, gain] of taps) {
    const delay = Math.round(seconds * sampleRate);
    for (let i = delay; i < length; i++) { left[i] += dryR[i-delay] * gain; right[i] += dryL[i-delay] * gain; }
  }
  const wav = Buffer.alloc(44 + length * 4);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length * 4, 40);
  let peak = 0, square = 0;
  for (let i = 0; i < length; i++) {
    const fade = Math.min(1, i / (sampleRate * .08), (length - 1 - i) / (sampleRate * (score.id === 'trailer' ? 2 : .1)));
    for (const [channel, signal] of [left[i], right[i]].entries()) {
      const value = Math.tanh(signal * 1.7) * .82 * fade;
      peak = Math.max(peak, Math.abs(value)); square += value * value;
      wav.writeInt16LE(Math.round(value * 32767), 44 + i * 4 + channel * 2);
    }
  }
  return { wav, duration, peak, rms: Math.sqrt(square / (length * 2)) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync('dist/audio', { recursive: true });
  mkdirSync('godot/audio', { recursive: true });
  const manifest = [];
  for (const score of TRACKS) {
    const { wav, ...stats } = renderScore(score);
    const path = `dist/audio/${score.id}.wav`;
    writeFileSync(path, wav); copyFileSync(path, `godot/audio/${score.id}.wav`);
    manifest.push({ id: score.id, title: score.title, ...stats, sha256: createHash('sha256').update(wav).digest('hex'), source: 'dist/music.mjs + scripts/compose-music.mjs', externalSamples: [] });
    console.log(`${score.id}: ${stats.duration.toFixed(1)} s, peak ${stats.peak.toFixed(3)}, RMS ${stats.rms.toFixed(3)}`);
  }
  writeFileSync('dist/audio/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
}
