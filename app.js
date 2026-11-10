'use strict';
/* GitarChord – auto scroll chord viewer (PWA) */

const $ = s => document.querySelector(s);
const KEY = 'gc_songs_v1';
const DEFAULTS = { speed: 5, transpose: 0, fs: 17 };

/* ---------------- storage ---------------- */
function loadSongs() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function saveSongs() {
  try { localStorage.setItem(KEY, JSON.stringify(songs)); } catch (e) { alert('Gagal simpan: ' + e.message); }
}
let songs = loadSongs();
if (!songs.length && !localStorage.getItem(KEY + '_seeded')) {
  songs.push({
    id: uid(), title: 'Contoh Lagu (demo)', artist: 'GitarChord', url: '', updated: Date.now(), ...DEFAULTS,
    body: `[Intro]
Am  F  C  G   x2

[Verse 1]
Am               F
Ini cuma contoh lirik untuk uji
C                G
auto scroll dan tukar key lagu
Am               F
Tekan butang main di bawah sana
C            G
skrin akan bergerak perlahan

[Chorus]
F        G         C      Am
Laju boleh tambah, laju boleh kurang
F        G           C
Tekan ♯ atau ♭ untuk transpose

[Outro]
Am  F  C  G  Am`
  });
  saveSongs();
  try { localStorage.setItem(KEY + '_seeded', '1'); } catch {}
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
const byId = id => songs.find(s => s.id === id);

/* ---------------- chord parsing / transpose ---------------- */
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const PREF  = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHORD_RE = /^\(?([A-G](?:#|b)?)((?:maj|min|dim|aug|sus|add|m|M|\+|-|°|ø|\d|#|b|\(|\))*)(?:\/([A-G](?:#|b)?))?\)?[.,]?$/;
const FILLER_RE = /^(\||\|\||-+|\/|%|\*|x\d+|\(x\d+\)|×\d+|\d+x|N\.?C\.?|\.+|:?\|:?)$/i;

function noteIndex(n) {
  let i = SHARP.indexOf(n); if (i < 0) i = FLAT.indexOf(n);
  return i;
}
function shiftNote(n, st) {
  const i = noteIndex(n); if (i < 0) return n;
  const j = ((i + st) % 12 + 12) % 12;
  if (n.length > 1) return (n[1] === 'b' ? FLAT : SHARP)[j];
  return PREF[j];
}
function transposeToken(tok, st) {
  if (!st) return tok;
  return tok.replace(/([A-G](?:#|b)?)/g, (m, n, off) => {
    // only replace root and bass note (positions after "(" or "/" or at start)
    const prev = tok[off - 1];
    return (off === 0 || prev === '(' || prev === '/') ? shiftNote(n, st) : m;
  });
}
function isChord(tok) { return CHORD_RE.test(tok); }

function classifyLine(line) {
  const t = line.trim();
  if (!t) return 'blank';
  if (/^\[[^\]]{1,40}\]$/.test(t)) return 'section';
  if (/^(intro|verse|chorus|reff?|bridge|outro|pre-?chorus|interlude|solo|coda|ending|korus|instrumental)(\s*\d+)?\s*:?$/i.test(t)) return 'section';
  if (/^[eBGDAEbgda]?\s*\|?[-\d|hpbrx\/\\~^().*sv=]{6,}\|?\s*$/.test(t) && /-{3,}/.test(t)) return 'tab';
  const toks = t.split(/\s+/);
  let chords = 0, other = 0;
  toks.forEach((tk, i) => {
    if (isChord(tk)) chords++;
    else if (FILLER_RE.test(tk) || (i === 0 && /:$/.test(tk))) {}
    else other++;
  });
  if (chords > 0 && other === 0) return 'chord';
  if (chords >= 2 && other <= 1 && chords >= toks.length * 0.6) return 'chord';
  return 'lyric';
}

/* Transpose a chord line while keeping alignment above lyrics */
function transposeLine(line, st) {
  if (!st) return line;
  const parts = line.split(/(\s+)/);
  let carry = 0, out = '';
  for (const p of parts) {
    if (!p) continue;
    if (/^\s+$/.test(p)) {
      let len = p.length - carry; carry = 0;
      if (len < 1) { carry = 1 - len; len = 1; }
      out += ' '.repeat(len);
    } else {
      const n = isChord(p) ? transposeToken(p, st) : p;
      const d = n.length - p.length;
      if (d > 0) carry += d;
      out += n + (d < 0 ? ' '.repeat(-d) : '');
    }
  }
  return out.replace(/\s+$/, '');
}

function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function normalizeBody(txt) {
  return txt.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/ /g, ' ')
    .replace(/\[\/?tab\]/g, '').replace(/^\s*\n/, '');
}

function renderSheet(body, st) {
  const lines = normalizeBody(body).split('\n');
  return lines.map(raw => {
    // inline [ch]X[/ch] tags inside lyric lines
    if (/\[ch\]/.test(raw)) {
      const plain = raw.replace(/\[\/?ch\]/g, '');
      if (classifyLine(plain) === 'chord') return `<div class="ln chord-ln">${esc(transposeLine(plain, st))}</div>`;
      return `<div class="ln">${esc(raw).replace(/\[ch\](.*?)\[\/ch\]/g, (m, c) => `<span class="ch">${esc(transposeToken(c, st))}</span>`)}</div>`;
    }
    const type = classifyLine(raw);
    switch (type) {
      case 'blank': return '<div class="ln"></div>';
      case 'section': return `<div class="ln sec">${esc(raw.trim())}</div>`;
      case 'chord': return `<div class="ln chord-ln">${esc(transposeLine(raw, st))}</div>`;
      case 'tab': return `<div class="ln tab">${esc(raw)}</div>`;
      default: return `<div class="ln">${esc(raw)}</div>`;
    }
  }).join('');
}

/* ---------------- routing ---------------- */
const views = { library: $('#view-library'), editor: $('#view-editor'), player: $('#view-player') };
function show(name) { Object.entries(views).forEach(([k, v]) => v.hidden = k !== name); }
function go(hash) { location.hash = hash; }

function route() {
  stopScroll();
  const [, view, id] = (location.hash || '#/').split('/');
  if (view === 'play' && byId(id)) openPlayer(byId(id));
  else if (view === 'edit' && byId(id)) openEditor(byId(id));
  else if (view === 'new') openEditor(null);
  else { show('library'); renderLibrary(); releaseWake(); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => {
  if (history.length > 1) history.back(); else go('#/');
}));

/* ---------------- library ---------------- */
function renderLibrary() {
  const q = $('#search').value.trim().toLowerCase();
  const list = songs.filter(s => !q || (s.title + ' ' + s.artist).toLowerCase().includes(q))
    .sort((a, b) => (b.updated || 0) - (a.updated || 0));
  $('#song-list').innerHTML = list.map(s => `
    <li data-id="${s.id}">
      <div><div class="t">${esc(s.title)}</div><div class="muted small">${esc(s.artist || '')}</div></div>
      <span class="badge">${s.transpose ? (s.transpose > 0 ? '+' : '') + s.transpose : ''}</span>
    </li>`).join('');
  $('#empty').hidden = songs.length > 0;
}
$('#search').addEventListener('input', renderLibrary);
$('#song-list').addEventListener('click', e => {
  const li = e.target.closest('li'); if (li) go('#/play/' + li.dataset.id);
});
$('#btn-add').addEventListener('click', () => go('#/new'));

$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'gitarchord-songs.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$('#file-import').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data)) throw new Error('Format tidak sah');
    let n = 0;
    data.forEach(s => {
      if (!s || !s.title || typeof s.body !== 'string') return;
      const ex = byId(s.id);
      if (ex) Object.assign(ex, s); else { songs.push({ ...DEFAULTS, ...s, id: s.id || uid() }); }
      n++;
    });
    saveSongs(); renderLibrary(); alert(n + ' lagu diimport.');
  } catch (err) { alert('Import gagal: ' + err.message); }
  e.target.value = '';
});

/* ---------------- editor ---------------- */
let editing = null;
function openEditor(song) {
  editing = song;
  show('editor');
  $('#editor-title').textContent = song ? 'Edit lagu' : 'Lagu baru';
  $('#f-title').value = song?.title || '';
  $('#f-artist').value = song?.artist || '';
  $('#f-url').value = song?.url || '';
  $('#f-body').value = song?.body || '';
  $('#btn-delete').hidden = !song;
  if (!song) $('#f-title').focus();
}
$('#f-url').addEventListener('change', () => {
  // auto-fill title/artist from an Ultimate Guitar URL, e.g. /tab/umbrella/ramalanku-benar-belaka-chords-1730682
  const m = $('#f-url').value.match(/ultimate-guitar\.com\/tab\/([^/]+)\/([^/?#]+)/);
  if (!m) return;
  const nice = s => s.replace(/-(chords|tabs?|ukulele|bass|official|power)(-\d+)?$/, '').replace(/-\d+$/, '')
    .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (!$('#f-title').value) $('#f-title').value = nice(m[2]);
  if (!$('#f-artist').value) $('#f-artist').value = nice(m[1]);
});
$('#btn-save').addEventListener('click', () => {
  const title = $('#f-title').value.trim();
  const body = $('#f-body').value;
  if (!title) { $('#f-title').focus(); return alert('Sila isi tajuk lagu.'); }
  if (!body.trim()) { $('#f-body').focus(); return alert('Sila tampal chord / lirik.'); }
  const data = { title, artist: $('#f-artist').value.trim(), url: $('#f-url').value.trim(), body, updated: Date.now() };
  let id;
  if (editing) { Object.assign(editing, data); id = editing.id; }
  else { id = uid(); songs.push({ id, ...DEFAULTS, ...data }); }
  saveSongs();
  location.replace('#/play/' + id);
});
$('#btn-delete').addEventListener('click', () => {
  if (!editing || !confirm(`Padam "${editing.title}"?`)) return;
  songs = songs.filter(s => s !== editing); saveSongs(); location.replace('#/');
});

/* ---------------- player ---------------- */
let current = null;
function openPlayer(song) {
  current = song;
  show('player');
  $('#p-title').textContent = song.title;
  $('#p-artist').textContent = song.artist || '';
  const src = $('#p-source');
  src.hidden = !song.url; if (song.url) src.href = song.url;
  updatePlayerUI(); renderCurrent();
  requestWake();
}
function renderCurrent() {
  document.documentElement.style.setProperty('--fs', current.fs + 'px');
  $('#sheet').innerHTML = renderSheet(current.body, current.transpose);
}
function updatePlayerUI() {
  $('#speed-val').textContent = current.speed;
  $('#tr-val').textContent = (current.transpose > 0 ? '+' : '') + current.transpose;
}
function persist() { saveSongs(); updatePlayerUI(); }

$('#btn-edit').addEventListener('click', () => go('#/edit/' + current.id));
$('#speed-up').addEventListener('click', () => setSpeed(current.speed + 1));
$('#speed-dn').addEventListener('click', () => setSpeed(current.speed - 1));
function setSpeed(v) { current.speed = Math.max(1, Math.min(30, v)); persist(); }
$('#tr-up').addEventListener('click', () => setTranspose(current.transpose + 1));
$('#tr-dn').addEventListener('click', () => setTranspose(current.transpose - 1));
function setTranspose(v) {
  if (v > 11) v -= 12; if (v < -11) v += 12;
  current.transpose = v; persist(); renderCurrent();
}
$('#fs-up').addEventListener('click', () => setFs(current.fs + 1));
$('#fs-dn').addEventListener('click', () => setFs(current.fs - 1));
function setFs(v) {
  const sc = document.scrollingElement, ratio = sc.scrollTop / Math.max(1, sc.scrollHeight);
  current.fs = Math.max(10, Math.min(40, v)); persist(); renderCurrent();
  sc.scrollTop = pos = ratio * sc.scrollHeight;
}
$('#btn-top').addEventListener('click', () => { pos = 0; window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('#btn-play').addEventListener('click', toggleScroll);
$('#sheet').addEventListener('click', e => {
  if (getSelection().toString()) return;
  toggleScroll();
});

/* ---------------- auto scroll engine ---------------- */
let playing = false, raf = 0, last = 0, pos = 0, countdownTimer = 0;
const pxPerSec = () => current.speed * 3 * (current.fs / 17);

function toggleScroll() { playing || countdownTimer ? stopScroll() : startScroll(); }

function startScroll() {
  if (!current) return;
  const sc = document.scrollingElement;
  $('#btn-play').classList.add('on'); $('#btn-play').textContent = '❚❚';
  pos = sc.scrollTop;
  if (pos < 20) {          // countdown from the top so you can get your hands on the guitar
    let n = 3; const cd = $('#countdown');
    cd.hidden = false; cd.textContent = n;
    countdownTimer = setInterval(() => {
      n--; if (n > 0) { cd.textContent = n; return; }
      clearInterval(countdownTimer); countdownTimer = 0; cd.hidden = true; begin();
    }, 1000);
  } else begin();
}
function begin() {
  playing = true; last = performance.now();
  $('.controls').classList.add('dim');
  raf = requestAnimationFrame(tick);
}
function tick(now) {
  if (!playing) return;
  const sc = document.scrollingElement;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  // follow manual scrolling made by the user while playing
  if (Math.abs(sc.scrollTop - pos) > 3) pos = sc.scrollTop;
  pos += pxPerSec() * dt;
  const max = sc.scrollHeight - innerHeight;
  // stop when the last line of content reaches the middle of the screen
  const end = Math.max(0, $('#sheet').offsetTop + $('#sheet').offsetHeight - innerHeight * 0.7 - innerHeight * 0.5);
  if (pos >= Math.min(max, end)) { sc.scrollTop = Math.min(max, end); stopScroll(); return; }
  sc.scrollTop = pos;
  raf = requestAnimationFrame(tick);
}
function stopScroll() {
  playing = false; cancelAnimationFrame(raf);
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = 0; $('#countdown').hidden = true; }
  $('#btn-play').classList.remove('on'); $('#btn-play').textContent = '▶';
  $('.controls').classList.remove('dim');
}
$('.controls').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('dim'); });

document.addEventListener('keydown', e => {
  if (views.player.hidden || e.target.matches('input, textarea')) return;
  const k = e.key;
  if (k === ' ' || k === 'Enter') { e.preventDefault(); toggleScroll(); }
  else if (k === 'ArrowUp' || k === '+' || k === '=') { e.preventDefault(); setSpeed(current.speed + 1); }
  else if (k === 'ArrowDown' || k === '-') { e.preventDefault(); setSpeed(current.speed - 1); }
  else if (k === 'ArrowRight') setTranspose(current.transpose + 1);
  else if (k === 'ArrowLeft') setTranspose(current.transpose - 1);
  else if (k === 'Home') { pos = 0; window.scrollTo(0, 0); }
  else if (k === 'Escape') { stopScroll(); }
});

/* ---------------- screen wake lock ---------------- */
let wake = null;
async function requestWake() {
  try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => wake = null); } } catch {}
}
function releaseWake() { try { wake && wake.release(); } catch {} wake = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !views.player.hidden) requestWake();
  else if (document.visibilityState === 'hidden') stopScroll();
});

/* ---------------- PWA install ---------------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#btn-install').hidden = false; });
$('#btn-install').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#btn-install').hidden = true;
});
window.addEventListener('appinstalled', () => $('#btn-install').hidden = true);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

route();
