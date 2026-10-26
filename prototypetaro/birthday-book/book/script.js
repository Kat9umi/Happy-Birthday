/* Everything below just reads the text from messages.js.
   You normally do not need to edit this file. */

const $ = id => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SINGLE_MQ = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
const single = () => SINGLE_MQ.matches;               // phone held upright = one page at a time
const root = document.documentElement;
const FLIP_MS = SITE.pageTurnSpeed || 1600;
const EASE = 'cubic-bezier(.45,.05,.2,1)';
root.style.setProperty('--flip', FLIP_MS + 'ms');

/* ---------- Cover metal ---------- */
const METALS = {
  silver: { img: 'assets/engrave-silver.png', line: '#BDBED3' },
  gold:   { img: 'assets/engrave-gold.png',   line: '#E0BE6A' }
};
const metal = METALS[SITE.coverMetal] || METALS.silver;
root.style.setProperty('--metal', metal.line);

/* ---------- Roman numerals (for the page counter) ---------- */
function roman(n) {
  const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

/* ---------- Fill in the static text ---------- */
document.title = SITE.title;
$('heading').textContent = SITE.title;
$('coverHint').textContent = SITE.coverHint || '';
$('tx-title').textContent = SITE.transmission.windowTitle;

/* ---------- Typewriter ----------
   Every letter is placed first (invisible) so the layout never jumps,
   then the letters appear one by one. */
function prepare(el, text) {
  el.textContent = '';
  const chars = [];
  text.split('\n').forEach((line, li) => {
    if (li) el.appendChild(document.createElement('br'));
    const words = line.split(' ');
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'w';
      for (const ch of word) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch;
        w.appendChild(s);
        chars.push(s);
      }
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });
  return chars;
}

class Typewriter {
  constructor() { this.timer = null; this.items = []; this.resolve = null; }
  stop() { clearTimeout(this.timer); this.timer = null; }
  finish() {
    this.stop();
    this.items.forEach(it => it.chars.forEach(c => { c.classList.add('on'); c.classList.remove('cur'); }));
    if (this.resolve) { this.resolve(); this.resolve = null; }
  }
  /* items: [{ el, text, instant }]   opts: { speed, onChar, instant } */
  start(items, opts = {}) {
    this.stop();
    this.items = items.map(it => ({ chars: prepare(it.el, it.text), instant: !!it.instant }));
    return new Promise(resolve => {
      this.resolve = resolve;
      if (opts.instant || reduceMotion) { this.finish(); return; }
      this.items.forEach(it => { if (it.instant) it.chars.forEach(c => c.classList.add('on')); });
      let i = 0, j = 0, prev = null;
      const step = () => {
        while (i < this.items.length && (this.items[i].instant || j >= this.items[i].chars.length)) { i++; j = 0; }
        if (i >= this.items.length) { if (prev) prev.classList.remove('cur'); this.finish(); return; }
        const c = this.items[i].chars[j++];
        if (prev) prev.classList.remove('cur');
        c.classList.add('on', 'cur');
        prev = c;
        if (opts.onChar) opts.onChar();
        const t = c.textContent;
        let wait = opts.speed;
        if (',;:'.includes(t)) wait *= 4;
        if ('.!?'.includes(t)) wait *= 8;
        if (j >= this.items[i].chars.length) wait += 500;   // pause between lines
        this.timer = setTimeout(step, wait);
      };
      step();
    });
  }
}

/* ---------- Stickers ---------- */
function rng(seed) {                         // small seeded random generator
  let a = (seed || 1) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Spots near the page edges, as [x%, y%] of the page
const ZONES = [[17, 12], [84, 11], [16, 87], [85, 86], [87, 50], [14, 48], [50, 7]];

function planStickers(pageList) {
  const plan = pageList.map(p => (p.stickers || []).map(s => ({ ...s })));   // hand-placed ones
  const cfg = SITE.stickers;
  if (!cfg || !cfg.files || !cfg.files.length) return plan;
  const rand = rng(cfg.seed);
  const max = cfg.maxPerPage || 2;
  const pool = [];
  for (let c = 0; c < (cfg.copies || 1); c++) pool.push(...cfg.files);
  for (let i = pool.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const used = pageList.map(() => []);
  for (const src of pool) {
    const open = used.map((u, i) => i).filter(i => used[i].length < max);
    if (!open.length) break;
    const fewest = Math.min(...open.map(i => used[i].length));          // spread them out
    const choices = open.filter(i => used[i].length === fewest);
    const pg = choices[(rand() * choices.length) | 0];
    const free = ZONES.map((z, k) => k).filter(k => !used[pg].includes(k));
    const k = free[(rand() * free.length) | 0];
    used[pg].push(k);
    let x = ZONES[k][0] + (rand() - .5) * 6;
    if (pg % 2 === 0) x = 100 - x;                    // left-hand pages: keep stickers away from the spine
    plan[pg].push({ src, x, y: ZONES[k][1] + (rand() - .5) * 6,
                    size: cfg.size || 19, rotate: (rand() - .5) * 36 });
  }
  return plan;
}

/* ---------- Build the book ----------
   The book is a row of "leaves" (sheets). Each leaf has a front (right-hand page)
   and a back (left-hand page). Leaf 0 is the cover: front = the engraved cover,
   back = inside of the cover with the first page. */
const book = $('book');
const P = SITE.pages;
const maxF = Math.ceil(P.length / 2);                      // how many leaves can be turned
const J = (2 * maxF - 1 < P.length) ? maxF : maxF - 1;      // index of the last leaf
const stickerPlan = planStickers(P);
const nodes = [];                                           // per page: { txt, layer }

function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

function makePaper(idx, side) {
  const paper = el('div', 'paper ' + side);
  const p = P[idx];
  if (!p) return paper;                                     // blank page

  const inner = el('div', 'page-inner');
  const h = el('h2'); h.textContent = p.title; inner.appendChild(h);
  inner.appendChild(el('hr', 'rule'));
  if (p.image) {
    const img = el('img', 'photo');
    img.src = p.image; img.alt = p.title;
    inner.appendChild(img);
  }
  const txt = el('p', 'text');
  txt.dataset.full = p.text;
  inner.appendChild(txt);
  if (idx === P.length - 1 && SITE.transmission) {
    const b = el('button', 'go'); b.id = 'secret';
    b.textContent = SITE.transmission.buttonText;
    inner.appendChild(b);
  }
  const folio = el('div', 'folio'); folio.textContent = roman(idx + 1);
  paper.append(inner, folio);

  let layer = null;
  if (stickerPlan[idx].length) {
    layer = el('div', 'stickers' + (!SITE.stickers || SITE.stickers.outline !== false ? ' outline' : ''));
    stickerPlan[idx].forEach(st => {
      const im = el('img', 'sticker'); im.src = st.src; im.alt = '';
      im.style.left = st.x + '%'; im.style.top = st.y + '%';
      im.style.width = (st.size || 19) + 'cqw';
      im.style.setProperty('--rot', (st.rotate || 0) + 'deg');
      im.onerror = () => im.remove();                       // missing file: just skip it
      layer.appendChild(im);
    });
    paper.appendChild(layer);
  }
  nodes[idx] = { txt, layer };
  return paper;
}

const leaves = [];
let cover = null;
for (let j = 0; j <= J; j++) {
  const leaf = el('div', 'leaf');
  const front = el('div', 'face front');
  const back = el('div', 'face back');
  if (j === 0) {
    front.classList.add('cover');
    front.id = 'cover';
    front.setAttribute('role', 'button');
    front.tabIndex = 0;
    front.setAttribute('aria-label', SITE.coverAlt || 'Open the book');
    const frame = el('div', 'cover-frame');
    const art = el('img', 'cover-art');
    art.src = SITE.coverEngraving || metal.img; art.alt = '';
    art.onerror = () => art.remove();
    frame.appendChild(art);
    front.appendChild(frame);
    back.classList.add('board-in');
    cover = front;
  } else {
    front.appendChild(makePaper(2 * j - 1, 'right'));
  }
  back.appendChild(makePaper(2 * j, 'left'));
  leaf.append(front, back);
  book.appendChild(leaf);
  leaves.push(leaf);
}

/* ---------- Page turning ----------
   Every leaf rests at one of two angles (0 = on the right, -180 = on the left).
   A tiny depth offset keeps the stack in the right order. While turning, the
   page lifts, bends slightly and sweeps across in one smooth eased motion. */
function leafTF(j, flipped, rot, skew, lift) {
  const z = (flipped ? (j + 1) : (J + 1 - j)) * 0.5 + (lift || 0);
  const r = rot == null ? (flipped ? -180 : 0) : rot;
  return 'translateZ(' + z + 'px) rotateY(' + r + 'deg) skewY(' + (skew || 0) + 'deg)';
}
function moveLeaf(j, forward, instant, delay) {
  const leaf = leaves[j];
  const to = leafTF(j, forward);
  leaf.style.transform = to;
  if (instant || reduceMotion || !leaf.animate) return;
  const from = leafTF(j, !forward);
  const mid = leafTF(j, forward, -90, forward ? -2.4 : 2.4, 16);
  leaf.classList.add('turning');
  const a = leaf.animate(
    [{ transform: from }, { transform: mid, offset: .5 }, { transform: to }],
    { duration: FLIP_MS, delay: delay || 0, easing: EASE, fill: 'backwards' });
  a.onfinish = a.oncancel = () => leaf.classList.remove('turning');
}

/* ---------- Where we are ----------
   steps: the list of views, in order.
   Wide screens: closed, then one step per two-page spread.
   Phone held upright: closed, then one step per single page. */
const controls = $('controls'), prevBtn = $('prev'), nextBtn = $('next'), counter = $('counter');
const pageTyper = new Typewriter();
const seen = new Set();
let steps = [], idx = 0, f = 0, side = 'R';
let everOpened = false, confettiDone = false, lockUntil = 0, queuedDir = 0, typeTimer = null;

function buildSteps() {
  steps = [{ f: 0, side: 'R' }];
  for (let k = 1; k <= maxF; k++) {
    if (single()) {
      steps.push({ f: k, side: 'L' });
      if (2 * k - 1 < P.length) steps.push({ f: k, side: 'R' });
    } else {
      steps.push({ f: k, side: 'R' });
    }
  }
}

function visiblePages() {
  if (f === 0) return [];
  const left = 2 * f - 2, right = 2 * f - 1;
  const list = single() ? [side === 'L' ? left : right] : [left, right];
  return list.filter(i => i < P.length);
}

function setPos() {
  const pos = f === 0 ? 'pos-closed' : single() ? (side === 'L' ? 'pos-left' : 'pos-right') : 'pos-center';
  book.className = 'book ' + pos + (f > 0 ? ' open' : '');
}

function updateUI() {
  prevBtn.disabled = idx === 0;
  nextBtn.disabled = idx === steps.length - 1;
  counter.textContent = idx === 0 ? '' : roman(idx) + ' / ' + roman(steps.length - 1);
  document.body.classList.toggle('opened', everOpened);
  if (everOpened) controls.classList.add('show');
}

function go(n, instant) {
  n = Math.max(0, Math.min(steps.length - 1, n));
  if (n === idx && !instant) return;
  pageTyper.finish();
  clearTimeout(typeTimer);

  const t = steps[n];
  const dF = t.f - f;
  const prevF = f;
  idx = n; f = t.f; side = t.side;

  if (f > 0 && !everOpened) {                       // first time the book opens
    everOpened = true;
    if (SITE.music && music.paused) startMusic();
  }

  if (dF !== 0) {
    const dir = Math.sign(dF), count = Math.abs(dF);
    for (let k = 0; k < count; k++) {
      const j = dir > 0 ? prevF + k : prevF - 1 - k;
      moveLeaf(j, dir > 0, instant || count > 1, k * 140);
    }
  }
  setPos();
  updateUI();
  if (!instant && dF !== 0) {
    lockUntil = performance.now() + FLIP_MS;
    setTimeout(() => { const d = queuedDir; queuedDir = 0; if (d) step(d); }, FLIP_MS + 30);
  }

  const list = visiblePages();
  const wait = instant ? 0 : (dF !== 0 ? FLIP_MS * 0.72 : FLIP_MS * 0.45);
  const run = () => {
    const items = [];
    list.forEach(i => {
      const nd = nodes[i]; if (!nd) return;
      if (nd.layer) nd.layer.classList.add('in');            // stickers pop onto the page and stay
      items.push({ el: nd.txt, text: nd.txt.dataset.full, instant: seen.has(i) });
      seen.add(i);
    });
    pageTyper.start(items, { speed: SITE.typingSpeed });
  };
  if (reduceMotion || instant) run(); else typeTimer = setTimeout(run, wait);

  if (SITE.finaleConfetti && !confettiDone && list.includes(P.length - 1)) {
    confettiDone = true;
    setTimeout(() => burst(150), instant ? 0 : wait);
  }
}

function step(dir) {                                  // one step forward (+1) or back (-1)
  if (performance.now() < lockUntil) { queuedDir = dir; return; }   // wait for the page to land
  go(idx + dir);
}

/* start: everything at rest, closed */
buildSteps();
leaves.forEach((_, j) => { leaves[j].style.transform = leafTF(j, false); });
setPos();
updateUI();

cover.addEventListener('click', () => { if (f === 0) step(1); });
cover.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && f === 0) { e.preventDefault(); step(1); } });
prevBtn.addEventListener('click', () => step(-1));
nextBtn.addEventListener('click', () => step(1));
book.addEventListener('click', e => { if (e.target.closest('button') || e.target.closest('#cover')) return; pageTyper.finish(); }); // click page = skip typing

document.addEventListener('keydown', e => {
  if (!$('overlay').hidden) { if (e.key === 'Escape') closeTx(); return; }
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});
let touchX = null;                                    // swipe to turn
document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  if (touchX === null || !$('overlay').hidden) return;
  const dx = e.changedTouches[0].clientX - touchX; touchX = null;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
}, { passive: true });

SINGLE_MQ.addEventListener('change', () => {         // phone turned sideways, window resized...
  const keep = f;
  buildSteps();
  idx = Math.max(0, steps.findIndex(s => s.f === keep && s.side === 'R'));
  f = -1;                                             // force a clean redraw
  const t = steps[idx];
  leaves.forEach((_, j) => { leaves[j].style.transform = leafTF(j, j < t.f); });
  f = t.f; side = t.side;
  setPos(); updateUI();
  pageTyper.finish();
  visiblePages().forEach(i => { const nd = nodes[i]; if (nd) { if (nd.layer) nd.layer.classList.add('in'); nd.txt.textContent = nd.txt.dataset.full; seen.add(i); } });
});

/* ---------- Music + soft typing sound ---------- */
const music = $('music'), soundBtn = $('sound');
let audioCtx = null;
if (SITE.music) music.src = SITE.music; else soundBtn.hidden = true;

function setSoundUI(on) {
  soundBtn.textContent = on ? '♪ Sound off' : '♪ Sound on';
  soundBtn.setAttribute('aria-pressed', String(on));
}
function startMusic() {
  music.play().then(() => setSoundUI(true)).catch(() => setSoundUI(false));
}
soundBtn.addEventListener('click', () => {
  if (music.paused) startMusic(); else { music.pause(); setSoundUI(false); }
});
function tick() {                         // tiny keyboard-like click while the transmission types
  if (music.paused) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = 900 + Math.random() * 500;
    g.gain.setValueAtTime(0.012, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.035);
  } catch (e) {}
}

/* ---------- Transmission window ---------- */
const overlay = $('overlay'), txBody = $('txBody');
const txTyper = new Typewriter();
let lastFocus = null;

function openTx() {
  lastFocus = document.activeElement;
  txBody.innerHTML = '';
  const items = SITE.transmission.lines.map(line => {
    const p = document.createElement('p');
    txBody.appendChild(p);
    return { el: p, text: line };
  });
  overlay.hidden = false;
  overlay.classList.remove('show'); void overlay.offsetWidth; overlay.classList.add('show');
  $('txClose').focus();
  setTimeout(() => txTyper.start(items, { speed: SITE.transmissionSpeed || SITE.typingSpeed, onChar: tick }), reduceMotion ? 0 : 450);
}
function closeTx() {
  txTyper.stop();
  overlay.hidden = true;
  if (lastFocus) lastFocus.focus();
}
document.addEventListener('click', e => { if (e.target.id === 'secret') openTx(); });
$('txClose').addEventListener('click', closeTx);
overlay.addEventListener('click', e => { if (e.target === overlay) closeTx(); });
$('txBody').addEventListener('click', () => txTyper.finish());

/* ---------- Confetti (only the small finale burst) ---------- */
const cc = $('confetti'), cx = cc.getContext('2d');
let bits = [], raf = null;
function sizeCanvases() {
  const r = window.devicePixelRatio || 1;
  for (const c of [cc, $('stars')]) { c.width = innerWidth * r; c.height = innerHeight * r; }
  cx.setTransform(r, 0, 0, r, 0, 0);
  drawStars(true);
}
function burst(n) {
  if (reduceMotion) return;
  const colors = SITE.confettiColors || ['#CAF6FE', '#91C1E7', '#BDBED3', '#F5EFF0', '#D3B8C1', '#8F778F'];
  const bx = innerWidth / 2, by = innerHeight * 0.55;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 11;
    bits.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4,
      c: colors[(Math.random() * colors.length) | 0], life: 0 });
  }
  if (!raf) raf = requestAnimationFrame(drawConfetti);
}
function drawConfetti() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  bits = bits.filter(b => b.y < innerHeight + 20 && b.life < 260);
  for (const b of bits) {
    b.vx *= .985; b.vy += .22; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life++;
    cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r);
    cx.globalAlpha = Math.max(0, 1 - b.life / 260);
    cx.fillStyle = b.c; cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); cx.restore();
  }
  raf = bits.length ? requestAnimationFrame(drawConfetti) : null;
}

/* ---------- Twinkling stars ---------- */
const sc = $('stars'), sx = sc.getContext('2d');
const starRGB = getComputedStyle(root).getPropertyValue('--star-rgb').trim() || '202,246,254';
let stars = [];
function drawStars(staticOnly) {
  const r = window.devicePixelRatio || 1;
  sx.setTransform(r, 0, 0, r, 0, 0);
  sx.clearRect(0, 0, innerWidth, innerHeight);
  const t = performance.now() / 1000;
  for (const s of stars) {
    const a = reduceMotion || staticOnly ? s.a : s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
    sx.fillStyle = 'rgba(' + starRGB + ',' + a.toFixed(3) + ')';
    sx.beginPath(); sx.arc(s.x * innerWidth, s.y * innerHeight, s.r, 0, 7); sx.fill();
  }
}
function loopStars() { drawStars(false); requestAnimationFrame(loopStars); }
for (let i = 0; i < 110; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + .3,
  a: Math.random() * .7 + .2, sp: Math.random() * 1.6 + .4, ph: Math.random() * 6.28 });
addEventListener('resize', sizeCanvases);
sizeCanvases();
if (!reduceMotion) loopStars();
