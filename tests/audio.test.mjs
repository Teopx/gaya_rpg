import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, CONTINENT_TRACK, sceneTrack } from '../dist/music.mjs';
import { GayaSoundtrack } from '../dist/audio.mjs';
import { renderScore } from '../scripts/compose-music.mjs';

function fixture(play = async () => {}) {
  const state = { player: { origin: 'América do Sul', z: 0 } }, media = [];
  let time = 0;
  const soundtrack = new GayaSoundtrack({ state: () => state, now: () => time, createAudio: path => {
    const item = { path, paused: false, play, pause() { this.paused = true; }, removeAttribute() {}, load() {} };
    media.push(item); return item;
  } });
  return { soundtrack, state, media, time: value => { time = value; } };
}

test('all continents have distinct themes and cinematic scenes take priority', () => {
  assert.equal(new Set(Object.values(CONTINENT_TRACK)).size, 7);
  for (const origin of Object.keys(CONTINENT_TRACK)) assert.ok(TRACKS.some(t => t.id === sceneTrack({ player: { origin, z: 0 } })));
  assert.equal(sceneTrack({ creator: true, raid: true }), 'characters');
  assert.equal(sceneTrack({ codex: true, player: {} }), 'opening');
  assert.equal(sceneTrack({ player: { z: 6 }, raid: true }), 'raid');
  assert.equal(sceneTrack({ player: { z: 6 }, raid: true, morph: true }), 'ascension');
  assert.equal(sceneTrack({ player: { z: 6 } }), 'frontier');
});

test('audio is opt-in, crossfades scenes, and mute releases both players', async () => {
  const f = fixture(); await f.soundtrack.update(); assert.equal(f.media.length, 0);
  await f.soundtrack.setEnabled(true); f.time(1400); f.soundtrack.mix(); assert.equal(f.media[0].volume, .35);
  f.state.raid = true; await f.soundtrack.update(); assert.equal(f.media.length, 2);
  f.time(2100); f.soundtrack.mix(); assert.ok(f.media[0].volume > 0 && f.media[1].volume > 0);
  f.time(2800); f.soundtrack.mix(); assert.equal(f.media[0].paused, true);
  f.soundtrack.setEnabled(false); assert.equal(f.media[1].paused, true);
});

test('hiding the tab cancels a pending playback and prevents stale audio resuming', async () => {
  let release; const f = fixture(() => new Promise(resolve => { release = resolve; }));
  const pending = f.soundtrack.setEnabled(true); f.state.hidden = true; await f.soundtrack.update();
  release(); await pending; assert.equal(f.media[0].paused, true); assert.equal(f.soundtrack.active, null);
});

test('autoplay rejection can be retried and trailer preview restores the game theme', async () => {
  const f = fixture(async () => { throw Error('NotAllowedError'); });
  await f.soundtrack.setEnabled(true); assert.equal(f.soundtrack.enabled, false);
  f.soundtrack.createAudio = path => ({ path, play: async () => {}, pause() {}, removeAttribute() {}, load() {} });
  f.soundtrack.preview = 'trailer'; await f.soundtrack.setEnabled(true);
  assert.equal(f.soundtrack.active.loop, false); f.soundtrack.active.onended(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.soundtrack.current, 'south-america');
});

test('all compositions render valid non-silent PCM without clipping or edge clicks', () => {
  const hashes = new Set();
  for (const score of TRACKS) {
    const { wav, peak, rms } = renderScore(score, { sampleRate: 8000, bars: 1 });
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.readUInt16LE(22), 2);
    assert.ok(peak > .1 && peak < .83); assert.ok(rms > .02 && rms < .4);
    assert.equal(wav.readInt16LE(44), 0); assert.equal(wav.readInt16LE(wav.length - 2), 0);
    hashes.add(wav.subarray(5000, 5100).toString('hex'));
  }
  assert.equal(hashes.size, TRACKS.length);
});
