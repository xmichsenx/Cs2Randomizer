import { STYLES, OUTLINE_MODES, encodeCrosshair, decodeCrosshair, crosshairToConVars } from './sharecode.js';
import { randomCrosshair } from './crosshair-random.js';
import { drawCrosshair } from './crosshair-render.js';
import { WEAPONS, CATEGORIES } from './loadout-data.js';
import { randomLoadout } from './loadout-random.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: settings just won't persist */
    }
  },
};

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(`${what} copied`);
}

function bindSeg(container, attr, onChange) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !container.contains(btn)) return;
    $$('button', container).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    onChange(btn.dataset[attr]);
  });
}

function setSeg(container, attr, value) {
  $$('button', container).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === value)));
}

/* ───────────────────────── Tabs ───────────────────────── */

let activeTab = 'crosshair';
function showTab(name) {
  activeTab = name;
  for (const t of ['crosshair', 'loadout']) {
    $(`#tab-${t}`).setAttribute('aria-selected', String(t === name));
    $(`#panel-${t}`).hidden = t !== name;
  }
  if (name === 'crosshair') layoutStage();
  if (name === 'loadout' && !currentLoadout) rollLoadout();
}
$('#tab-crosshair').addEventListener('click', () => showTab('crosshair'));
$('#tab-loadout').addEventListener('click', () => showTab('loadout'));

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SUMMARY'].includes(tag)) return;
  e.preventDefault();
  activeTab === 'crosshair' ? rollCrosshair() : rollLoadout();
});

/* ───────────────────────── Crosshair ───────────────────────── */

const LOCK_GROUPS = {
  style: ['style'],
  color: ['red', 'green', 'blue', 'alpha'],
  size: ['thickness', 'length', 'gap'],
  outline: ['outlineMode', 'outlineRed', 'outlineGreen', 'outlineBlue', 'outlineAlpha'],
  toggles: ['centerDotEnabled', 'tStyleEnabled', 'followRecoil'],
};

const xh = {
  current: null,
  mode: store.get('xh.mode', 'sane'),
  styles: new Set(store.get('xh.styles', STYLES.map((s) => s.id))),
  locks: new Set(),
  zoom: store.get('xh.zoom', 3),
  bg: store.get('xh.bg', 'dust'),
  history: store.get('xh.history', []),
};

const canvas = $('#xh-canvas');
const stage = $('#stage');

// Style chips
$('#xh-styles').innerHTML = STYLES.map(
  (s) => `<label class="chip"><input type="checkbox" value="${s.id}" ${xh.styles.has(s.id) ? 'checked' : ''}><span>${s.name}</span></label>`,
).join('');
$('#xh-styles').addEventListener('change', (e) => {
  const id = Number(e.target.value);
  if (e.target.checked) xh.styles.add(id);
  else if (xh.styles.size > 1) xh.styles.delete(id);
  else {
    e.target.checked = true;
    toast('Keep at least one style');
  }
  store.set('xh.styles', [...xh.styles]);
});

$('#xh-locks').addEventListener('change', (e) => {
  e.target.checked ? xh.locks.add(e.target.value) : xh.locks.delete(e.target.value);
});

setSeg($('#xh-mode'), 'mode', xh.mode);
bindSeg($('#xh-mode'), 'mode', (m) => {
  xh.mode = m;
  store.set('xh.mode', m);
});

$('#zoom').value = String(xh.zoom);
$('#zoom').addEventListener('change', (e) => {
  xh.zoom = Number(e.target.value);
  store.set('xh.zoom', xh.zoom);
  layoutStage();
});

stage.dataset.bg = xh.bg;
setSeg($('#bg-picker'), 'bg', xh.bg);
bindSeg($('#bg-picker'), 'bg', (bg) => {
  xh.bg = bg;
  stage.dataset.bg = bg;
  store.set('xh.bg', bg);
});

const heightSelect = $('#xh-height');
heightSelect.value = String(store.get('xh.height', 1080));
heightSelect.addEventListener('change', () => {
  store.set('xh.height', Number(heightSelect.value));
  if (xh.current) setCrosshair({ ...xh.current, screenHeight: Number(heightSelect.value) }, { addToHistory: false });
});

// Size the canvas so one crosshair pixel maps to exactly `zoom` device pixels.
function layoutStage() {
  const rect = stage.getBoundingClientRect();
  if (!rect.width) return;
  const dpr = window.devicePixelRatio || 1;
  const cssSize = Math.min(rect.width, rect.height);
  let n = Math.floor((cssSize * dpr) / xh.zoom);
  if (n % 2 === 0) n -= 1;
  canvas.width = canvas.height = n;
  canvas.style.width = canvas.style.height = `${(n * xh.zoom) / dpr}px`;
  if (xh.current) drawCrosshair(canvas, xh.current);
  updateStageHint();
}
new ResizeObserver(layoutStage).observe(stage);
matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', layoutStage);

function updateStageHint() {
  if (!xh.current) return;
  const style = STYLES[xh.current.style];
  const approx = ['circle', 'square', 'quad'].includes(style.shape)
    ? ` The ${style.name} shape is an approximation of the in-game look; the share code itself is exact.`
    : '';
  $('#stage-hint').textContent =
    `${xh.zoom === 1 ? 'True size' : `${xh.zoom}× zoom`} at ${xh.current.screenHeight}p, crosshair at rest. ` +
    `CS2 rescales the pixel sizes to your resolution.${approx}`;
}

const pct = (v) => `${Math.round(v * 100)}%`;
const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
const yesNo = (v) => (v ? 'On' : 'Off');

function renderParams(c) {
  const style = STYLES[c.style];
  const rows = [
    ['Style', `${style.name} (${c.style})`],
    ['Color', `<span class="swatch" style="background:${rgba(c.red, c.green, c.blue, c.alpha)}"></span>${c.red}, ${c.green}, ${c.blue} · α ${c.alpha}`],
    ['Thickness', `${c.thickness} px`],
    ['Length', `${c.length} px`],
    ['Gap', `${c.gap} px`],
    ['Outline', c.outlineMode
      ? `<span class="swatch" style="background:${rgba(c.outlineRed, c.outlineGreen, c.outlineBlue, c.outlineAlpha)}"></span>${OUTLINE_MODES[c.outlineMode]} · ${c.outlineRed}, ${c.outlineGreen}, ${c.outlineBlue} · α ${c.outlineAlpha}`
      : 'None'],
    ['Center dot', yesNo(c.centerDotEnabled)],
    ['T style', yesNo(c.tStyleEnabled)],
    ['Follow recoil', yesNo(c.followRecoil)],
    ['Dynamic spread limit', c.dynamicSpreadLimit],
    ['Split distance', `${c.splitDistance} px`],
    ['Inner / outer split alpha', `${pct(c.innerSplitAlpha)} / ${pct(c.outerSplitAlpha)}`],
    ['Split size ratio', c.splitSizeRatio.toFixed(2)],
    ['Scope dot scale', `${c.scopeDotScale.toFixed(2)}×${c.scopeDotUseCrosshairColor ? ' · crosshair color' : ''}`],
    ['Screen height', `${c.screenHeight}p`],
  ];
  $('#xh-params').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function renderHistory() {
  const el = $('#xh-history');
  if (!xh.history.length) {
    el.innerHTML = '<p class="history-empty">Your rolled crosshairs will show up here.</p>';
    return;
  }
  el.innerHTML = '';
  const currentCode = xh.current && encodeCrosshair(xh.current);
  for (const code of xh.history) {
    let c;
    try {
      c = decodeCrosshair(code);
    } catch {
      continue;
    }
    const btn = document.createElement('button');
    btn.title = code;
    btn.setAttribute('aria-label', `Restore crosshair ${code}`);
    if (code === currentCode) btn.classList.add('current');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 41;
    drawCrosshair(cv, c);
    btn.append(cv);
    btn.addEventListener('click', () => setCrosshair(c, { addToHistory: false }));
    el.append(btn);
  }
}

function setCrosshair(c, { addToHistory = true } = {}) {
  xh.current = c;
  if (![...heightSelect.options].some((o) => Number(o.value) === c.screenHeight)) {
    heightSelect.add(new Option(`${c.screenHeight}p`, String(c.screenHeight)));
  }
  heightSelect.value = String(c.screenHeight);
  const code = encodeCrosshair(c);
  $('#xh-code').textContent = code;
  $('#xh-cvars').textContent = crosshairToConVars(c);
  drawCrosshair(canvas, c);
  renderParams(c);
  updateStageHint();
  history.replaceState(null, '', `#${code}`);
  if (addToHistory) {
    xh.history = [code, ...xh.history.filter((h) => h !== code)].slice(0, 24);
    store.set('xh.history', xh.history);
  }
  renderHistory();
}

function rollCrosshair() {
  const next = randomCrosshair({
    mode: xh.mode,
    styles: [...xh.styles],
    screenHeight: Number(heightSelect.value),
  });
  if (xh.current) {
    for (const group of xh.locks) for (const key of LOCK_GROUPS[group]) next[key] = xh.current[key];
  }
  setCrosshair(next);
}

$('#xh-roll').addEventListener('click', rollCrosshair);
$('#xh-copy').addEventListener('click', () => copy($('#xh-code').textContent, 'Share code'));
$('#xh-copy-cvars').addEventListener('click', () => copy($('#xh-cvars').textContent, 'Console commands'));
$('#xh-clear-history').addEventListener('click', () => {
  xh.history = [];
  store.set('xh.history', []);
  renderHistory();
});

$('#xh-import').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('#xh-import-error');
  try {
    const c = decodeCrosshair($('#xh-import-input').value);
    err.textContent = '';
    setCrosshair(c);
    toast('Crosshair loaded');
  } catch (ex) {
    err.textContent = ex.message;
  }
});

/* ───────────────────────── Loadout ───────────────────────── */

const lo = {
  side: store.get('lo.side', 'random'),
  disabled: new Set(store.get('lo.disabled', [])),
  categories: new Set(store.get('lo.categories', ['smg', 'heavy', 'rifle', 'sniper'])),
  parts: new Set(store.get('lo.parts', ['primary', 'pistol', 'armor', 'grenades', 'equipment'])),
};
let currentLoadout = null;

setSeg($('#lo-side'), 'side', lo.side);
bindSeg($('#lo-side'), 'side', (s) => {
  lo.side = s;
  store.set('lo.side', s);
});

$('#lo-cats').innerHTML = Object.entries(CATEGORIES)
  .filter(([id]) => id !== 'pistol')
  .map(([id, name]) => `<label class="chip"><input type="checkbox" value="${id}" ${lo.categories.has(id) ? 'checked' : ''}><span>${name}</span></label>`)
  .join('');
$('#lo-cats').addEventListener('change', (e) => {
  e.target.checked ? lo.categories.add(e.target.value) : lo.categories.delete(e.target.value);
  store.set('lo.categories', [...lo.categories]);
});

$$('#lo-parts input').forEach((i) => (i.checked = lo.parts.has(i.value)));
$('#lo-parts').addEventListener('change', (e) => {
  e.target.checked ? lo.parts.add(e.target.value) : lo.parts.delete(e.target.value);
  store.set('lo.parts', [...lo.parts]);
});

const budgetSelect = $('#lo-budget');
const budgetCustom = $('#lo-budget-custom');
budgetSelect.value = store.get('lo.budget', 'Infinity');
budgetCustom.value = store.get('lo.budgetCustom', 4000);
budgetCustom.hidden = budgetSelect.value !== 'custom';
budgetSelect.addEventListener('change', () => {
  budgetCustom.hidden = budgetSelect.value !== 'custom';
  store.set('lo.budget', budgetSelect.value);
});
budgetCustom.addEventListener('change', () => store.set('lo.budgetCustom', Number(budgetCustom.value)));

function currentBudget() {
  if (budgetSelect.value === 'custom') return Math.max(0, Number(budgetCustom.value) || 0);
  return Number(budgetSelect.value);
}

const money = (n) => `$${n.toLocaleString('en-US')}`;
const sideName = { T: 'Terrorist', CT: 'Counter-Terrorist' };
const NADE_COLORS = {
  flashbang: '#f4f4f4',
  hegrenade: '#e05a4f',
  smokegrenade: '#9aa3ad',
  decoy: '#9c9a5a',
  molotov: '#ff8c2a',
  incgrenade: '#ff8c2a',
};

function slot(label, name, meta, { wide = false, none = false, delay = 0 } = {}) {
  return `<div class="slot${wide ? ' wide' : ''}" style="animation-delay:${delay}ms">
    <span class="slot-label">${label}</span>
    <span class="slot-name${none ? ' none' : ''}">${name}</span>
    ${meta ? `<span class="slot-meta">${meta}</span>` : ''}
  </div>`;
}

function renderLoadout(r, budget) {
  const parts = lo.parts;
  const cat = (w) => CATEGORIES[w.category];
  const html = [];
  html.push(`<div class="lo-head">
    <span class="side-badge ${r.side}">${sideName[r.side]}</span>
    <span class="total">${money(r.total)}<small>${Number.isFinite(budget) ? `of ${money(budget)}` : 'total cost'}</small></span>
  </div>`);
  html.push('<div class="slots">');
  let d = 0;
  if (parts.has('primary')) {
    html.push(
      r.primary
        ? slot('Primary', r.primary.name, `${cat(r.primary)} · <span class="price">${money(r.primary.price)}</span>`, { wide: true, delay: d })
        : slot('Primary', 'None', lo.categories.size ? 'Nothing affordable in the pool' : 'No category selected', { wide: true, none: true, delay: d }),
    );
    d += 70;
  }
  html.push(
    slot(
      'Pistol',
      r.pistol.name,
      r.pistolIsFree ? '<span class="price free">Default · free</span>' : `<span class="price">${money(r.pistol.price)}</span>`,
      { delay: d },
    ),
  );
  d += 70;
  if (parts.has('armor')) {
    html.push(
      slot('Armor', r.armor.name, r.armor.price ? `<span class="price">${money(r.armor.price)}</span>` : '', {
        none: !r.armor.price,
        delay: d,
      }),
    );
    d += 70;
  }
  if (parts.has('grenades')) {
    const nades = r.grenades.length
      ? `<div class="nades">${r.grenades
          .map((g) => `<span class="nade"><i style="background:${NADE_COLORS[g.id]}"></i>${g.name} <span class="price">${money(g.price)}</span></span>`)
          .join('')}</div>`
      : '';
    html.push(`<div class="slot wide" style="animation-delay:${d}ms">
      <span class="slot-label">Grenades · ${r.grenades.length}/4</span>
      ${nades || '<span class="slot-name none">No grenades</span>'}
    </div>`);
    d += 70;
  }
  if (parts.has('equipment')) {
    html.push(
      r.equipment.length
        ? slot('Equipment', r.equipment.map((e) => e.name).join(' + '), r.equipment.map((e) => `<span class="price">${money(e.price)}</span>`).join(' + '), { wide: true, delay: d })
        : slot('Equipment', 'Nothing extra', '', { wide: true, none: true, delay: d }),
    );
  }
  html.push('</div>');
  $('#lo-result').innerHTML = html.join('');
}

function rollLoadout() {
  const side = lo.side === 'random' ? (Math.random() < 0.5 ? 'T' : 'CT') : lo.side;
  const budget = currentBudget();
  currentLoadout = randomLoadout({
    side,
    budget,
    disabled: lo.disabled,
    categories: lo.categories,
    primary: lo.parts.has('primary'),
    pistol: lo.parts.has('pistol'),
    armor: lo.parts.has('armor'),
    grenades: lo.parts.has('grenades'),
    equipment: lo.parts.has('equipment'),
  });
  renderLoadout(currentLoadout, budget);
}
$('#lo-roll').addEventListener('click', rollLoadout);

function renderPool() {
  const groups = Object.entries(CATEGORIES).map(([id, name]) => {
    const items = WEAPONS.filter((w) => w.category === id)
      .map(
        (w) => `<button class="pool-item" data-id="${w.id}" aria-pressed="${!lo.disabled.has(w.id)}">
          ${w.name}<span class="s ${w.side}">${w.side === 'both' ? 'T/CT' : w.side}</span><span class="p">${money(w.price)}</span>
        </button>`,
      )
      .join('');
    return `<div class="pool-group"><h3>${name}</h3><div class="pool-items">${items}</div></div>`;
  });
  $('#lo-pool').innerHTML = groups.join('');
  $('#lo-pool-count').textContent = `${WEAPONS.length - lo.disabled.size} of ${WEAPONS.length} weapons enabled`;
}
$('#lo-pool').addEventListener('click', (e) => {
  const btn = e.target.closest('.pool-item');
  if (!btn) return;
  const id = btn.dataset.id;
  lo.disabled.has(id) ? lo.disabled.delete(id) : lo.disabled.add(id);
  store.set('lo.disabled', [...lo.disabled]);
  renderPool();
});

/* ───────────────────────── Boot ───────────────────────── */

renderPool();
renderHistory();
const fromHash = decodeURIComponent(location.hash.slice(1));
let booted = false;
if (fromHash) {
  try {
    const c = decodeCrosshair(fromHash);
    heightSelect.value = String(c.screenHeight);
    setCrosshair(c);
    booted = true;
  } catch {
    /* ignore a malformed hash */
  }
}
if (!booted) rollCrosshair();
layoutStage();
