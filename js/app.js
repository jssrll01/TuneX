(function () {
'use strict';
const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

/* ---------- storage ---------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function usePersist(key, init) {
  const [v, setV] = useState(() => LS.get(key, init));
  useEffect(() => { LS.set(key, v); }, [key, v]);
  return [v, setV];
}

/* ---------- constants ---------- */
const DEFAULTS = {
  volume: 80, muted: false, rate: 1, repeat: 'off', shuffle: false, autoplay: true,
  accent: '#7c3aed', karaokeOnly: true, bright: 100, contrast: 100, sat: 100,
  crop: false, glow: true, focus: false,
  mic: { vol: 1, echo: 0.15, echoTime: 0.25, reverb: 0.2, size: 1.6, bass: 0, treble: 0, monitor: true, preset: 'Studio' }
};
const PRESETS = {
  Clean:   { echo: 0,    echoTime: 0.2,  reverb: 0,    size: 1,   bass: 0,  treble: 0 },
  Studio:  { echo: 0.15, echoTime: 0.18, reverb: 0.2,  size: 1.4, bass: 2,  treble: 2 },
  Hall:    { echo: 0.2,  echoTime: 0.3,  reverb: 0.55, size: 2.4, bass: 1,  treble: 1 },
  Stadium: { echo: 0.45, echoTime: 0.45, reverb: 0.75, size: 3,   bass: 3,  treble: 1 },
  Warm:    { echo: 0.1,  echoTime: 0.2,  reverb: 0.25, size: 1.6, bass: 5,  treble: -2 },
  Radio:   { echo: 0.05, echoTime: 0.15, reverb: 0.05, size: 0.8, bass: -4, treble: 5 }
};
const ACCENTS = ['#7c3aed', '#ec4899', '#2563eb', '#0d9488', '#f97316', '#ef4444'];
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const FEATURES = [
  'Locked video: touches never reach YouTube', 'Play / pause button', 'Previous song', 'Next song', 'Restart song',
  'Back 10 seconds', 'Forward 10 seconds', 'Seek bar', 'Volume slider', 'Mute',
  'Playback speed 0.5x to 2x', 'A-B loop', 'Repeat off / all / one', 'Shuffle', 'Autoplay next',
  'Sleep timer', 'Keyboard shortcuts', 'YouTube search with your API key', 'Karaoke-only filter', 'Recent searches',
  'Paste a YouTube link or ID', 'Load more results', 'Add to queue', 'Play next', 'Reorder queue',
  'Remove from queue / clear queue', 'Favorites', 'History', 'Save queue as playlist', 'Load and enqueue playlists',
  'Export / import library', 'Song durations', 'Microphone on / off', 'Mic volume', 'Echo amount',
  'Echo time', 'Reverb amount', 'Room size', 'Bass', 'Treble',
  '6 voice presets', 'Live mic level meter', 'Headphone monitor toggle', 'Sing score with grade', 'Video brightness / contrast / saturation',
  'Clean crop of the YouTube UI', '6 accent colors', 'Party glow that follows your voice', 'Focus mode with auto-hiding controls', 'Fullscreen landscape + screen wake lock'
];
const SHORTCUTS = 'Space play/pause · N next · P previous · R restart · Left/Right seek 10s · Up/Down volume · M mute · L A-B loop · F fullscreen';

/* ---------- helpers ---------- */
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const dec = (s) => { const t = document.createElement('textarea'); t.innerHTML = s || ''; return t.value; };
const parseDur = (iso) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || ''); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
const thumbOf = (id) => 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';
const extractId = (s) => {
  s = (s || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(s);
  return m ? m[1] : '';
};
const grade = (n) => (n >= 90 ? 'S' : n >= 80 ? 'A' : n >= 65 ? 'B' : n >= 50 ? 'C' : 'D');
const cleanSongs = (a) => (Array.isArray(a) ? a.filter((x) => x && typeof x.id === 'string' && /^[\w-]{11}$/.test(x.id)).map((x) => ({ id: x.id, title: String(x.title || '').slice(0, 200), channel: String(x.channel || '').slice(0, 100), thumb: thumbOf(x.id), dur: +x.dur || 0 })) : []);

/* ---------- YouTube Data API ---------- */
async function yt(path, params, key) {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + path);
  u.search = new URLSearchParams(Object.assign({}, params, { key: key })).toString();
  let r;
  try { r = await fetch(u); } catch (e) { throw new Error('No internet connection.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = j.error || {};
    const reason = (e.errors && e.errors[0] && e.errors[0].reason) || '';
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') throw new Error('Daily YouTube quota used up. Try again tomorrow or use another key.');
    if (reason === 'keyInvalid' || /API key/i.test(e.message || '')) throw new Error('YouTube rejected this API key.');
    throw new Error(e.message || 'YouTube request failed.');
  }
  return j;
}
async function details(ids, key) {
  if (!ids.length) return {};
  const j = await yt('videos', { part: 'contentDetails,snippet', id: ids.join(','), maxResults: 50 }, key);
  const m = {};
  (j.items || []).forEach((v) => { m[v.id] = { dur: parseDur(v.contentDetails && v.contentDetails.duration), title: dec(v.snippet.title), channel: dec(v.snippet.channelTitle) }; });
  return m;
}
async function search(q, key, token) {
  const j = await yt('search', Object.assign({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '20', q: q }, token ? { pageToken: token } : {}), key);
  const items = (j.items || []).filter((i) => i.id && i.id.videoId);
  let d = {};
  try { d = await details(items.map((i) => i.id.videoId), key); } catch (e) {}
  return {
    next: j.nextPageToken || '',
    items: items.map((i) => ({ id: i.id.videoId, title: dec(i.snippet.title), channel: dec(i.snippet.channelTitle), thumb: thumbOf(i.id.videoId), dur: (d[i.id.videoId] && d[i.id.videoId].dur) || 0 }))
  };
}

/* ---------- microphone engine (Web Audio) ---------- */
const Mic = {
  ctx: null, n: null, stream: null,
  async start() {
    if (this.ctx) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const hp = ctx.createBiquadFilter(), bass = ctx.createBiquadFilter(), treble = ctx.createBiquadFilter();
    const comp = ctx.createDynamicsCompressor(), master = ctx.createGain(), echoSend = ctx.createGain();
    const delay = ctx.createDelay(1.5), fb = ctx.createGain(), revSend = ctx.createGain(), conv = ctx.createConvolver();
    const ana = ctx.createAnalyser(), mon = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 90;
    bass.type = 'lowshelf'; bass.frequency.value = 200;
    treble.type = 'highshelf'; treble.frequency.value = 3500;
    ana.fftSize = 1024;
    const eqf = [60, 170, 310, 600, 1000, 3000, 6000, 12000].map((f) => { const b = ctx.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = 1.1; return b; });
    src.connect(hp); hp.connect(bass); bass.connect(treble); eqf.reduce((a, b) => { a.connect(b); return b; }, treble).connect(comp); comp.connect(master);
    comp.connect(echoSend); echoSend.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
    comp.connect(revSend); revSend.connect(conv); conv.connect(master);
    master.connect(ana); ana.connect(mon); mon.connect(ctx.destination);
    this.ctx = ctx; this.stream = stream;
    this.n = { master, echoSend, delay, fb, revSend, conv, bass, treble, eqf, mon, ana, buf: new Float32Array(ana.fftSize) };
  },
  stop() {
    try { if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    try { if (this.ctx) this.ctx.close(); } catch (e) {}
    this.ctx = null; this.n = null; this.stream = null;
  },
  apply(fx) {
    const n = this.n; if (!n) return;
    const t = this.ctx.currentTime, s = (p, v) => p.setTargetAtTime(v, t, 0.03);
    s(n.master.gain, fx.vol); s(n.echoSend.gain, fx.echo); s(n.delay.delayTime, fx.echoTime);
    s(n.fb.gain, Math.min(0.6, 0.2 + fx.echo * 0.6)); s(n.revSend.gain, fx.reverb * 1.4);
    s(n.bass.gain, fx.bass); s(n.treble.gain, fx.treble); n.eqf.forEach((b, i) => s(b.gain, (fx.eq && fx.eq[i]) || 0)); s(n.mon.gain, fx.monitor ? 1 : 0);
  },
  room(sec) {
    if (!this.n) return;
    const ctx = this.ctx, len = Math.max(1, Math.floor(ctx.sampleRate * sec)), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.n.conv.buffer = b;
  },
  level() {
    const n = this.n; if (!n) return 0;
    n.ana.getFloatTimeDomainData(n.buf);
    let s = 0; for (let i = 0; i < n.buf.length; i++) s += n.buf[i] * n.buf[i];
    return Math.sqrt(s / n.buf.length);
  }
};

/* ---------- icons ---------- */
const P = {
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
  next: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
  prev: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>',
  restart: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  back: '<path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/>',
  fwd: '<path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/>',
  vol: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  mute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  micoff: '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  heartf: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6M14 11v6"/>',
  up: '<polyline points="18 15 12 9 6 15"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  repeat: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  shuffle: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  full: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  rotate: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M9 18h6"/>',
  dots: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
};
const I = (n, z) => { const s = z || 20; return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML=${{ __html: P[n] }}></svg>`; };

/* ---------- small UI parts ---------- */
const Slider = ({ label, value, min, max, step, onChange, unit }) => html`
  <label className="sl">
    <span>${label}<b>${Math.round(value * 100) / 100}${unit || ''}</b></span>
    <input type="range" min=${min} max=${max} step=${step || 1} value=${value} style=${{ '--p': ((value - min) / (max - min)) * 100 + '%' }} onChange=${(e) => onChange(+e.target.value)} />
  </label>`;
const Switch = ({ on, onClick, label, desc }) => html`
  <div className="sw"><div>${label}${desc ? html`<small>${desc}</small>` : null}</div><button className=${'tg' + (on ? ' on' : '')} role="switch" aria-checked=${on} aria-label=${label} onClick=${onClick}></button></div>`;

function SongRow({ s, active, onPlay, acts }) {
  return html`
    <div className=${'row' + (active ? ' act' : '')} onClick=${onPlay}>
      <img src=${s.thumb || thumbOf(s.id)} alt="" loading="lazy" />
      <div className="m"><b>${s.title}</b><small>${s.channel}${s.dur ? ' · ' + fmt(s.dur) : ''}</small></div>
      <div className="acts" onClick=${(e) => e.stopPropagation()}>
        ${acts.map((a, i) => html`<button key=${i} className=${'mini' + (a[3] ? ' on' : '')} title=${a[1]} aria-label=${a[1]} onClick=${a[2]}>${I(a[0], 17)}</button>`)}
      </div>
    </div>`;
}

function SeekBar({ P: pr, loop, fallback }) {
  const [cur, setCur] = useState(0), [dur, setDur] = useState(0), [drag, setDrag] = useState(null);
  const D = useRef(null); D.current = drag;
  useEffect(() => {
    const id = setInterval(() => {
      const p = pr.current; if (!p || !p.getCurrentTime) return;
      try {
        const c = p.getCurrentTime() || 0, d = p.getDuration() || 0;
        if (D.current == null) setCur(c);
        setDur(d);
        if (loop.a != null && loop.b != null && c >= loop.b) p.seekTo(loop.a, true);
      } catch (e) {}
    }, 250);
    return () => clearInterval(id);
  }, [pr, loop.a, loop.b]);
  const total = dur || fallback || 0, val = drag != null ? drag : cur;
  const commit = () => { if (D.current != null) { try { pr.current.seekTo(D.current, true); } catch (e) {} setCur(D.current); setDrag(null); } };
  const mk = (t) => (total && t != null ? html`<div className="mk" style=${{ left: 'calc(' + (t / total) * 100 + '% - 1px)' }}></div>` : null);
  return html`
    <div className="seek">
      <span className="t">${fmt(val)}</span>
      <div className="seekwrap">
        ${mk(loop.a)}${mk(loop.b)}
        <input type="range" min="0" max=${Math.max(1, total)} step="0.5" value=${Math.min(val, Math.max(1, total))} aria-label="Seek"
          style=${{ '--p': (total ? (val / total) * 100 : 0) + '%' }}
          onChange=${(e) => setDrag(+e.target.value)} onPointerUp=${commit} onTouchEnd=${commit} onKeyUp=${commit} onBlur=${commit} />
      </div>
      <span className="t">${fmt(total)}</span>
    </div>`;
}

/* ---------- first-run screens ---------- */
function Setup({ onSave }) {
  const [key, setKey] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const go = async (e) => {
    e.preventDefault();
    const k = key.trim(); if (!k) return;
    setBusy(true); setErr('');
    try { await yt('videos', { part: 'id', id: 'dQw4w9WgXcQ' }, k); LS.set('tunex.apiKey', k); onSave(k); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return html`
    <div className="screen" style=${{ '--accent': '#7c3aed' }}>
      <form className="sheet" onSubmit=${go}>
        <h1><span className="logo">${I('music', 18)}</span>Welcome to TuneX</h1>
        <p>TuneX plays karaoke from YouTube. Enter your own YouTube Data API key to continue. It is saved only in this browser and sent only to Google.</p>
        <ol>
          <li>Open <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> and enable <b>YouTube Data API v3</b>.</li>
          <li>Create an API key under Credentials.</li>
          <li>Paste it below (tip: restrict it to YouTube Data API v3).</li>
        </ol>
        <input className="field" value=${key} onChange=${(e) => setKey(e.target.value)} placeholder="Paste your API key (AIza...)" autoComplete="off" autoCapitalize="off" spellCheck="false" />
        ${err ? html`<div className="err">${err}</div>` : null}
        <button className="cta" type="submit" disabled=${busy || !key.trim()}>${busy ? 'Checking key...' : 'Verify and continue'}</button>
      </form>
    </div>`;
}
function Start({ onStart }) {
  return html`
    <div className="screen" style=${{ '--accent': LS.get('tunex.settings', {}).accent || '#7c3aed' }}>
      <div className="sheet" style=${{ textAlign: 'center' }}>
        <h1 style=${{ justifyContent: 'center' }}><span className="logo">${I('music', 18)}</span>TuneX</h1>
        <p>Karaoke mode runs fullscreen in landscape. Tap start, then search for a song.</p>
        <button className="cta" onClick=${onStart}>Start singing</button>
      </div>
    </div>`;
}
function enterFull() {
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen() : null;
    Promise.resolve(p).then(() => { try { return screen.orientation.lock('landscape'); } catch (e) {} }).catch(() => {});
  } catch (e) {}
}

/* ---------- search pane ---------- */
function SearchPane({ apiKey, kOnly, setK, recent, pushRecent, clearRecent, A: A0 }) {
  const [q, setQ] = useState(''), [items, setItems] = useState([]), [next, setNext] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const A = Object.assign({}, A0, { play: (s) => { setQ(''); return A0.play(s); }, add: (s) => { setQ(''); return A0.add(s); }, playNext: (s) => { setQ(''); return A0.playNext(s); } });
  const run = async (text, more) => {
    const raw = (text == null ? q : text).trim(); if (!raw) return;
    if (text != null) setQ(text);
    setErr(''); setBusy(true);
    try {
      const id = extractId(raw);
      if (id) {
        const d = await details([id], apiKey);
        if (!d[id]) throw new Error('Video not found or not embeddable.');
        setItems([{ id, title: d[id].title, channel: d[id].channel, thumb: thumbOf(id), dur: d[id].dur }]); setNext('');
      } else {
        const term = kOnly && !/karaoke/i.test(raw) ? raw + ' karaoke' : raw;
        const r = await search(term, apiKey, more ? next : '');
        setItems(more ? items.concat(r.items) : r.items); setNext(r.next);
        if (!more) pushRecent(raw);
      }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return html`
    <div>
      <form className="sform" onSubmit=${(e) => { e.preventDefault(); run(null, false); }}>
        <input className="field" value=${q} onChange=${(e) => setQ(e.target.value)} placeholder="Song, artist or YouTube link" enterKeyHint="search" />
        <button type="submit" aria-label="Search">${I('search', 19)}</button>
      </form>
      <${Switch} on=${kOnly} onClick=${() => setK(!kOnly)} label="Karaoke only" desc="Adds 'karaoke' to your search" />
      ${recent.length && !items.length ? html`
        <div className="h">Recent searches <button className="pill" style=${{ marginLeft: 6 }} onClick=${clearRecent}>Clear</button></div>
        <div className="chips">${recent.map((r) => html`<button key=${r} className="pill" onClick=${() => run(r, false)}>${r}</button>`)}</div>` : null}
      ${err ? html`<div className="err">${err}</div>` : null}
      ${busy && !items.length ? html`<div className="empt">Searching...</div>` : null}
      ${items.map((s) => html`<${SongRow} key=${s.id} s=${s} onPlay=${() => A.play(s)}
        acts=${[['plus', 'Add to queue', () => A.add(s)], ['zap', 'Play next', () => A.playNext(s)], [A.isFav(s.id) ? 'heartf' : 'heart', 'Favorite', () => A.fav(s), A.isFav(s.id)]]} />`)}
      ${next ? html`<button className="btn2" style=${{ width: '100%', marginTop: 8 }} disabled=${busy} onClick=${() => run(null, true)}>${busy ? 'Loading...' : 'Load more'}</button>` : null}
      ${!items.length && !busy && !err ? html`<div className="empt">Search for a song to start your karaoke night.</div>` : null}
    </div>`;
}

/* ---------- main app ---------- */
function App({ apiKey, onResetKey }) {
  const [st, setSt] = useState(() => { const s = LS.get('tunex.settings', {}); return Object.assign({}, DEFAULTS, s, { mic: Object.assign({}, DEFAULTS.mic, s.mic || {}) }); });
  const set = useCallback((k, v) => setSt((s) => Object.assign({}, s, { [k]: v })), []);
  const setMic = useCallback((patch) => setSt((s) => Object.assign({}, s, { mic: Object.assign({}, s.mic, patch) })), []);
  useEffect(() => { LS.set('tunex.settings', st); }, [st]);

  const [queue, setQueue] = usePersist('tunex.queue', []);
  const [favs, setFavs] = usePersist('tunex.favs', []);
  const [hist, setHist] = usePersist('tunex.hist', []);
  const [lists, setLists] = usePersist('tunex.lists', {});
  const [recent, setRecent] = usePersist('tunex.recent', []);
  const [idx, setIdx] = useState(-1);
  const [token, setToken] = useState(0);
  const [tab, setTab] = useState('search');
  const [lib, setLib] = useState('favs');
  const [ready, setReady] = useState(false), [playing, setPlaying] = useState(false);
  const [loopAB, setLoopAB] = useState({ a: null, b: null });
  const [micOn, setMicOn] = useState(false), [score, setScore] = useState(null);
  const [msg, setMsg] = useState(''), [sleep, setSleep] = useState(0), [idle, setIdle] = useState(false);
  const [plName, setPlName] = useState('');

  const P_ = useRef(null), host = useRef(null), glow = useRef(null), meter = useRef(null);
  const tt = useRef(0), scoreRef = useRef({ n: 0, a: 0 }), H = useRef({}), K = useRef({}), R = useRef({});
  const now = idx >= 0 ? queue[idx] : null;
  R.current = { queue, idx, st, loopAB, playing };

  const toast = useCallback((m) => { setMsg(m); clearTimeout(tt.current); tt.current = setTimeout(() => setMsg(''), 2600); }, []);
  const playIndex = (i) => { setIdx(i); setToken((t) => t + 1); };

  const calcScore = () => { const s = scoreRef.current; return s.n < 25 ? null : Math.min(100, Math.round((s.a / s.n) * 130)); };
  const applyAudio = () => { const p = P_.current, s = R.current.st; try { p.setVolume(s.volume); if (s.muted) p.mute(); else p.unMute(); p.setPlaybackRate(s.rate); } catch (e) {} };
  const nextIndex = () => {
    const { queue: q, idx: i, st: s } = R.current;
    if (!q.length) return -1;
    if (s.shuffle && q.length > 1) { let j; do { j = Math.floor(Math.random() * q.length); } while (j === i); return j; }
    if (i + 1 < q.length) return i + 1;
    return s.repeat === 'all' ? 0 : -1;
  };
  const next = () => { const j = nextIndex(); if (j < 0) toast('End of queue'); else playIndex(j); };
  const restart = () => { try { P_.current.seekTo(0, true); P_.current.playVideo(); } catch (e) {} };
  const prev = () => { let c = 0; try { c = P_.current.getCurrentTime(); } catch (e) {} if (c > 3 || R.current.idx <= 0) restart(); else playIndex(R.current.idx - 1); };
  const toggle = () => {
    if (R.current.idx < 0) { if (R.current.queue.length) playIndex(0); else { toast('Search for a song first'); setTab('search'); } return; }
    try { if (R.current.playing) P_.current.pauseVideo(); else P_.current.playVideo(); } catch (e) {}
  };
  const seekBy = (d) => { try { const p = P_.current; p.seekTo(Math.max(0, p.getCurrentTime() + d), true); } catch (e) {} };
  const cycleLoop = () => {
    const p = P_.current; if (!p || R.current.idx < 0) return;
    let t = 0; try { t = p.getCurrentTime(); } catch (e) {}
    const l = R.current.loopAB;
    if (l.a == null) { setLoopAB({ a: t, b: null }); toast('Loop start set (A). Press again for B'); }
    else if (l.b == null) { if (t <= l.a + 1) toast('Pick B later in the song'); else { setLoopAB({ a: l.a, b: t }); toast('Looping A-B'); } }
    else { setLoopAB({ a: null, b: null }); toast('Loop cleared'); }
  };
  const toggleFull = () => { if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} } else enterFull(); };

  const finish = () => {
    const sc = calcScore();
    if (sc != null && Mic.ctx) toast('Song finished · Sing score ' + sc + ' (' + grade(sc) + ')');
    if (R.current.st.repeat === 'one') { restart(); scoreRef.current = { n: 0, a: 0 }; return; }
    if (R.current.st.autoplay) { const j = nextIndex(); if (j >= 0) playIndex(j); }
  };
  H.current = {
    state: (s) => {
      const Y = window.YT.PlayerState;
      if (s === Y.PLAYING) { setPlaying(true); applyAudio(); }
      else if (s === Y.PAUSED) setPlaying(false);
      else if (s === Y.ENDED) { setPlaying(false); finish(); }
    },
    error: () => {
      setPlaying(false);
      toast('This video cannot be played here.');
      if (R.current.st.autoplay && R.current.queue.length > 1) setTimeout(() => { const j = nextIndex(); if (j >= 0) playIndex(j); }, 1500);
    }
  };

  /* player setup */
  useEffect(() => {
    let dead = false;
    const make = () => {
      if (dead || !window.YT || !window.YT.Player || !host.current) return;
      const el = document.createElement('div'); host.current.appendChild(el);
      P_.current = new window.YT.Player(el, {
        width: '100%', height: '100%',
        playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, origin: location.origin },
        events: { onReady: () => setReady(true), onStateChange: (e) => H.current.state(e.data), onError: (e) => H.current.error(e.data) }
      });
    };
    if (window.YT && window.YT.Player) make();
    else {
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prevCb) prevCb(); make(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
    }
    return () => { dead = true; try { if (P_.current) P_.current.destroy(); } catch (e) {} };
  }, []);

  /* load song */
  useEffect(() => {
    if (!ready || idx < 0) return;
    const s = R.current.queue[idx]; if (!s) return;
    try { P_.current.loadVideoById(s.id); } catch (e) {}
    setLoopAB({ a: null, b: null }); setScore(null); scoreRef.current = { n: 0, a: 0 };
    setHist((h) => [Object.assign({}, s, { at: Date.now() })].concat(h.filter((x) => x.id !== s.id)).slice(0, 100));
  }, [ready, idx, token]);
  useEffect(() => { if (ready) applyAudio(); }, [ready, st.volume, st.muted, st.rate]);
  useEffect(() => {
    document.title = now && playing ? now.title + ' · TuneX' : 'TuneX';
  }, [now, playing]);

  /* mic */
  const toggleMic = async () => {
    if (micOn) { Mic.stop(); setMicOn(false); return; }
    try {
      await Mic.start(); Mic.room(R.current.st.mic.size); Mic.apply(R.current.st.mic); setMicOn(true);
      toast('Mic on · use headphones to avoid feedback');
    } catch (e) { toast('Microphone blocked. Allow mic access for this site.'); }
  };
  useEffect(() => { if (micOn) Mic.apply(st.mic); }, [micOn, st.mic]);
  useEffect(() => { if (!micOn) return; const t = setTimeout(() => Mic.room(R.current.st.mic.size), 250); return () => clearTimeout(t); }, [micOn, st.mic.size]);
  useEffect(() => () => Mic.stop(), []);
  useEffect(() => {
    if (!micOn) return;
    let raf, last = 0;
    const loop = (t) => {
      const lv = Mic.level(), v = Math.min(1, lv * 6);
      if (meter.current) meter.current.style.width = v * 100 + '%';
      if (glow.current) { glow.current.style.opacity = R.current.st.glow ? String(0.1 + v * 0.8) : '0'; glow.current.style.transform = 'scale(' + (1 + v * 0.25) + ')'; }
      if (t - last > 200) { last = t; if (R.current.playing) { scoreRef.current.n++; if (lv > 0.02) scoreRef.current.a++; } }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const iv = setInterval(() => { if (R.current.playing) setScore(calcScore()); }, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); if (glow.current) glow.current.style.opacity = '0'; if (meter.current) meter.current.style.width = '0'; };
  }, [micOn]);

  /* sleep timer, wake lock, focus mode, keyboard */
  useEffect(() => {
    if (!sleep) return;
    const t = setTimeout(() => { try { P_.current.pauseVideo(); } catch (e) {} setSleep(0); toast('Sleep timer: paused'); }, sleep * 60000);
    return () => clearTimeout(t);
  }, [sleep]);
  useEffect(() => {
    let lock = null;
    const get = async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) {} };
    const vis = () => { if (document.visibilityState === 'visible') get(); };
    get(); document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); try { if (lock) lock.release(); } catch (e) {} };
  }, []);
  useEffect(() => {
    if (!st.focus) { setIdle(false); return; }
    let t; const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 3500); };
    wake();
    const ev = ['pointermove', 'pointerdown', 'keydown'];
    ev.forEach((e) => window.addEventListener(e, wake));
    return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, wake)); };
  }, [st.focus]);
  K.current = { toggle, next, prev, restart, seekBy, cycleLoop, toggleFull, vol: (d) => set('volume', Math.max(0, Math.min(100, R.current.st.volume + d))), mute: () => set('muted', !R.current.st.muted) };
  useEffect(() => {
    const h = (e) => {
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key, f = K.current;
      if (k === ' ') { if (t && t.tagName === 'BUTTON') return; e.preventDefault(); f.toggle(); }
      else if (k === 'ArrowRight') { e.preventDefault(); f.seekBy(10); }
      else if (k === 'ArrowLeft') { e.preventDefault(); f.seekBy(-10); }
      else if (k === 'ArrowUp') { e.preventDefault(); f.vol(5); }
      else if (k === 'ArrowDown') { e.preventDefault(); f.vol(-5); }
      else if (k === 'n' || k === 'N') f.next();
      else if (k === 'p' || k === 'P') f.prev();
      else if (k === 'r' || k === 'R') f.restart();
      else if (k === 'm' || k === 'M') f.mute();
      else if (k === 'l' || k === 'L') f.cycleLoop();
      else if (k === 'f' || k === 'F') f.toggleFull();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  /* library actions */
  const isFav = (id) => favs.some((f) => f.id === id);
  const A = {
    isFav,
    play: (s) => { const q = R.current.queue.slice(); const at = R.current.idx >= 0 ? R.current.idx + 1 : q.length; q.splice(at, 0, s); setQueue(q); playIndex(at); },
    add: (s) => { const q = R.current.queue; setQueue(q.concat([s])); if (R.current.idx < 0) playIndex(q.length); else toast('Added to queue'); },
    playNext: (s) => { if (R.current.idx < 0) { A.play(s); return; } const q = R.current.queue.slice(); q.splice(R.current.idx + 1, 0, s); setQueue(q); toast('Plays next'); },
    fav: (s) => setFavs((f) => (f.some((x) => x.id === s.id) ? f.filter((x) => x.id !== s.id) : [s].concat(f)))
  };
  const removeAt = (i) => {
    const q = queue.filter((_, k) => k !== i); setQueue(q);
    if (i < idx) setIdx(idx - 1);
    else if (i === idx) { if (q.length) playIndex(Math.min(i, q.length - 1)); else { setIdx(-1); setPlaying(false); try { P_.current.stopVideo(); } catch (e) {} } }
  };
  const move = (i, d) => {
    const j = i + d; if (j < 0 || j >= queue.length) return;
    const q = queue.slice(); const t = q[i]; q[i] = q[j]; q[j] = t; setQueue(q);
    if (idx === i) setIdx(j); else if (idx === j) setIdx(i);
  };
  const clearQ = () => { setQueue([]); setIdx(-1); setPlaying(false); try { P_.current.stopVideo(); } catch (e) {} };
  const savePl = () => { const n = plName.trim().slice(0, 40); if (!n || !queue.length) return toast('Name it and add songs first'); setLists((l) => Object.assign({}, l, { [n]: queue })); setPlName(''); toast('Playlist saved'); };
  const loadPl = (n, replace) => {
    const songs = lists[n] || []; if (!songs.length) return;
    if (replace) { setQueue(songs); playIndex(0); } else { setQueue(queue.concat(songs)); if (idx < 0) playIndex(queue.length); toast('Added ' + songs.length + ' songs'); }
  };
  const exportLib = () => {
    const data = { v: 1, favs, hist, lists, queue, settings: st };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'tunex-library.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };
  const importLib = (file) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (d.favs) setFavs(cleanSongs(d.favs));
        if (d.hist) setHist(cleanSongs(d.hist));
        if (d.queue) { setQueue(cleanSongs(d.queue)); setIdx(-1); }
        if (d.lists && typeof d.lists === 'object') { const o = {}; Object.keys(d.lists).slice(0, 50).forEach((k) => { o[String(k).slice(0, 40)] = cleanSongs(d.lists[k]); }); setLists(o); }
        if (d.settings && typeof d.settings === 'object') {
          setSt((s) => {
            const n = Object.assign({}, s);
            Object.keys(DEFAULTS).forEach((k) => { if (k !== 'mic' && typeof d.settings[k] === typeof DEFAULTS[k]) n[k] = d.settings[k]; });
            if (!/^#[0-9a-f]{6}$/i.test(n.accent)) n.accent = DEFAULTS.accent;
            if (d.settings.mic && typeof d.settings.mic === 'object') { const m = Object.assign({}, s.mic); Object.keys(DEFAULTS.mic).forEach((k) => { if (typeof d.settings.mic[k] === typeof DEFAULTS.mic[k]) m[k] = d.settings.mic[k]; }); n.mic = m; }
            return n;
          });
        }
        toast('Library imported');
      } catch (e) { toast('That is not a valid TuneX file'); }
    };
    fr.readAsText(file);
  };
  const resetAll = () => { if (window.confirm('Erase queue, favorites, history, playlists and settings from this browser?')) { Object.keys(localStorage).filter((k) => k.indexOf('tunex.') === 0 && k !== 'tunex.apiKey').forEach((k) => LS.del(k)); location.reload(); } };

  const mic = st.mic;
  const vfilter = 'brightness(' + st.bright + '%) contrast(' + st.contrast + '%) saturate(' + st.sat + '%)';
  const upnext = queue[idx + 1];
  const tabs = [['search', 'search', 'Search'], ['queue', 'list', 'Queue'], ['lib', 'folder', 'Saved'], ['mic', 'mic', 'Mic'], ['look', 'sliders', 'Look'], ['more', 'dots', 'More']];
  const pill = (on, label, fn) => html`<button key=${label} className=${'pill' + (on ? ' on' : '')} onClick=${fn}>${label}</button>`;

  return html`
    <div className=${'app' + (st.focus ? ' focus' : '') + (idle ? ' idle' : '')} style=${{ '--accent': st.accent }}>
      <div className="glow" ref=${glow}></div>
      <main className="stage">
        <header className="top">
          <div className="brand"><span className="logo">${I('music', 17)}</span>TuneX</div>
          <div className="np">${now ? html`<b>${now.title}</b><small>${now.channel}</small>` : html`<b>Pick a song to start singing</b><small>Search karaoke tracks on the right</small>`}</div>
          <div className="topbtns">
            <button className=${'ib' + (micOn ? ' on' : '')} onClick=${toggleMic} aria-label="Microphone" title="Microphone">${I(micOn ? 'mic' : 'micoff', 19)}</button>
            <button className=${'ib' + (st.focus ? ' on' : '')} onClick=${() => set('focus', !st.focus)} aria-label="Focus mode" title="Focus mode">${I('eye', 19)}</button>
            <button className="ib" onClick=${toggleFull} aria-label="Fullscreen" title="Fullscreen">${I('full', 19)}</button>
          </div>
        </header>

        <div className="vwrap"><div className="vbox">
          <div className="vframe" style=${{ filter: vfilter }}><div className=${'vhost' + (st.crop ? ' crop' : '')} ref=${host}></div></div>
          ${!now ? html`<div className="empty"><div><h2>Ready when you are</h2><p>Search a song, tap it, and sing along.</p></div></div>` : null}
          <div className="shield"></div>
          ${micOn && score != null ? html`<div className="chip tl">Sing score ${score} · ${grade(score)}</div>` : null}
          ${upnext ? html`<div className="chip bl">Up next: ${upnext.title}</div>` : null}
          ${sleep ? html`<div className="chip tr">Sleep ${sleep}m</div>` : null}
        </div></div>

        <section className="transport">
          <${SeekBar} P=${P_} loop=${loopAB} fallback=${now ? now.dur : 0} />
          <div className="btnrow">
            <div className="grp">
              <button className=${'ib' + (st.shuffle ? ' on' : '')} onClick=${() => set('shuffle', !st.shuffle)} aria-label="Shuffle" title="Shuffle">${I('shuffle', 19)}</button>
              <button className=${'ib' + (st.repeat !== 'off' ? ' on' : '')} onClick=${() => set('repeat', st.repeat === 'off' ? 'all' : st.repeat === 'all' ? 'one' : 'off')} aria-label="Repeat" title=${'Repeat: ' + st.repeat}>${I('repeat', 19)}</button>
              <button className=${'ib txt' + (loopAB.a != null ? ' on' : '')} onClick=${cycleLoop} aria-label="A-B loop" title="A-B loop">${loopAB.a == null ? 'A-B' : loopAB.b == null ? 'A..' : 'A-B on'}</button>
            </div>
            <div className="grp">
              <button className="ib" onClick=${prev} aria-label="Previous" title="Previous">${I('prev', 21)}</button>
              <button className="ib" onClick=${() => seekBy(-10)} aria-label="Back 10 seconds" title="Back 10s">${I('back', 21)}</button>
              <button className="ib big" onClick=${toggle} aria-label=${playing ? 'Pause' : 'Play'}>${I(playing ? 'pause' : 'play', 26)}</button>
              <button className="ib" onClick=${() => seekBy(10)} aria-label="Forward 10 seconds" title="Forward 10s">${I('fwd', 21)}</button>
              <button className="ib" onClick=${next} aria-label="Next" title="Next">${I('next', 21)}</button>
              <button className="ib" onClick=${restart} aria-label="Restart" title="Restart">${I('restart', 18)}</button>
            </div>
            <div className="grp right">
              <button className="ib txt" onClick=${() => set('rate', RATES[(RATES.indexOf(st.rate) + 1) % RATES.length])} aria-label="Speed" title="Playback speed">${st.rate}x</button>
              <button className=${'ib' + (st.muted ? ' on' : '')} onClick=${() => set('muted', !st.muted)} aria-label="Mute" title="Mute">${I(st.muted || st.volume === 0 ? 'mute' : 'vol', 20)}</button>
              <input className="vol" type="range" min="0" max="100" value=${st.volume} aria-label="Volume" style=${{ '--p': st.volume + '%' }} onChange=${(e) => { set('volume', +e.target.value); if (st.muted) set('muted', false); }} />
            </div>
          </div>
        </section>
      </main>

      <aside className="side">
        <nav className="tabs">
          ${tabs.map((t) => html`<button key=${t[0]} className=${'tab' + (tab === t[0] ? ' on' : '')} onClick=${() => setTab(t[0])}>${I(t[1], 19)}<span>${t[2]}</span>${t[0] === 'queue' && queue.length ? html`<i>${queue.length}</i>` : null}</button>`)}
        </nav>

        <section className=${'pane' + (tab === 'search' ? ' on' : '')}>
          <${SearchPane} apiKey=${apiKey} kOnly=${st.karaokeOnly} setK=${(v) => set('karaokeOnly', v)} recent=${recent} A=${A}
            pushRecent=${(r) => setRecent((l) => [r].concat(l.filter((x) => x !== r)).slice(0, 8))} clearRecent=${() => setRecent([])} />
        </section>

        <section className=${'pane' + (tab === 'queue' ? ' on' : '')}>
          <div className="inl"><input className="field" value=${plName} onChange=${(e) => setPlName(e.target.value)} placeholder="Playlist name" maxLength="40" /><button className="btn2 pri" onClick=${savePl}>Save</button><button className="btn2 dng" onClick=${clearQ}>Clear</button></div>
          ${queue.length ? queue.map((s, i) => html`<${SongRow} key=${s.id + '-' + i} s=${s} active=${i === idx} onPlay=${() => playIndex(i)}
            acts=${[['up', 'Move up', () => move(i, -1)], ['down', 'Move down', () => move(i, 1)], ['trash', 'Remove', () => removeAt(i)]]} />`) : html`<div className="empt">Your queue is empty. Add songs from Search.</div>`}
        </section>

        <section className=${'pane' + (tab === 'lib' ? ' on' : '')}>
          <div className="chips">${pill(lib === 'favs', 'Favorites', () => setLib('favs'))}${pill(lib === 'hist', 'History', () => setLib('hist'))}${pill(lib === 'lists', 'Playlists', () => setLib('lists'))}</div>
          ${lib === 'lists' ? (Object.keys(lists).length ? Object.keys(lists).map((n) => html`
            <div key=${n} className="row" onClick=${() => loadPl(n, true)}>
              <div className="m"><b>${n}</b><small>${lists[n].length} songs · tap to play</small></div>
              <div className="acts" onClick=${(e) => e.stopPropagation()}>
                <button className="mini" title="Add to queue" aria-label="Add to queue" onClick=${() => loadPl(n, false)}>${I('plus', 17)}</button>
                <button className="mini" title="Delete" aria-label="Delete" onClick=${() => setLists((l) => { const c = Object.assign({}, l); delete c[n]; return c; })}>${I('trash', 17)}</button>
              </div>
            </div>`) : html`<div className="empt">No playlists yet. Save your queue from the Queue tab.</div>`)
          : (lib === 'favs' ? favs : hist).length ? (lib === 'favs' ? favs : hist).map((s) => html`<${SongRow} key=${s.id} s=${s} onPlay=${() => A.play(s)}
            acts=${[['plus', 'Add to queue', () => A.add(s)], [A.isFav(s.id) ? 'heartf' : 'heart', 'Favorite', () => A.fav(s), A.isFav(s.id)]]} />`)
          : html`<div className="empt">${lib === 'favs' ? 'Tap the heart on a song to keep it here.' : 'Songs you play show up here.'}</div>`}
          ${lib === 'hist' && hist.length ? html`<button className="btn2 dng" style=${{ width: '100%', marginTop: 8 }} onClick=${() => setHist([])}>Clear history</button>` : null}
        </section>

        <section className=${'pane' + (tab === 'mic' ? ' on' : '')}>
          <${Switch} on=${micOn} onClick=${toggleMic} label="Microphone" desc="Sing through your device with live effects" />
          <div className="meter"><div ref=${meter}></div></div>
          <div className="note">Use headphones with the mic on, otherwise speakers will feed back. Effects change your voice only. YouTube's audio can't be processed by a web page.</div>
          <${Switch} on=${mic.monitor} onClick=${() => setMic({ monitor: !mic.monitor })} label="Hear my voice" desc="Monitor the mic in your headphones" />
          <div className="h">Voice presets</div>
          <div className="chips">${Object.keys(PRESETS).map((n) => html`<button key=${n} className=${'pill' + (mic.preset === n ? ' on' : '')} onClick=${() => setMic(Object.assign({ preset: n }, PRESETS[n]))}>${n}</button>`)}</div>
          <${Slider} label="Mic volume (1 = 100%, 10 = 1000%)" value=${mic.vol} min=${0} max=${10} step=${0.1} unit="x" onChange=${(v) => setMic({ vol: v, preset: '' })} />
          <${Slider} label="Echo" value=${mic.echo} min=${0} max=${0.9} step=${0.05} onChange=${(v) => setMic({ echo: v, preset: '' })} />
          <${Slider} label="Echo time" value=${mic.echoTime} min=${0.05} max=${0.9} step=${0.05} unit="s" onChange=${(v) => setMic({ echoTime: v, preset: '' })} />
          <${Slider} label="Reverb" value=${mic.reverb} min=${0} max=${1} step=${0.05} onChange=${(v) => setMic({ reverb: v, preset: '' })} />
          <${Slider} label="Room size" value=${mic.size} min=${0.5} max=${4} step=${0.1} unit="s" onChange=${(v) => setMic({ size: v, preset: '' })} />
          <${Slider} label="Bass" value=${mic.bass} min=${-10} max=${10} unit=" dB" onChange=${(v) => setMic({ bass: v, preset: '' })} />
          <${Slider} label="Treble" value=${mic.treble} min=${-10} max=${10} unit=" dB" onChange=${(v) => setMic({ treble: v, preset: '' })} />
          <div className="h">Equaliser</div>
          ${[60, 170, 310, 600, 1000, 3000, 6000, 12000].map((f, i) => html`<${Slider} key=${'eq' + i} label=${f >= 1000 ? (f / 1000) + ' kHz' : f + ' Hz'} value=${(mic.eq && mic.eq[i]) || 0} min=${-12} max=${12} unit=" dB" onChange=${(v) => { const e = (mic.eq || [0, 0, 0, 0, 0, 0, 0, 0]).slice(); e[i] = v; setMic({ eq: e, preset: '' }); }} />`)}
        </section>

        <section className=${'pane' + (tab === 'look' ? ' on' : '')}>
          <div className="h">Accent color</div>
          <div className="swatches">${ACCENTS.map((c) => html`<button key=${c} className=${st.accent === c ? 'on' : ''} style=${{ background: c }} aria-label=${'Accent ' + c} onClick=${() => set('accent', c)}></button>`)}</div>
          <${Switch} on=${st.glow} onClick=${() => set('glow', !st.glow)} label="Party glow" desc="Background lights follow your voice (mic on)" />
          <${Switch} on=${st.crop} onClick=${() => set('crop', !st.crop)} label="Clean crop" desc="Zooms in to hide YouTube's title bar (may cut lyrics at the edges)" />
          <${Switch} on=${st.focus} onClick=${() => set('focus', !st.focus)} label="Focus mode" desc="Big video, controls fade after 3 seconds" />
          <div className="h">Video look</div>
          <${Slider} label="Brightness" value=${st.bright} min=${60} max=${140} unit="%" onChange=${(v) => set('bright', v)} />
          <${Slider} label="Contrast" value=${st.contrast} min=${60} max=${140} unit="%" onChange=${(v) => set('contrast', v)} />
          <${Slider} label="Saturation" value=${st.sat} min=${0} max=${200} unit="%" onChange=${(v) => set('sat', v)} />
          <button className="btn2" onClick=${() => { set('bright', 100); set('contrast', 100); set('sat', 100); }}>Reset video look</button>
        </section>

        <section className=${'pane' + (tab === 'more' ? ' on' : '')}>
          <${Switch} on=${st.autoplay} onClick=${() => set('autoplay', !st.autoplay)} label="Autoplay next song" desc="Keep the party going" />
          <div className="h">Sleep timer</div>
          <div className="chips">${[0, 15, 30, 60].map((m) => pill(sleep === m, m ? m + ' min' : 'Off', () => setSleep(m)))}</div>
          <div className="h">Library</div>
          <div className="inl"><button className="btn2" onClick=${exportLib}>Export</button><label className="btn2" style=${{ display: 'grid', placeItems: 'center', cursor: 'pointer' }}>Import<input type="file" accept="application/json" style=${{ display: 'none' }} onChange=${(e) => { importLib(e.target.files[0]); e.target.value = ''; }} /></label></div>
          <div className="h">YouTube API key</div>
          <div className="note">Saved in this browser: ${apiKey.slice(0, 6)}...${apiKey.slice(-3)}</div>
          <div className="inl"><button className="btn2" onClick=${onResetKey}>Change key</button><button className="btn2 dng" onClick=${resetAll}>Erase my data</button></div>
          <div className="h">Shortcuts</div>
          <div className="note">${SHORTCUTS}</div>
          <div className="h">All 50 features</div>
          <ol className="feat">${FEATURES.map((f) => html`<li key=${f}>${f}</li>`)}</ol>
        </section>
      </aside>

      ${msg ? html`<div className="toast" role="status">${msg}</div>` : null}
      <div className="rotate">${I('rotate', 44)}<div>Rotate your phone to landscape</div><span>TuneX is made for landscape karaoke.</span></div>
    </div>`;
}

/* ---------- root ---------- */
function Root() {
  const [key, setKey] = useState(() => LS.get('tunex.apiKey', ''));
  const [go, setGo] = useState(false);
  if (!key) return html`<${Setup} onSave=${(k) => setKey(k)} />`;
  if (!go) return html`<${Start} onStart=${() => { enterFull(); setGo(true); }} />`;
  return html`<${App} apiKey=${key} onResetKey=${() => { LS.del('tunex.apiKey'); setKey(''); setGo(false); }} />`;
}
ReactDOM.createRoot(document.getElementById('root')).render(html`<${Root} />`);
})();
