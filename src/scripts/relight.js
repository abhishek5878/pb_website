/*
 * The relight engine. motion.md §B1, critique-1 "the one move".
 *
 * The page ships already lit: <html data-light="…"> is the rest light (Base.astro,
 * `light` prop, default lalaland). Pointing at a work (hover / focus / tap) sets a
 * different data-light, which swaps four tokens; leaving returns to the rest light,
 * never to darkness. The glow crossfades between two fixed layers so the viewport
 * never repaints a gradient per frame. The lamp at rest sits where the stylesheet
 * puts it (--gx/--gy); a relight lights from the item you touched.
 *
 * Intent: 120ms in (60ms once something else is lit), 300ms grace out. Hover only
 * for real pointers; focus has parity with zero delay; touch relights the bar
 * nearest the strip's centre on scrollend, a tap lights, a second tap opens.
 *
 * API other pages rely on: `.strip a[data-light]` bars with data-title/by/line/num,
 * `#lit` slot, `[data-interlude][data-light]` sections, `#glow-a`/`#glow-b` layers.
 */
const html = document.documentElement;
html.dataset.js = '';

const layers = [document.getElementById('glow-a'), document.getElementById('glow-b')];
const theme = document.querySelector('meta[name="theme-color"]');
const slot = document.getElementById('lit');
/* the slot may hold a rest state of its own (the home's bubbles); the readout is where a work's name goes */
const restView = slot ? slot.querySelector('.rest') : null;
const readout = (slot && slot.querySelector('.readout')) || slot;
const strip = document.querySelector('.strip');
const bars = [...document.querySelectorAll('.strip a[data-light]')];
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* the room at rest */
const REST = html.dataset.light || null;
const restEl = bars.find((b) => b.dataset.light === REST) || null;
const rootStyle = getComputedStyle(html);
const pct = (v, d) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};
const LAMP = { x: pct(rootStyle.getPropertyValue('--gx'), 78), y: pct(rootStyle.getPropertyValue('--gy'), 34) };

let active = 0;
let current = REST;
let currentEl = restEl;
let atRest = true;
let timer = 0;
let grace = 0;
let blur = 0;

const glowNow = () => rootStyle.getPropertyValue('--glow').trim() || 'oklch(0.7 0.17 352)';
const bgNow = () => rootStyle.getPropertyValue('--bg').trim() || '#0A0F13';

function centre(el) {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(((r.left + r.width / 2) / innerWidth) * 100),
    y: Math.round(((r.top + r.height / 2) / innerHeight) * 100),
  };
}

function fill(el) {
  if (!slot) return;
  readout.innerHTML = '';
  if (!el) {
    slot.classList.remove('has');
    return;
  }
  const { title, by, line, num } = el.dataset;
  const n = document.createElement('span');
  n.className = 'num';
  n.textContent = num || '';
  readout.append(n);
  const box = document.createElement('span');
  box.className = 'text';
  const t = document.createElement('span');
  t.className = 'small t';
  t.textContent = title + (by ? ', ' + by : '');
  box.append(t);
  if (line) {
    const q = document.createElement('span');
    q.className = 'q';
    q.textContent = line;
    box.append(q);
  }
  readout.append(box);
  slot.classList.add('has');
}

/** Light the page by `id` from `pos` (viewport %), via `el`. `rest` = the room at rest. */
function setLight(id, pos, el, rest = false) {
  if (id === current && el === currentEl && rest === atRest) return;
  const out = layers[active];
  const inn = layers[1 - active];
  out.style.setProperty('--g', glowNow());
  if (id) html.dataset.light = id;
  else delete html.dataset.light;
  const p = pos || LAMP;
  inn.style.setProperty('--g', 'var(--glow)');
  inn.style.setProperty('--gx', p.x + '%');
  inn.style.setProperty('--gy', p.y + '%');
  inn.classList.add('on');
  out.classList.remove('on');
  active = 1 - active;
  current = id;
  if (currentEl) currentEl.classList.remove('on');
  currentEl = el || null;
  atRest = rest;
  const inStrip = !!(el && strip && strip.contains(el));
  if (currentEl && inStrip && !rest) currentEl.classList.add('on');
  if (strip) strip.classList.toggle('is-lit', inStrip && !rest);
  fill(inStrip && !rest ? el : restView ? null : restEl);
  if (theme) theme.content = bgNow();
}
const toRest = () => setLight(REST, LAMP, restEl, true);

/* at load: the slot shows its own rest state (bubbles) or names the rest light; the lamp sits where CSS put it */
if (!restView) fill(restEl);
if (theme) theme.content = bgNow();

if (fine) {
  for (const el of bars) {
    el.addEventListener('pointerenter', () => {
      clearTimeout(grace);
      clearTimeout(timer);
      timer = setTimeout(() => setLight(el.dataset.light, centre(el), el), atRest ? 120 : 60);
    });
    el.addEventListener('pointerleave', () => {
      clearTimeout(timer);
      clearTimeout(grace);
      grace = setTimeout(toRest, 300);
    });
  }
}

/* keyboard: instant, no travel, and no flash between neighbours */
for (const el of bars) {
  el.addEventListener('focusin', () => {
    clearTimeout(blur);
    clearTimeout(grace);
    setLight(el.dataset.light, centre(el), el);
  });
  el.addEventListener('focusout', () => {
    blur = setTimeout(toRest, 0);
  });
}

/* touch: the strip is a scroller; nearest to centre lights up, a tap lights, a second tap opens */
if (!fine && strip && bars.length) {
  const scroller = strip.querySelector('.bars');
  const nearest = () => {
    const mid = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
    let best = null;
    let d = Infinity;
    for (const el of bars) {
      const r = el.getBoundingClientRect();
      const dd = Math.abs(r.left + r.width / 2 - mid);
      if (dd < d) {
        d = dd;
        best = el;
      }
    }
    return best;
  };
  let st = 0;
  const settle = () => {
    const el = nearest();
    if (el && el !== currentEl) setLight(el.dataset.light, centre(el), el);
  };
  if ('onscrollend' in window) scroller.addEventListener('scrollend', settle);
  else scroller.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(settle, 120); }, { passive: true });
  for (const el of bars) {
    el.addEventListener('click', (e) => {
      if (el === currentEl) return; // second tap: follow the link
      e.preventDefault();
      setLight(el.dataset.light, centre(el), el);
      el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }
}

/* interludes: the one place scroll relights, on entry, over 900ms, from the verse's left edge */
const interludes = [...document.querySelectorAll('[data-interlude]')];
if (interludes.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const sec = en.target;
        if (en.isIntersecting) {
          html.dataset.interlude = '';
          sec.dataset.on = '';
          setLight(sec.dataset.light || REST, { x: 12, y: 50 }, sec);
        } else if (sec === currentEl) {
          delete html.dataset.interlude;
          toRest();
        }
      }
    },
    { threshold: 0.5 }
  );
  for (const s of interludes) io.observe(s);
}
