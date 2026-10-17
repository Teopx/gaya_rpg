import { TRACKS, sceneTrack } from './music.mjs';

export class GayaSoundtrack {
  constructor({ state, createAudio = path => new Audio(path), now = () => performance.now(), onStatus = () => {} }) {
    this.state = state; this.createAudio = createAudio; this.now = now; this.onStatus = onStatus;
    this.enabled = false; this.volume = .35; this.preview = ''; this.active = null; this.outgoing = null;
    this.generation = 0; this.pending = false; this.loading = null; this.started = 0; this.current = '';
  }
  setVolume(value) { this.volume = Math.max(0, Math.min(1, Number(value) || 0)); this.mix(); }
  stop() {
    this.generation++; this.pending = false;
    for (const media of [this.active, this.outgoing, this.loading]) if (media) { media.pause(); media.removeAttribute('src'); media.load(); }
    this.active = this.outgoing = this.loading = null; this.current = '';
  }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.stop(); else return this.update(); }
  mix() {
    const phase = Math.min(1, Math.max(0, (this.now() - this.started) / 1400));
    if (this.active) this.active.volume = this.volume * Math.sin(phase * Math.PI / 2);
    if (this.outgoing) {
      this.outgoing.volume = this.volume * Math.cos(phase * Math.PI / 2);
      if (phase === 1) { this.outgoing.pause(); this.outgoing.removeAttribute('src'); this.outgoing.load(); this.outgoing = null; }
    }
  }
  async update() {
    const state = this.state();
    if (!this.enabled || state.hidden) { if (this.active || this.outgoing || this.pending) this.stop(); return; }
    const id = this.preview || sceneTrack(state);
    this.mix();
    if (this.pending || this.current === id) return;
    const generation = ++this.generation;
    const media = this.createAudio(`audio/${id}.wav`);
    this.loading = media;
    media.loop = id !== 'trailer'; media.preload = 'auto'; media.volume = 0;
    this.pending = true;
    try {
      await media.play();
      if (generation !== this.generation) { media.pause(); media.removeAttribute('src'); media.load(); return; }
      if (this.outgoing) { this.outgoing.pause(); this.outgoing.removeAttribute('src'); this.outgoing.load(); }
      this.outgoing = this.active; this.active = media; this.current = id; this.started = this.now();
      this.loading = null;
      media.onended = () => { if (this.active === media) { this.preview = ''; this.current = ''; void this.update(); } };
      media.onerror = () => { if (this.active === media) { this.enabled = false; this.stop(); this.onStatus('Não foi possível reproduzir esta faixa. Ative o áudio para tentar novamente.'); } };
      this.onStatus(TRACKS.find(track => track.id === id)?.title || id);
    } catch {
      if (generation === this.generation) { this.enabled = false; this.stop(); this.onStatus('Áudio indisponível. Tente ativar novamente.'); }
    } finally { if (generation === this.generation) this.pending = false; }
  }
}

if (typeof document !== 'undefined') {
  const get = id => document.getElementById(id);
  const settingsKey = 'gaya-audio-v1';
  const soundtrack = new GayaSoundtrack({
    state: () => ({ hidden: document.hidden, creator: get('creator').open, codex: get('codex').open || get('chronicles').open, login: get('login').open, player, raid: !!raid, madregona: !!player && !!madregona?.revealed && madregona.hp>0 && distance(player,madregona)<6, morph: morphUntil > clock }),
    onStatus: text => { get('audioStatus').textContent = text; get('audioEnabled').checked = soundtrack.enabled; refreshButton(); },
  });
  let requested = false;
  try { const saved = JSON.parse(localStorage.getItem(settingsKey)); if (saved) { soundtrack.setVolume(saved.volume); requested = saved.enabled === true; } } catch { /* Session-only controls remain usable. */ }
  function refreshButton() { get('soundButton').textContent = soundtrack.enabled ? '♫ Trilha ativa' : '♫ Ativar trilha'; get('creatorSound').textContent = soundtrack.enabled ? '♫ Silenciar trilha' : '♫ Ativar trilha'; }
  function persist() { try { localStorage.setItem(settingsKey, JSON.stringify({ enabled: requested, volume: soundtrack.volume })); } catch { /* Audio does not depend on storage. */ } }
  function enable(value) { requested = value; void soundtrack.setEnabled(value); get('audioEnabled').checked = value; refreshButton(); persist(); }
  get('audioVolume').value = Math.round(soundtrack.volume * 100);
  get('volumeValue').textContent = get('audioVolume').value + '%';
  get('soundButton').onclick = () => get('soundtrack').showModal();
  get('creatorSound').onclick = () => { enable(!soundtrack.enabled); get('creatorSound').textContent = soundtrack.enabled ? '♫ Silenciar trilha' : '♫ Ativar trilha'; };
  get('closeSoundtrack').onclick = () => { soundtrack.preview = ''; get('soundtrack').close(); void soundtrack.update(); };
  get('soundtrack').addEventListener('close', () => { soundtrack.preview = ''; void soundtrack.update(); });
  get('audioEnabled').onchange = event => enable(event.target.checked);
  get('audioVolume').oninput = event => { soundtrack.setVolume(Number(event.target.value) / 100); get('volumeValue').textContent = event.target.value + '%'; persist(); };
  for (const track of TRACKS) get('audioPreview').add(new Option(`${track.scene} — ${track.title}`, track.id));
  get('playPreview').onclick = () => { soundtrack.preview = get('audioPreview').value; enable(true); };
  get('autoMusic').onclick = () => { soundtrack.preview = ''; enable(true); };
  const unlock = event => { if (event.target.closest('#creatorSound,#audioEnabled,#playPreview,#autoMusic')) return; if (requested && !soundtrack.enabled) enable(true); };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('visibilitychange', () => void soundtrack.update());
  window.addEventListener('pagehide', () => soundtrack.stop());
  setInterval(() => void soundtrack.update(), 120);
  refreshButton();
}
