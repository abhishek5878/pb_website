/*
 * /tend: the publishing room (docs/design/tend-spec.md, docs/design/making.md).
 *
 * One page, hash routes: #/ home · #/new · #/taste · #/now · #/projects ·
 * #/projects/<slug> · #/posts · #/posts/<id>. "New" is one box that sorts
 * itself (src/lib/tend/detect.ts): he types, pastes or attaches, a chip row
 * says what it looks like, one tap changes it, and only then do that type's
 * fields show. Editing a post opens the same composer. Every save is one
 * POST to /api/tend/commit/; photos are shrunk on a canvas here (which drops
 * EXIF and GPS), uploaded one blob each with progress, then named in the same
 * commit. A project is one editor for its line in projects.json and its page,
 * src/content/work/<slug>/index.md, saved together.
 * UI words only: nothing in this file writes in his voice.
 */

import { bookLine, detect, isBookUrl, langOf, laneFor, titleFromBookUrl, unwrapVerse, urlsIn, without, withoutBookLine, wrapVerse } from '../lib/tend/detect';
import { audioEmbed, hostLabel, isAudioUrl, videoEmbed, youtubeId } from '../components/writing/embeds';

/* ---------- small helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden') el[k] = v;
      else if (k === 'style') el.style.cssText = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(name, body = {}) {
  let res;
  try {
    res = await fetch(`/api/tend/${name}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'No connection.');
  }
  if (res.status === 401) {
    /* the session is gone: back to the door (a wrong passphrase at the door just says no) */
    if (name !== 'login') location.reload();
    throw new ApiError(401, name === 'login' ? 'No.' : 'Signed out.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Didn’t work.');
  return data;
}

/** One image up, with upload progress (fetch has none). */
function uploadBlob(base64, onProgress) {
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/tend/blob/');
    x.setRequestHeader('Content-Type', 'application/json');
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      if (x.status === 401) return location.reload();
      if (x.status >= 200 && x.status < 300) {
        try {
          ok(JSON.parse(x.responseText));
        } catch {
          no(new Error('bad answer'));
        }
      } else no(new ApiError(x.status, 'Didn’t upload.'));
    };
    x.onerror = () => no(new ApiError(0, 'No connection.'));
    x.send(JSON.stringify({ base64 }));
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : s || '';
};
/** Today in Asia/Kolkata, as YYYY-MM-DD. */
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const slugify = (s) =>
  (s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');

const stars = (r) => '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '');

const LIGHTS = (() => {
  try {
    return JSON.parse($('#tend')?.dataset.lights || '[]');
  } catch {
    return [];
  }
})();
const REST_LIGHT = 'lalaland';
const relight = (id) => {
  document.documentElement.dataset.light = id && LIGHTS.some((l) => l.id === id) ? id : REST_LIGHT;
};

const KIND_LABEL = { film: 'Films', show: 'Shows', music: 'Music', book: 'Books', person: 'People' };
const STATUSES = ['live', 'in use', 'building', 'paused', 'stopped', 'shipped'];
/* The lanes of /writing/ (src/content.config.ts LANES): none, or one of the three. */
const LANES = [
  { value: '', label: 'none' },
  { value: 'night', label: 'night' },
  { value: 'signal', label: 'signal' },
  { value: 'build', label: 'build' },
];

/* ---------- pieces ---------- */

const crumb = (name) =>
  h('div', { class: 'label-row' }, h('a', { href: '#/', class: 'quiet back' }, 'Tend'), h('span', { class: 'here' }, name));

function field(label, control, { optional = false, hint = '' } = {}) {
  const fl = h('span', { class: 'fl' }, label, optional && h('span', { class: 'opt' }, 'optional'));
  return h('label', { class: 'field' }, fl, control, hint && h('span', { class: 'hint' }, hint));
}

/** A named set of controls (pills, stars, tags, links, screenshots): a group, not a label, so a tap on its name changes nothing. */
function group(label, control, { optional = false, hint = '' } = {}) {
  const fl = h('span', { class: 'fl' }, label, optional && h('span', { class: 'opt' }, 'optional'));
  return h('div', { class: 'field', role: 'group', 'aria-label': label }, fl, control, hint && h('span', { class: 'hint' }, hint));
}

const input = (attrs = {}) => h('input', { type: 'text', autocapitalize: 'sentences', spellcheck: 'true', ...attrs });

function textarea(attrs = {}) {
  const t = h('textarea', { rows: 2, autocapitalize: 'sentences', spellcheck: 'true', ...attrs });
  const grow = () => {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 2 + 'px';
  };
  t.addEventListener('input', grow);
  queueMicrotask(grow);
  requestAnimationFrame(grow);
  t.grow = grow;
  return t;
}

/** Radio pills. `options`: [{ value, label }]. */
function pills(name, options, value, onChange) {
  const wrap = h('div', { class: 'pills', role: 'radiogroup' });
  for (const o of options) {
    const r = h('input', { type: 'radio', name, value: o.value, checked: o.value === value, onChange: () => onChange(o.value) });
    wrap.append(h('label', { class: 'pill' }, r, o.label));
  }
  wrap.value = () => wrap.querySelector('input:checked')?.value ?? '';
  return wrap;
}

/** The eleven presets plus none, each as its own swatch. Picking one relights the room. */
function lightPicker(value, onChange) {
  const name = h('p', { class: 'small lightname' }, value || 'none');
  const wrap = h('div', { class: 'lights', role: 'radiogroup', 'aria-label': 'Light' });
  const pick = (id) => {
    name.textContent = id || 'none';
    relight(id);
    onChange?.(id);
  };
  const r0 = h('input', { type: 'radio', name: 'light', value: '', checked: !value, onChange: () => pick('') });
  wrap.append(h('label', { class: 'swatch none', title: 'none' }, r0));
  for (const l of LIGHTS) {
    const r = h('input', { type: 'radio', name: 'light', value: l.id, checked: l.id === value, onChange: () => pick(l.id) });
    wrap.append(h('label', { class: 'swatch', title: l.id, style: `--sw-bg: ${l.bg}; --sw-accent: ${l.accent}` }, r));
  }
  const el = h('div', {}, wrap, name);
  el.value = () => wrap.querySelector('input:checked')?.value ?? '';
  return el;
}

/** The save bar: the one filled control, a status line, an optional quiet second action. */
function saveBar(label, onSave, extra) {
  const status = h('span', { class: 'status small', role: 'status', 'aria-live': 'polite' });
  const btn = h('button', { type: 'button', class: 'btn' }, label);
  const el = h('div', { class: 'bar' }, btn, status, extra);
  const say = (text, isErr = false) => {
    status.textContent = text;
    status.classList.toggle('err', isErr);
  };
  const run = async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      await onSave(say);
    } catch (e) {
      say(e instanceof ApiError || e?.message ? e.message : 'Didn’t work.', true);
    } finally {
      btn.disabled = false;
    }
  };
  btn.addEventListener('click', run);
  el.run = run;
  el.say = say;
  return el;
}

/**
 * After a save: where it will be, in about a minute. Remembered for one load,
 * so a page reload right after (astro dev reloads when posts change) still
 * shows it instead of the empty form.
 */
function done({ url, again, againLabel, big }) {
  try {
    sessionStorage.setItem('tend-done', JSON.stringify({ hash: location.hash, url, again, againLabel, big }));
  } catch {}
  return doneView({ url, again, againLabel, big });
}
function doneView({ url, again, againLabel, big }) {
  const site = location.host.replace(/^www\./, '');
  /* the same route again (New after New): the hash doesn't change, so draw it here */
  const same = (e) => {
    if (e.currentTarget.getAttribute('href') === location.hash) {
      e.preventDefault();
      route();
    }
  };
  const links = h(
    'p',
    { class: 'links' },
    url && h('a', { href: url }, `${site}${url}`),
    again && h('a', { href: again, class: 'quiet', onClick: same }, againLabel || 'Another'),
    h('a', { href: '#/', class: 'quiet' }, 'Home')
  );
  return h('div', { class: 'done' }, h('p', { class: 'big' }, big || 'Live in about a minute.'), links);
}
/** The remembered "done", if this load follows a save on the same route. */
function recentDone() {
  try {
    const raw = sessionStorage.getItem('tend-done');
    if (!raw) return null;
    sessionStorage.removeItem('tend-done');
    const d = JSON.parse(raw);
    return d && d.hash === location.hash ? d : null;
  } catch {
    return null;
  }
}

const loading = () => h('p', { class: 'loading' }, '…');

/* ---------- photos ---------- */

const MAX_EDGE = 2400;
const TARGET_BYTES = 3 * 1024 * 1024; // Vercel's body cap is 4.5MB; base64 adds a third

const toBlob = (c, q) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('encode'))), 'image/jpeg', q));
const toBase64 = (blob) =>
  new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = () => no(r.error);
    r.readAsDataURL(blob);
  });

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {}
  try {
    return await createImageBitmap(file);
  } catch {}
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Decode, draw at most 2400px on the long edge, export JPEG 0.85 (smaller if still over 3MB). No EXIF survives a canvas. */
async function shrink(file) {
  const src = await decode(file);
  const w = src.naturalWidth || src.width;
  const hh = src.naturalHeight || src.height;
  const s = Math.min(1, MAX_EDGE / Math.max(w, hh));
  const cw = Math.max(1, Math.round(w * s));
  const ch = Math.max(1, Math.round(hh * s));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  c.getContext('2d').drawImage(src, 0, 0, cw, ch);
  if (src.close) src.close();
  let q = 0.85;
  let blob = await toBlob(c, q);
  while (blob.size > TARGET_BYTES && q > 0.6) {
    q = Math.round((q - 0.1) * 100) / 100;
    blob = await toBlob(c, q);
  }
  const t = document.createElement('canvas');
  const ts = Math.min(1, 480 / Math.max(cw, ch));
  t.width = Math.round(cw * ts);
  t.height = Math.round(ch * ts);
  t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
  const thumb = t.toDataURL('image/jpeg', 0.7);
  c.width = c.height = t.width = t.height = 0;
  return { blob, thumb, width: cw, height: ch };
}

/**
 * The photo roll: pick, shrink, upload (two at a time, as soon as each is
 * ready), caption, reorder, remove. `existing`: [{ src: './photo-1.jpg', alt, url? }]
 * already in the post or page. ready() resolves when every upload has a sha.
 *
 * Options, for a project page's screenshots: `prefix` names new files
 * (shot-3.jpg), `taken` lists the files already in the folder so a new name
 * never lands on one, `withUrl` adds the address each one shows, `thumbs`
 * maps a kept file to an image of it, `wide` lays them out one per row,
 * `max` caps the roll (`onLimit` hears how many were left out), `onChange`
 * hears every add and remove (the composer re-sorts on it).
 */
function photoRoll(existing = [], { prefix = 'photo', taken = [], withUrl = false, thumbs = {}, wide = false, addLabel = 'Add photos', keptLabel = 'In the post', max = 40, onChange = null, onLimit = null } = {}) {
  const shots = existing.map((i) => {
    const name = i.src.replace(/^\.\//, '');
    return { name, alt: i.alt || '', url: i.url || '', sha: null, state: 'kept', thumb: thumbs[name] || null };
  });
  const numbered = new RegExp(`^${prefix}-(\\d+)\\.`);
  let next = 1 + Math.max(0, ...[...shots.map((s) => s.name), ...taken].map((n) => Number(numbered.exec(n)?.[1] || 0)));
  const grid = h('div', { class: wide ? 'roll wide' : 'roll' });
  const count = h('span', { class: 'n' });
  const picker = h('input', { type: 'file', accept: 'image/*', multiple: true });
  const add = h('label', { class: 'add' }, picker, h('span', {}, addLabel), count);
  const el = h('div', { class: 'form' }, add, grid);

  const queue = [];
  let running = 0;
  const pump = () => {
    while (running < 2 && queue.length) {
      const job = queue.shift();
      running++;
      job().finally(() => {
        running--;
        pump();
      });
    }
  };
  const upload = (s) => {
    s.state = 'uploading';
    s.progress = 0;
    render();
    s.done = new Promise((resolve) => {
      queue.push(async () => {
        try {
          const b64 = s.base64 || (s.base64 = await toBase64(s.blob));
          const { sha } = await uploadBlob(b64, (p) => {
            s.progress = p;
            s.meter && (s.meter.style.width = Math.round(p * 100) + '%');
          });
          s.sha = sha;
          s.state = 'done';
        } catch (e) {
          s.state = 'failed';
          s.error = e;
        }
        render();
        resolve();
      });
      pump();
    });
  };

  async function take(files) {
    const room = Math.max(0, max - shots.length);
    if (files.length > room) {
      onLimit?.(files.length - room);
      files = files.slice(0, room);
    }
    for (const file of files) {
      const s = { name: `${prefix}-${next++}.jpg`, alt: '', url: '', sha: null, state: 'shrinking', file };
      shots.push(s);
      render();
      onChange?.();
      try {
        const { blob, thumb } = await shrink(file);
        s.blob = blob;
        s.thumb = thumb;
        upload(s);
      } catch (e) {
        s.state = 'failed';
        s.error = e;
        render();
      }
    }
  }
  picker.addEventListener('change', () => {
    take([...picker.files]);
    picker.value = '';
  });

  function render() {
    count.textContent = shots.length ? String(shots.length) : '';
    grid.replaceChildren(
      ...shots.map((s, i) => {
        const pic = h('div', { class: 'pic' }, s.thumb && h('img', { src: s.thumb, alt: '' }), h('span', { class: 'nm' }, s.name.replace(/\.[a-z]+$/, '')));
        const meter = h('div', { class: 'meter' }, (s.meter = h('i', { style: `width: ${Math.round((s.progress || 0) * 100)}%` })));
        const state =
          s.state === 'shrinking' ? 'Preparing…' : s.state === 'uploading' ? 'Uploading…' : s.state === 'failed' ? 'Didn’t upload.' : s.state === 'kept' ? keptLabel : '';
        const capControl = wide
          ? textarea({ rows: 1, value: s.alt, placeholder: 'Caption', onInput: (e) => (s.alt = e.target.value) })
          : input({ value: s.alt, placeholder: 'Caption', onInput: (e) => (s.alt = e.target.value) });
        const cap = h('label', { class: 'field cap' }, h('span', { class: 'vh' }, 'Caption'), capControl);
        const url =
          withUrl &&
          h(
            'label',
            { class: 'field cap' },
            h('span', { class: 'vh' }, 'Address it shows'),
            h('input', { type: 'url', inputmode: 'url', autocapitalize: 'none', spellcheck: 'false', value: s.url, placeholder: 'https:// it shows (optional)', onInput: (e) => (s.url = e.target.value) })
          );
        const tools = h(
          'div',
          { class: 'tools' },
          h('button', { type: 'button', class: 'textbtn', 'aria-label': 'Move up', disabled: i === 0, onClick: () => move(i, -1) }, '↑'),
          h('button', { type: 'button', class: 'textbtn', 'aria-label': 'Move down', disabled: i === shots.length - 1, onClick: () => move(i, 1) }, '↓'),
          h('button', { type: 'button', class: 'textbtn', 'aria-label': 'Remove', onClick: () => remove(i) }, '×'),
          s.state === 'failed' && s.blob && h('button', { type: 'button', class: 'textbtn', onClick: () => upload(s) }, 'Retry'),
          state && h('span', { class: 'state' }, state)
        );
        if (wide) return h('div', { class: `shot ${s.state}`, 'data-name': s.name }, h('div', { class: 'side' }, pic, meter), h('div', { class: 'fields' }, cap, url, tools));
        return h('div', { class: `shot ${s.state}`, 'data-name': s.name }, pic, meter, cap, tools);
      })
    );
  }
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= shots.length) return;
    [shots[i], shots[j]] = [shots[j], shots[i]];
    render();
  };
  const remove = (i) => {
    const [s] = shots.splice(i, 1);
    if (s.state === 'kept') removed.push(s.name);
    render();
    onChange?.();
  };
  const removed = [];
  render();

  return {
    el,
    take,
    count: () => shots.length,
    removed: () => removed,
    pending: () => shots.filter((s) => s.state !== 'kept' && s.state !== 'done').length,
    /** Show an image of a kept file once one is found (the public page's own). */
    thumb(name, src) {
      const s = shots.find((x) => x.name === name && x.state === 'kept');
      if (s && !s.thumb) {
        s.thumb = src;
        render();
      }
    },
    async ready() {
      await Promise.all(shots.filter((s) => s.done).map((s) => s.done));
      const bad = shots.filter((s) => s.state !== 'kept' && s.state !== 'done');
      if (bad.length) throw new Error(bad.length === 1 ? 'One photo didn’t upload.' : `${bad.length} photos didn’t upload.`);
      return shots.map((s) => ({ name: s.name, alt: s.alt.trim(), url: s.url.trim(), sha: s.sha }));
    },
  };
}


/* ---------- the composer: one box that sorts itself (docs/design/making.md, Amendment 1) ---------- */

const DRAFT_KEY = (k) => `tend-draft-${k}`;
const loadDraft = (k) => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY(k)) || 'null');
  } catch {
    return null;
  }
};
const saveDraft = (k, v) => {
  try {
    localStorage.setItem(DRAFT_KEY(k), JSON.stringify(v));
  } catch {}
};
const dropDraft = (k) => {
  try {
    localStorage.removeItem(DRAFT_KEY(k));
  } catch {}
};

/* The types, in the order the chips show them. `kind` is what the post is saved as. */
const TYPES = [
  { id: 'note', label: 'Note' },
  { id: 'poem', label: 'Poem' },
  { id: 'essay', label: 'Essay' },
  { id: 'photo', label: 'Photos' },
  { id: 'trip', label: 'Trip' },
  { id: 'video', label: 'Video' },
  { id: 'music', label: 'Music' },
  { id: 'book', label: 'Book' },
  { id: 'film', label: 'Film' },
  { id: 'link', label: 'Link' },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.id, t.label]));
const TYPE_OF_KIND = { note: 'note', build: 'note', poem: 'poem', essay: 'essay', photo: 'photo', trip: 'trip', video: 'video', mix: 'music', listening: 'music', book: 'book', film: 'film', link: 'link' };
const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'mixed', label: 'Mixed' },
];
const BOOK_STATUS = [
  { value: 'reading', label: 'Reading now' },
  { value: 'read', label: 'Finished' },
  { value: 'stopped', label: 'Stopped' },
];
const MUSIC_KINDS = [
  { value: 'listening', label: 'Listening' },
  { value: 'mix', label: 'My mix' },
];
const MAX_PHOTOS = 30;

/** The kind a type saves as. */
const kindOf = (st) => (st.type === 'music' ? (st.musicKind === 'mix' ? 'mix' : 'listening') : st.type === 'note' && st.kind === 'build' ? 'build' : st.type);

/** Text as it reads, for checking a pull line is his, word for word (the same test as inPost in src/lib/posts.ts). */
const flat = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/[*_\\]/g, '').replace(/\s+/g, ' ').trim();

/** A tappable rating out of five, halves allowed: each star is two buttons, its left half and its right. */
function starPicker(value, onChange) {
  let v = typeof value === 'number' ? value : null;
  const row = h('div', { class: 'stars', role: 'group', 'aria-label': 'Rating' });
  const num = h('span', { class: 'mono n' });
  const clear = h('button', { type: 'button', class: 'textbtn', onClick: () => set(null) }, 'Clear');
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const s = h(
      'span',
      { class: 'star' },
      h('button', { type: 'button', class: 'half l', 'aria-label': `${i - 0.5} out of 5`, onClick: () => set(i - 0.5) }),
      h('button', { type: 'button', class: 'half r', 'aria-label': `${i} out of 5`, onClick: () => set(i) })
    );
    stars.push(s);
    row.append(s);
  }
  const set = (x) => {
    v = x;
    paint();
    onChange(v);
  };
  const paint = () => {
    stars.forEach((s, j) => {
      const n = j + 1;
      s.className = 'star ' + (v == null ? '' : v >= n ? 'full' : v >= n - 0.5 ? 'half' : '');
      s.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(v != null && Number(b.getAttribute('aria-label').split(' ')[0]) === v)));
    });
    num.textContent = v == null ? '' : `${Math.floor(v)}${v % 1 ? '½' : ''}`;
    clear.hidden = v == null;
  };
  paint();
  return h('div', { class: 'rating' }, row, num, clear);
}

/** Lines lifted from a book: "+ add a line", each its own box, removable. */
function highlightRows(st) {
  const list = h('div', { class: 'highlights' });
  const render = (focusLast = false) => {
    list.replaceChildren(
      ...st.highlights.map((text, i) =>
        h(
          'div',
          { class: 'hl' },
          h('label', { class: 'field' }, h('span', { class: 'vh' }, `Highlight ${i + 1}`), textarea({ class: 'quote', rows: 2, value: text, onInput: (e) => (st.highlights[i] = e.target.value) })),
          h('button', { type: 'button', class: 'textbtn', onClick: () => { st.highlights.splice(i, 1); render(); } }, 'Remove')
        )
      )
    );
    if (focusLast) list.lastChild?.querySelector('textarea')?.focus();
  };
  render();
  const add = h('button', { type: 'button', class: 'textbtn addline', onClick: () => { st.highlights.push(''); render(true); } }, '+ add a line');
  return h('div', { class: 'hlwrap' }, list, add);
}

/**
 * Tags as chips. Typing and Enter (or a comma) adds one; his existing tags are
 * offered as chips to tap, most used first; an existing tag is reused in its own
 * spelling, so "Poetry" never sits beside "poetry".
 */
function tagChips(st, known) {
  const chosen = h('div', { class: 'chips' });
  const entry = h('input', { type: 'text', autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'done', placeholder: 'Add a tag', 'aria-label': 'Add a tag', maxlength: 40 });
  const offer = h('div', { class: 'chips offer', 'aria-label': 'Your tags' });
  const norm = (t) => t.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').replace(/^#/, '').trim().slice(0, 40);
  const add = (raw) => {
    const t = norm(raw);
    if (!t || st.tags.length >= 20) return;
    const same = (x) => x.toLowerCase() === t.toLowerCase();
    if (st.tags.some(same)) return;
    st.tags.push(known.list.find(same) || t);
    render();
    st.changed();
  };
  const commit = () => {
    const parts = entry.value.split(',');
    entry.value = '';
    parts.forEach(add);
    render();
  };
  entry.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !entry.value && st.tags.length) {
      st.tags.pop();
      render();
      st.changed();
    }
  });
  entry.addEventListener('input', () => {
    if (entry.value.includes(',')) commit();
    else render();
  });
  entry.addEventListener('blur', () => entry.value.trim() && commit());
  function render() {
    chosen.replaceChildren(
      ...st.tags.map((t, i) =>
        h('button', { type: 'button', class: 'chip on', 'aria-label': `Remove tag ${t}`, onClick: () => { st.tags.splice(i, 1); render(); st.changed(); } }, t, h('span', { 'aria-hidden': 'true' }, ' ×'))
      ),
      entry
    );
    const q = entry.value.trim().toLowerCase();
    const free = known.list.filter((t) => !st.tags.some((x) => x.toLowerCase() === t.toLowerCase()) && (!q || t.toLowerCase().includes(q))).slice(0, 12);
    offer.replaceChildren(...free.map((t) => h('button', { type: 'button', class: 'chip', onClick: () => { add(t); entry.value = ''; render(); } }, t)));
    offer.hidden = !free.length;
  }
  render();
  known.ready.then(render);
  const el = h('div', { class: 'tags' }, chosen, offer);
  el.flush = commit;
  return el;
}

/** His tags across every post, most used first (for the chips). */
function knownTags() {
  const known = { list: [] };
  known.ready = postList()
    .then((list) => {
      const n = new Map();
      for (const p of list) for (const t of p.tags || []) n.set(t, (n.get(t) || 0) + 1);
      known.list = [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
    })
    .catch(() => {});
  return known;
}

/** Where a link points, to show under the box: the still for YouTube, else the name of where it plays or lives. */
function linkPreview(url, { kind }) {
  if (!url) return null;
  const id = youtubeId(url);
  const where = hostLabel(url);
  const plays = kind === 'video' ? videoEmbed(url) : kind === 'music' ? audioEmbed(url) : null;
  const short = /^https?:\/\/(on\.soundcloud\.com|spotify\.link)\//i.test(url);
  const note =
    kind === 'video' || kind === 'music'
      ? plays
        ? `${where} · plays on the post, nothing loads until pressed`
        : short
          ? `${where} · a short link shows as a link; the full one plays on the post`
          : `${where} · shows as a link`
      : url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  return h(
    'div',
    { class: 'preview' + (id ? ' yt' : '') },
    id && h('img', { src: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' }),
    h('p', { class: 'small' }, note)
  );
}

/**
 * The composer. New: an empty box. Edit: `existing` = { path, id, fields, body, files }.
 * Everything typed lives in `st`; the box is the post's words, and the link a
 * video, a mix, a link or a book carries is read out of it when it's saved.
 */
function composer({ existing = null, draftKey = null } = {}) {
  const f0 = existing ? { ...existing.fields } : {};
  const draft = !existing && draftKey ? loadDraft(draftKey) : null;
  const st = {
    type: null,
    picked: false,
    box: '',
    rawVerse: false,
    detected: null,
    title: f0.title || '',
    subtitle: f0.subtitle || '',
    place: f0.place || '',
    subject: f0.subject || '',
    by: f0.by || '',
    year: f0.year ?? '',
    rating: typeof f0.rating === 'number' ? f0.rating : null,
    status: f0.status || (existing ? '' : 'read'),
    highlights: Array.isArray(f0.highlights) ? [...f0.highlights] : [],
    lang: f0.lang || 'en',
    langPicked: !!f0.lang,
    musicKind: f0.kind === 'mix' ? 'mix' : 'listening',
    kind: f0.kind || '',
    light: f0.light || '',
    pull: Array.isArray(f0.pull) ? [...f0.pull] : [],
    lane: typeof f0.lane === 'string' ? f0.lane : '',
    lanePicked: !!existing,
    date: f0.date || today(),
    draft: f0.draft === true,
    tags: Array.isArray(f0.tags) ? [...f0.tags] : [],
    touched: { subject: !!f0.subject, by: !!f0.by },
    changed: () => {},
  };

  if (existing) {
    st.type = TYPE_OF_KIND[f0.kind] || 'note';
    st.picked = true;
    let body = existing.body || '';
    if (st.type === 'poem') {
      const plain = unwrapVerse(body);
      if (plain !== null) body = plain;
      else st.rawVerse = true; /* not in the composer's verse format: edited as the markdown it is */
    }
    /* a link the post carries in a field goes back in the box, where the composer reads it from */
    const url = st.type === 'video' ? f0.youtube || f0.link : st.type === 'music' ? f0.audio : st.type === 'link' || st.type === 'book' ? f0.link : null;
    st.box = url ? (body.trim() ? `${url}\n\n${body}` : url) : body;
  } else if (draft) {
    Object.assign(st, draft, { changed: st.changed, touched: { ...st.touched, ...(draft.touched || {}) } });
  } else {
    /* a draft from the old Write or Trip room: its words come over once */
    for (const k of ['write', 'trip']) {
      const old = loadDraft(k);
      if (!old) continue;
      dropDraft(k);
      if (st.box) continue;
      st.box = old.body || '';
      const of = old.fields || {};
      for (const key of ['title', 'subtitle', 'place', 'subject', 'by', 'light']) if (of[key]) st[key] = of[key];
      if (of.kind && TYPE_OF_KIND[of.kind]) {
        st.type = TYPE_OF_KIND[of.kind];
        st.picked = true;
      }
    }
  }

  const known = knownTags();
  const roll = photoRoll(existing ? f0.images || [] : [], {
    max: MAX_PHOTOS,
    addLabel: 'Add photos',
    onChange: () => sort(),
    onLimit: (n) => bar.say(`${MAX_PHOTOS} photos at most; ${n === 1 ? 'one was' : `${n} were`} left out.`, true),
  });

  /* ---- the controls, made once and moved between types so nothing typed is lost ---- */
  const ctl = {};
  const one = (key, make) => ctl[key] || (ctl[key] = make());
  const text = (key, attrs = {}) =>
    one(key, () =>
      input({
        value: String(st[key] ?? ''),
        ...attrs,
        onInput: (e) => {
          st[key] = e.target.value;
          if (key in st.touched) st.touched[key] = true;
          changed();
          /* a place beside two or more photos makes it a trip */
          if (key === 'place') {
            clearTimeout(box.t);
            box.t = setTimeout(sort, 400);
          }
        },
      })
    );

  const box = textarea({
    class: 'words box',
    rows: 6,
    value: st.box,
    'aria-label': 'What you want to post',
    placeholder: 'Type, paste a link, or add photos',
    onInput: (e) => {
      st.box = e.target.value;
      changed();
      clearTimeout(box.t);
      box.t = setTimeout(sort, 250);
    },
  });
  const boxHint = h('p', { class: 'hint small' });

  const typeRow = h('div', { class: 'types', role: 'group', 'aria-label': 'Type' });
  const said = h('span', { class: 'vh', role: 'status', 'aria-live': 'polite' });
  const extras = h('div', { class: 'form extras' });
  const tagsField = group('Tags', tagChips(st, known), { optional: true });
  const moreSum = h('span', { class: 'sum' });
  const more = h('details', { class: 'more' }, h('summary', {}, 'More', moreSum), h('div', { class: 'form' }));

  /* ---- what it looks like: the rules in detect.ts, unless he picked ---- */
  function sort() {
    const d = detect(st.box, { photos: roll.count(), place: st.place });
    st.detected = d;
    if (!st.picked) {
      const next = d ? d.type : null;
      if (next !== st.type) {
        st.type = next;
        if (next) said.textContent = `Looks like ${TYPE_LABEL[next]}`;
        show();
      }
    }
    /* a poem's language follows what he types, until he picks one */
    if (st.type === 'poem' && !st.langPicked) {
      const l = langOf(st.box);
      if (l !== st.lang) {
        st.lang = l;
        ctl.lang?.querySelectorAll('input').forEach((r) => (r.checked = r.value === l));
      }
    }
    /* a book's title and author from `book: Title by Author`, or its address, while he hasn't typed them */
    if (st.type === 'book') {
      const b = bookLine(st.box);
      const url = urlsIn(st.box).find(isBookUrl);
      const subject = b?.subject || (url ? titleFromBookUrl(url) : '');
      if (!st.touched.subject && subject && ctl.subject) ctl.subject.value = st.subject = subject;
      if (!st.touched.by && b?.by && ctl.by) ctl.by.value = st.by = b.by;
    }
    paintTypes();
    paintPreview();
    paintMore();
  }

  function paintTypes() {
    const cur = st.type;
    /* the current type leads the row; on a phone the row swipes, so bring it back to the start */
    if (typeRow.cur !== cur) typeRow.scrollLeft = 0;
    typeRow.cur = cur;
    const order = cur ? [cur, ...TYPES.map((t) => t.id).filter((t) => t !== cur)] : TYPES.map((t) => t.id);
    typeRow.replaceChildren(
      ...order.map((id) =>
        h(
          'button',
          {
            type: 'button',
            class: 'chip type' + (id === cur ? ' on' : ''),
            'aria-pressed': String(id === cur),
            onClick: () => {
              if (id === cur && st.picked && !existing) {
                st.picked = false; /* a second tap on the picked type hands it back to the box */
                sort();
                return;
              }
              st.picked = true;
              st.type = id;
              said.textContent = TYPE_LABEL[id];
              show();
              sort();
              changed();
            },
          },
          id === cur && !st.picked ? h('span', { class: 'lk' }, 'Looks like: ') : null,
          TYPE_LABEL[id]
        )
      )
    );
  }

  const preview = h('div', { class: 'previewslot' });
  function currentUrl() {
    const urls = urlsIn(st.box);
    if (st.type === 'video') return urls.find((u) => youtubeId(u)) || urls.find((u) => videoEmbed(u)) || urls[0];
    if (st.type === 'music') return urls.find((u) => isAudioUrl(u));
    if (st.type === 'book') return urls.find(isBookUrl);
    if (st.type === 'link') return urls[0];
    return undefined;
  }
  function paintPreview() {
    const url = currentUrl();
    const key = `${st.type}|${url || ''}`;
    if (preview.key === key) return;
    preview.key = key;
    preview.replaceChildren(...[linkPreview(url, { kind: st.type })].filter(Boolean));
  }

  /** Keep the caret where it was when a control moves (a type change re-lays the extras). */
  function keepFocus(fn) {
    const a = document.activeElement;
    const sel = a && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
    fn();
    if (a && a.isConnected && document.activeElement !== a) {
      a.focus({ preventScroll: true });
      try {
        if (sel) a.setSelectionRange(sel[0], sel[1]);
      } catch {}
    }
  }

  /* ---- the type's own fields ---- */
  function lightCtl() {
    return one('light', () => lightPicker(st.light, (id) => { st.light = id; changed(); }));
  }
  function pullCtl() {
    return one('pull', () => (st.pull.length > 1 ? textarea({ rows: 2, value: st.pull.join('\n'), placeholder: 'One per line, exactly as written', onInput: (e) => { st.pull = e.target.value.split('\n'); changed(); } }) : input({ value: st.pull[0] || '', placeholder: 'A line from the piece, exactly as written', onInput: (e) => { st.pull = [e.target.value]; changed(); } })));
  }
  function show() {
    keepFocus(() => {
      const t = st.type;
      const parts = [];
      if (t === 'poem') {
        parts.push(field('Title', text('title'), { optional: true, hint: 'Untitled, it goes by its first line.' }));
        parts.push(group('Language', one('lang', () => pills('lang', LANGS, st.lang, (v) => { st.lang = v; st.langPicked = true; changed(); }))));
        parts.push(group('Light', lightCtl(), { optional: true }));
        parts.push(field('Pull line', pullCtl(), { optional: true, hint: 'Shown full screen after the poem.' }));
      } else if (t === 'note') {
        parts.push(field('Title', text('title'), { optional: true }));
      } else if (t === 'essay') {
        parts.push(field('Title', text('title')));
        parts.push(field('Subtitle', text('subtitle'), { optional: true }));
      } else if (t === 'photo') {
        parts.push(field('Place', text('place', { autocapitalize: 'words' }), { optional: true, hint: 'With two or more photos, a place makes it a trip.' }));
      } else if (t === 'trip') {
        parts.push(field('Title', text('title'), { optional: true }));
        parts.push(field('Place', text('place', { autocapitalize: 'words' }), { optional: true }));
      } else if (t === 'video') {
        parts.push(preview);
        parts.push(field('Title', text('title'), { optional: true }));
      } else if (t === 'music') {
        parts.push(preview);
        parts.push(group('It’s', one('musicKind', () => pills('musickind', MUSIC_KINDS, st.musicKind, (v) => { st.musicKind = v; if (!st.lanePicked) st.lane = laneFor(kindOf(st)); show(); changed(); }))));
        if (st.musicKind === 'mix') parts.push(field('Title', text('title'), { optional: true }));
        else {
          parts.push(field('What', text('subject'), { optional: true }));
          parts.push(field('By', text('by'), { optional: true }));
          parts.push(group('Rating', one('rating', () => starPicker(st.rating, (v) => { st.rating = v; changed(); })), { optional: true }));
        }
      } else if (t === 'book') {
        parts.push(preview);
        parts.push(field('Title', text('subject')));
        parts.push(field('Author', text('by'), { optional: true }));
        parts.push(group('Status', one('status', () => pills('status', BOOK_STATUS, st.status, (v) => { st.status = v; changed(); }))));
        parts.push(group('Rating', one('rating', () => starPicker(st.rating, (v) => { st.rating = v; changed(); })), { optional: true }));
        parts.push(group('Highlights', one('highlights', () => highlightRows(st)), { optional: true }));
      } else if (t === 'film') {
        parts.push(field('What', text('subject')));
        parts.push(h('div', { class: 'two' }, field('By', text('by')), field('Year', text('year', { type: 'number', inputmode: 'numeric', min: 1800, max: 2100 }))));
        parts.push(group('Rating', one('rating', () => starPicker(st.rating, (v) => { st.rating = v; changed(); })), { optional: true }));
      } else if (t === 'link') {
        parts.push(preview);
        parts.push(field('Title', text('title'), { optional: true }));
      }
      extras.replaceChildren(...parts);
      extras.hidden = !parts.length;
      boxHint.textContent = t === 'poem' ? (st.rawVerse ? 'Markdown, as it was saved.' : 'Each line a line; a blank line between stanzas.') : t === 'book' ? 'Notes, if any. Logging a book with no words is fine.' : '';
      boxHint.hidden = !boxHint.textContent;
      box.classList.toggle('verse', t === 'poem');
      tagsField.hidden = more.hidden = !t;
      if (!st.lanePicked) st.lane = laneFor(kindOf(st));
      paintMore(true);
      paintPreview();
      relight(st.light);
    });
  }

  /* ---- More: the date, the lane, the light, pull lines, draft ---- */
  function paintMore(rebuild = false) {
    moreSum.textContent = [st.lane || null, fmtDate(st.date), st.draft && 'draft'].filter(Boolean).join(' · ');
    if (!rebuild) return;
    const inner = more.lastChild;
    keepFocus(() =>
      inner.replaceChildren(
        ...[
          st.type === 'photo' && field('Title', text('title'), { optional: true }),
          field('Date', one('date', () => h('input', { type: 'date', value: st.date, required: true, onChange: (e) => { st.date = e.target.value; changed(); paintMore(); } }))),
          group('Lane', one('lane', () => pills('lane', LANES, st.lane, (v) => { st.lane = v; st.lanePicked = true; changed(); paintMore(); }))),
          st.type !== 'poem' && group('Light', lightCtl(), { optional: true }),
          st.type !== 'poem' && field('Pull lines', pullCtl(), { optional: true }),
          h('label', { class: 'check' }, one('draft', () => h('input', { type: 'checkbox', checked: st.draft, onChange: (e) => { st.draft = e.target.checked; changed(); paintMore(); } })), 'Draft (not on the site yet)'),
        ].filter(Boolean)
      )
    );
    /* the lane pills follow the kind's default until he picks one */
    ctl.lane?.querySelectorAll('input').forEach((r) => (r.checked = r.value === st.lane));
  }

  /* ---- the draft, autosaved so a closed tab costs nothing (photos aren't kept: they're files) ---- */
  let dt = 0;
  function changed() {
    if (!draftKey) return;
    clearTimeout(dt);
    dt = setTimeout(() => {
      const { changed: _c, detected: _d, ...keep } = st;
      saveDraft(draftKey, keep);
    }, 400);
  }
  st.changed = changed;

  /**
   * The post as the server wants it. An edit keeps every field the composer
   * doesn't show (canonical, publication, a year on a listening…) exactly as it came.
   */
  function read() {
    const kind = kindOf(st);
    const fields = {};
    for (const [k, v] of Object.entries(f0)) if (v !== undefined && v !== null && v !== '') fields[k] = v;
    /* what belongs to one type only goes when the post isn't that type any more */
    if (kind !== 'book') {
      delete fields.status;
      delete fields.highlights;
    }
    if (kind !== 'mix' && kind !== 'listening') delete fields.audio;
    if (kind !== 'poem' && !['note', 'essay'].includes(kind)) delete fields.lang;
    const urls = urlsIn(st.box);
    let body = st.box;
    const set = (k, v) => {
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) delete fields[k];
      else fields[k] = v;
    };
    const t = st.type;
    set('kind', kind);
    set('date', st.date);
    if (!existing) set('source', 'tend');
    if (['poem', 'note', 'essay', 'trip', 'video', 'link'].includes(t) || (t === 'music' && st.musicKind === 'mix') || t === 'photo') set('title', st.title.trim());
    if (t === 'essay') set('subtitle', st.subtitle.trim());
    if (t === 'photo' || t === 'trip') set('place', st.place.trim());
    if (['book', 'film'].includes(t) || (t === 'music' && st.musicKind === 'listening')) {
      set('subject', st.subject.trim());
      set('by', st.by.trim());
      set('rating', st.rating ?? undefined);
    }
    if (t === 'film') set('year', st.year ? Number(st.year) : undefined);
    if (t === 'book') {
      set('status', st.status || undefined);
      set('highlights', st.highlights.map((s) => s.trim()).filter(Boolean));
    }
    /* a new poem always says its language; an old one only when it isn't English or he picked */
    if (t === 'poem' && (!existing || f0.lang || st.langPicked || st.lang !== 'en')) set('lang', st.lang);
    if (t === 'video') {
      const yt = urls.find((u) => youtubeId(u));
      const other = urls.find((u) => videoEmbed(u)) || urls[0];
      set('youtube', yt);
      set('link', yt ? undefined : other);
      body = without(body, yt || other);
    }
    if (t === 'music') {
      const a = urls.find((u) => isAudioUrl(u));
      set('audio', a);
      body = without(body, a);
    }
    if (t === 'link') {
      set('link', urls[0]);
      body = without(body, urls[0]);
    }
    if (t === 'book') {
      const b = urls.find(isBookUrl);
      if (b) set('link', b);
      body = withoutBookLine(without(body, b));
    }
    if (t === 'poem' && !st.rawVerse) body = wrapVerse(body.trim());
    set('pull', st.pull.map((s) => s.trim()).filter(Boolean));
    set('light', st.light || undefined);
    set('lane', st.lane || undefined);
    set('tags', st.tags);
    set('draft', st.draft || undefined);
    return { fields, body: body.replace(/\s+$/, ''), plain: t === 'poem' ? st.box : body };
  }

  /** In UI words, what's missing; the server holds the same rules (kindProblem). */
  function problem({ fields, body, plain }, photos) {
    const k = fields.kind;
    const words = body.trim().length > 0;
    if (!st.type) return 'Type something, paste a link, or add photos.';
    if (!fields.date) return 'A date, please.';
    if ((k === 'note' || k === 'poem' || k === 'essay') && !words) return k === 'poem' ? 'The poem, please.' : 'Nothing to publish yet.';
    if (k === 'essay' && !fields.title) return 'An essay needs a title.';
    if (k === 'photo' && !photos) return 'Add a photo or two.';
    if (k === 'trip' && !photos && !words) return 'Add photos or words.';
    if (k === 'video' && !fields.youtube && !fields.link) return 'Paste the video’s link in the box.';
    if (k === 'mix' && !fields.audio) return 'Paste the mix’s SoundCloud, Mixcloud, Spotify or YouTube link in the box.';
    if (k === 'listening' && !fields.audio && !fields.subject) return 'Paste a SoundCloud, Mixcloud, Spotify or YouTube link, or say what it is.';
    if ((k === 'book' || k === 'film') && !fields.subject) return k === 'book' ? 'The book’s title, please.' : 'What is it? The title, please.';
    if (k === 'link' && !fields.link) return 'Paste the link in the box.';
    /* a pull line is lifted from the piece: word for word, though a capital may start it; one the post already had is left be */
    const whole = flat([fields.title, fields.subtitle, plain].filter(Boolean).join('\n')).toLowerCase();
    const had = new Set(Array.isArray(f0.pull) ? f0.pull : []);
    const off = (fields.pull || []).find((p) => !had.has(p) && !whole.includes(flat(p.replace(/^…|…$/g, '')).toLowerCase()));
    if (off) return 'A pull line must be in the piece, word for word.';
    return null;
  }

  async function publish(say) {
    tagsField.querySelector('.tags')?.flush?.();
    const out = read();
    const why = problem(out, roll.count());
    if (why) throw new Error(why);
    const { fields, body } = out;
    let shots = [];
    if (roll.count() || roll.removed().length) {
      if (roll.pending()) say('Waiting for the photos…');
      shots = await roll.ready();
    }
    if (shots.length || (f0.images || []).length) fields.images = shots.map((s) => ({ src: `./${s.name}`, alt: s.alt }));
    if (fields.images && !fields.images.length) delete fields.images;

    let id = existing?.id;
    if (!id) {
      const firstWords = slugify(body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).slice(0, 6).join(' '));
      const base = slugify(fields.title) || slugify(fields.subject) || slugify(fields.place) || firstWords || fields.kind;
      id = `${fields.date}-${base}`;
      const taken = new Set((await postList().catch(() => [])).map((p) => p.id));
      for (let n = 2; taken.has(id); n++) id = `${fields.date}-${base}-${n}`;
    }
    const dir = `src/content/posts/${id}`;
    const folder = shots.length > 0 || (existing?.path || '').endsWith('/index.md');
    const mdPath = folder ? `${dir}/index.md` : `${dir}.md`;
    const files = [{ path: mdPath, post: { fields, body } }];
    for (const s of shots) if (s.sha) files.push({ path: `${dir}/${s.name}`, sha: s.sha });
    const deletes = [];
    if (existing && existing.path !== mdPath) deletes.push(existing.path);
    for (const name of roll.removed()) deletes.push(`${dir}/${name}`);
    if (files.length + deletes.length > 40) throw new Error('Too many files for one save.');
    const what = fields.title || fields.subject || fields.place || TYPE_LABEL[st.type].toLowerCase();
    say(fields.draft ? 'Saving…' : 'Publishing…');
    const res = await api('commit', { message: existing ? `edit ${what}` : `new ${fields.kind}, ${what}`, files, deletes });
    return { ...res, draft: fields.draft === true };
  }

  /* ---- the page ---- */
  const bar = saveBar(existing ? 'Save' : 'Publish', async (say) => {
    const { url, draft: isDraft } = await publish(say);
    if (draftKey) {
      clearTimeout(dt);
      dropDraft(draftKey);
    }
    posts.list = null;
    relight('');
    /* a draft isn't on the site, so there's no page to link to yet */
    const big = isDraft ? 'Saved as a draft. Not on the site yet.' : existing ? 'Saved. Live in about a minute.' : 'Live in about a minute.';
    el.replaceChildren(el.firstChild, done({ url: isDraft ? null : url, again: '#/new', againLabel: 'New', big }));
  });

  const el = h(
    'div',
    { class: 'view composer' },
    crumb(existing ? 'Edit' : 'New'),
    typeRow,
    said,
    h('label', { class: 'field boxfield' }, h('span', { class: 'vh' }, 'What you want to post'), box, boxHint),
    h('div', { class: 'attach' }, roll.el),
    extras,
    tagsField,
    more,
    bar
  );
  el.bar = bar;
  el.run = bar.run;
  el.publish = publish;

  if (draft) bar.say('Draft restored. Photos aren’t kept in a draft.');
  show();
  sort();
  if (!existing && !st.box) queueMicrotask(() => box.focus({ preventScroll: true }));
  return el;
}

/* ---------- views ---------- */

const posts = { list: null, at: 0 };
/** The posts, fetched once a minute at most; new posts check their id against it, and the tags come from it. */
async function postList(force = false) {
  if (force || !posts.list || Date.now() - posts.at > 60_000) {
    if (!posts.pending || force) posts.pending = api('list').then((r) => ((posts.list = r.posts), (posts.at = Date.now()), r.posts)).finally(() => (posts.pending = null));
    return posts.pending;
  }
  return posts.list;
}

function viewHome() {
  const rooms = [
    ['#/taste', 'Taste', 'what you say about a work'],
    ['#/now', 'Now', 'the bubbles'],
    ['#/projects', 'Projects', 'the list and each page'],
    ['#/posts', 'Posts', 'edit or delete'],
  ];
  const out = h(
    'button',
    {
      type: 'button',
      class: 'textbtn',
      onClick: async () => {
        /* nothing of his stays in this browser: every draft, and the remembered "done" */
        try {
          for (const k of Object.keys(localStorage)) if (k.startsWith('tend-draft-')) localStorage.removeItem(k);
        } catch {}
        try {
          sessionStorage.removeItem('tend-done');
        } catch {}
        await api('logout').catch(() => {});
        location.reload();
      },
    },
    'Log out'
  );
  const hasDraft = !!loadDraft('new');
  return h(
    'div',
    { class: 'view' },
    h('div', { class: 'label-row' }, h('span', {}, 'Tend'), h('time', { class: 'mono', datetime: today() }, fmtDate(today()))),
    h(
      'a',
      { href: '#/new', class: 'new' },
      h('span', { class: 'name' }, 'New'),
      h('span', { class: 'hint' }, hasDraft ? 'your draft is waiting' : 'a poem, photos, a video, a mix, a book, a note, anything')
    ),
    h('nav', { class: 'choices rooms', 'aria-label': 'Rooms' }, ...rooms.map(([href, name, hint]) => h('a', { href }, h('span', { class: 'name' }, name), hint && h('span', { class: 'hint' }, hint)))),
    h('p', { class: 'out' }, out)
  );
}

function viewNew() {
  return composer({ draftKey: 'new' });
}

async function viewPosts(id) {
  if (id) return viewPost(id);
  const list = await postList(true);
  const items = h('div', { class: 'items' });
  if (!list.length) items.append(h('p', { class: 'quietline' }, 'No posts yet.'));
  for (const p of list) {
    const name = p.title || (p.subject ? (p.by ? `${p.subject}, ${p.by}` : p.subject) : p.kind);
    items.append(
      h(
        'a',
        { class: 'item', href: `#/posts/${encodeURIComponent(p.id)}` },
        h('span', { class: 'name' }, name),
        h('span', { class: 'sub' }, h('span', {}, p.kind), h('time', { class: 'mono', datetime: p.date }, fmtDate(p.date)), p.images ? h('span', {}, `${p.images} photo${p.images === 1 ? '' : 's'}`) : null, p.draft && h('span', {}, 'draft'))
      )
    );
  }
  return h('div', { class: 'view' }, crumb('Posts'), items);
}

async function viewPost(id) {
  const list = await postList();
  const meta = list.find((p) => p.id === id);
  if (!meta) return h('div', { class: 'view' }, crumb('Posts'), h('p', { class: 'quietline' }, 'Not here.'));
  const { fields, body, files = [] } = await api('read', { path: meta.path });
  const view = composer({ existing: { path: meta.path, id, fields, body, files } });
  const name = fields.title || fields.subject || id;
  const del = h('button', { type: 'button', class: 'textbtn danger' }, 'Delete');
  view.bar.append(del);
  del.addEventListener('click', async () => {
    if (!confirm(`Delete “${name}”? It leaves the site with the next deploy.`)) return;
    del.disabled = true;
    view.bar.say('Deleting…');
    try {
      /* the post and, for a folder, every file beside it that the server's allowlist lets go */
      const dir = meta.path.replace(/index\.md$/, '');
      const deletes = [meta.path, ...files.map((n) => dir + n)].filter(
        (p) => p === meta.path || /^src\/content\/posts\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|jpeg|webp|png)$/.test(p)
      );
      if (deletes.length > 40) throw new Error('Too many files for one save; delete some photos first.');
      await api('commit', { message: `delete ${name}`, files: [], deletes: [...new Set(deletes)] });
      posts.list = null;
      relight('');
      view.replaceChildren(crumb('Posts'), done({ big: 'Gone in about a minute.', again: '#/posts', againLabel: 'Posts' }));
    } catch (e) {
      view.bar.say(e.message || 'Didn’t work.', true);
      del.disabled = false;
    }
  });
  return view;
}

/* taste: his line and note on a work */
async function viewTaste(id) {
  const { data } = await api('read', { path: 'src/data/taste.json' });
  if (id) {
    const w = data.find((x) => x.id === id);
    if (!w) return h('div', { class: 'view' }, crumb('Taste'), h('p', { class: 'quietline' }, 'Not here.'));
    return editWork(data, w);
  }
  const search = input({ type: 'search', placeholder: 'Find a work', autocapitalize: 'none', 'aria-label': 'Find a work' });
  const items = h('div', { class: 'items' });
  const render = () => {
    const q = search.value.trim().toLowerCase();
    items.replaceChildren();
    for (const kind of Object.keys(KIND_LABEL)) {
      const ws = data.filter((w) => w.kind === kind && (!q || `${w.title} ${w.by || ''}`.toLowerCase().includes(q)));
      if (!ws.length) continue;
      items.append(h('p', { class: 'group-label' }, KIND_LABEL[kind]));
      for (const w of ws) {
        items.append(
          h(
            'a',
            { class: 'item', href: `#/taste/${w.id}` },
            h('span', { class: 'name' }, w.by ? `${w.title}, ${w.by}` : w.title),
            (w.line || w.note) && h('span', { class: 'sub' }, h('span', { class: 'q' }, w.line || w.note))
          )
        );
      }
    }
  };
  search.addEventListener('input', render);
  render();
  return h('div', { class: 'view' }, crumb('Taste'), h('div', { class: 'field search' }, search), items);
}

function editWork(data, w) {
  const line = input({ value: w.line || '' });
  const note = textarea({ class: 'note', rows: 4, value: w.note || '' });
  const light = w.light ? lightPicker(w.light) : null;
  if (w.light) relight(w.light);
  const view = h(
    'div',
    { class: 'view' },
    h('div', { class: 'label-row' }, h('a', { href: '#/taste', class: 'quiet back' }, 'Taste'), h('span', { class: 'here' }, KIND_LABEL[w.kind])),
    h('div', { class: 'work-head' }, h('p', { class: 'name' }, w.title), w.by && h('p', { class: 'by' }, w.by)),
    h('div', { class: 'form' }, field('Line', line, { optional: true }), field('Note', note, { optional: true }), light && field('Light', light))
  );
  const bar = saveBar('Save', async (say) => {
    w.line = line.value.trim() || undefined;
    w.note = note.value.trim() || undefined;
    if (light) w.light = light.value() || undefined;
    say('Saving…');
    const { url } = await api('commit', { message: `taste, ${w.title}`, files: [{ path: 'src/data/taste.json', text: JSON.stringify(data, null, 2) + '\n' }] });
    relight('');
    view.replaceChildren(view.firstChild, done({ url, again: '#/taste', againLabel: 'Taste' }));
  });
  view.append(bar);
  view.run = bar.run;
  return view;
}

/* now: the bubbles, and where they're written from. A save also keeps the day's snapshot for /now/ (the server does it). */
async function viewNow() {
  const { data, place: lastPlace } = await api('read', { path: 'src/data/now.json' });
  const rows = data.map((r) => ({ ...r }));
  const place = input({ value: lastPlace || 'Bangalore', autocapitalize: 'words', maxlength: 60, autocomplete: 'address-level2' });
  const list = h('div', { class: 'rows' });
  const render = () => {
    list.replaceChildren(
      ...rows.map((r, i) =>
        h(
          'div',
          { class: 'nowrow' },
          h('div', { class: 'two' }, field('Verb', input({ value: r.verb, onInput: (e) => (r.verb = e.target.value) })), field('Short', input({ value: r.short, onInput: (e) => (r.short = e.target.value) }))),
          field('What', textarea({ rows: 2, value: r.what, onInput: (e) => (r.what = e.target.value) })),
          h(
            'div',
            { class: 'tools' },
            h('button', { type: 'button', class: 'textbtn', 'aria-label': 'Move up', disabled: i === 0, onClick: () => { [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; render(); } }, '↑'),
            h('button', { type: 'button', class: 'textbtn', 'aria-label': 'Move down', disabled: i === rows.length - 1, onClick: () => { [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; render(); } }, '↓'),
            h('button', { type: 'button', class: 'textbtn', onClick: () => { rows.splice(i, 1); render(); } }, 'Remove')
          )
        )
      )
    );
  };
  render();
  const add = h('p', { class: 'addrow' }, h('button', { type: 'button', class: 'textbtn', onClick: () => { rows.push({ verb: '', short: '', what: '' }); render(); list.lastChild?.querySelector('input')?.focus(); } }, 'Add a row'));
  const view = h('div', { class: 'view' }, crumb('Now'), h('div', { class: 'form place' }, field('Place', place, { hint: 'The city only.' })), list, add);
  const bar = saveBar('Save', async (say) => {
    const clean = rows.map((r) => ({ verb: r.verb.trim(), short: r.short.trim(), what: r.what.trim() })).filter((r) => r.verb || r.short || r.what);
    if (clean.some((r) => !r.verb || !r.short || !r.what)) throw new Error('Every row needs a verb, a short and a what.');
    const where = place.value.replace(/\s+/g, ' ').trim();
    if (!where) throw new Error('A place, please.');
    say('Saving…');
    const { url } = await api('commit', { message: 'now', files: [{ path: 'src/data/now.json', text: JSON.stringify(clean, null, 2) + '\n', place: where }] });
    view.replaceChildren(crumb('Now'), done({ url }));
  });
  view.append(bar);
  view.run = bar.run;
  return view;
}

/* projects: the line in projects.json, and the page in src/content/work/<slug>/index.md */

const LINK_KINDS = ['live', 'demo', 'repo', 'paper', 'post', 'page'];
const PROJECTS = 'src/data/projects.json';
const pagePath = (slug) => `src/content/work/${slug}/index.md`;
const hostOf = (u) => (u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
/** A first guess at a link's kind from its address; he can change it. */
const guessKind = (u) =>
  /github\.com\//i.test(u) ? 'repo' : /arxiv\.org|doi\.org|\.pdf$/i.test(u) ? 'paper' : /substack\.com|vyas\.garden\/writing\//i.test(u) ? 'post' : 'page';

/** The slugs that have a page folder, read at runtime (they can be renamed under us). */
const pageSlugs = () =>
  api('list', { of: 'pages' })
    .then((r) => new Set(r.pages || []))
    .catch(() => null);

async function viewProjects(slug) {
  const [{ data }, pages] = await Promise.all([api('read', { path: PROJECTS }), pageSlugs()]);
  if (slug === 'new') return editProject(data, null, { pages });
  if (slug) {
    const p = data.find((x) => x.slug === slug);
    if (!p) return h('div', { class: 'view' }, crumb('Projects'), h('p', { class: 'quietline' }, 'Not here.'));
    const page = await api('read', { path: pagePath(p.slug) });
    return editProject(data, p, { pages, page });
  }
  const items = h('div', { class: 'items' });
  for (const p of data) {
    items.append(
      h(
        'a',
        { class: 'item', href: `#/projects/${p.slug}` },
        h('span', { class: 'name' }, p.name),
        h('span', { class: 'sub' }, h('span', {}, p.status), h('span', { class: 'mono' }, p.when), pages && !pages.has(p.slug) && h('span', {}, 'no page yet'))
      )
    );
  }
  return h('div', { class: 'view' }, crumb('Projects'), h('p', { class: 'addrow' }, h('a', { href: '#/projects/new', class: 'quiet' }, 'Add project')), items);
}

/** The links on a page: label, address, kind; add, remove, reorder. */
function linkRows(initial = []) {
  const rows = initial.map((l) => ({ label: l.label || '', url: l.url || '', kind: LINK_KINDS.includes(l.kind) ? l.kind : 'page', picked: true }));
  const list = h('div', { class: 'rows links' });
  const render = () => {
    list.replaceChildren(
      ...rows.map((r, i) => {
        const kind = h('select', { 'aria-label': 'Kind', onChange: (e) => ((r.kind = e.target.value), (r.picked = true)) }, ...LINK_KINDS.map((k) => h('option', { value: k, selected: k === r.kind }, k)));
        const url = h('input', {
          type: 'url',
          inputmode: 'url',
          autocapitalize: 'none',
          spellcheck: 'false',
          value: r.url,
          placeholder: 'https://',
          onInput: (e) => {
            r.url = e.target.value;
            if (!r.picked) kind.value = r.kind = guessKind(r.url.trim());
          },
        });
        return h(
          'div',
          { class: 'linkrow' },
          field('Label', input({ value: r.label, placeholder: hostOf(r.url) || '', onInput: (e) => (r.label = e.target.value) })),
          field('Address', url),
          h(
            'div',
            { class: 'kindtools' },
            field('Kind', kind),
            h(
              'div',
              { class: 'tools' },
              h('button', { type: 'button', class: 'textbtn', 'aria-label': 'Move up', disabled: i === 0, onClick: () => { [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; render(); } }, '↑'),
              h('button', { type: 'button', class: 'textbtn', 'aria-label': 'Move down', disabled: i === rows.length - 1, onClick: () => { [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; render(); } }, '↓'),
              h('button', { type: 'button', class: 'textbtn', onClick: () => { rows.splice(i, 1); render(); } }, 'Remove')
            )
          )
        );
      })
    );
  };
  render();
  const add = h(
    'p',
    { class: 'addrow' },
    h('button', { type: 'button', class: 'textbtn', onClick: () => { rows.push({ label: '', url: '', kind: 'page', picked: false }); render(); list.lastChild?.querySelector('input')?.focus(); } }, 'Add a link')
  );
  return {
    el: h('div', {}, list, add),
    /** The links as the page wants them; an empty row is dropped, a half-filled one is an error. */
    read() {
      const out = [];
      for (const r of rows) {
        const url = r.url.trim();
        const label = r.label.trim();
        if (!url && !label) continue;
        if (!/^https?:\/\/\S+$/i.test(url)) throw new Error(label ? `“${label}” needs an address that starts with https://.` : 'Every link needs an address that starts with https://.');
        out.push({ label: label || hostOf(url), url, kind: r.kind });
      }
      return out;
    },
  };
}

/**
 * The images on the public page, by caption, so kept screenshots show as
 * themselves rather than as a name. Best effort: the page may not be built yet.
 */
async function liveThumbs(slug, roll) {
  try {
    const res = await fetch(`/work/${slug}/`, { credentials: 'same-origin' });
    if (!res.ok) return;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    return [...doc.querySelectorAll('.examples img[alt]')].map((img) => {
      const set = (img.getAttribute('srcset') || '').split(',')[0]?.trim().split(/\s+/)[0];
      return { alt: img.getAttribute('alt'), src: set || img.getAttribute('src') };
    });
  } catch {
    return;
  }
}

function editProject(data, p, { pages = null, page = null } = {}) {
  const isNew = !p;
  const q = p || { slug: '', name: '', line: '', status: 'building', when: '', tags: [] };
  const pf = (page && page.fields) || {};

  /* the list: projects.json */
  const name = input({ value: q.name });
  const line = textarea({ rows: 1, value: q.line });
  const why = textarea({ rows: 1, value: q.why || '' });
  const status = h('select', {}, ...STATUSES.map((s) => h('option', { value: s, selected: s === q.status }, s)));
  const when = input({ value: q.when, placeholder: 'Oct 2026', autocapitalize: 'words' });
  const tags = input({ value: (q.tags || []).join(', '), autocapitalize: 'none', placeholder: 'comma, separated' });
  const href = h('input', { type: 'url', value: q.href || '', inputmode: 'url', autocapitalize: 'none' });

  /* the page: src/content/work/<slug>/index.md */
  const summary = textarea({ rows: 1, value: typeof pf.summary === 'string' ? pf.summary : '' });
  const body = textarea({ class: 'words', rows: 8, value: (page && page.body) || '', 'aria-label': 'Words' });
  const links = linkRows(Array.isArray(pf.links) ? pf.links : []);
  const examples = (Array.isArray(pf.examples) ? pf.examples : []).filter((e) => e && typeof e.src === 'string').map((e) => ({ src: e.src, alt: e.caption || '', url: e.url || '' }));
  const roll = photoRoll(examples, { prefix: 'shot', taken: (page && page.files) || [], withUrl: true, wide: true, addLabel: 'Add screenshots', keptLabel: 'On the page' });
  const stopped = textarea({ rows: 1, value: typeof pf.stopped === 'string' ? pf.stopped : '' });

  if (!isNew && examples.length)
    liveThumbs(q.slug).then((found) => {
      for (const e of examples) {
        const hit = (found || []).find((f) => f.alt === e.alt);
        if (hit?.src) roll.thumb(e.src.replace(/^\.\//, ''), hit.src);
      }
    });

  const live = !isNew && page && !page.missing ? h('a', { href: `/work/${q.slug}/`, class: 'quiet' }, `${location.host.replace(/^www\./, '')}/work/${q.slug}/`) : h('span', {}, 'Not written yet');
  const view = h(
    'div',
    { class: 'view' },
    h('div', { class: 'label-row' }, h('a', { href: '#/projects', class: 'quiet back' }, 'Projects'), h('span', { class: 'here' }, isNew ? 'New' : q.name)),
    h('div', { class: 'form' }, field('Name', name), field('Line', line), field('Why', why, { optional: true }), h('div', { class: 'two' }, field('Status', status), field('When', when)), field('Tags', tags), field('Link', href, { optional: true })),
    h('div', { class: 'part' }, h('p', { class: 'group-label' }, 'The page'), h('p', { class: 'small where' }, live)),
    h(
      'div',
      { class: 'form' },
      field('Summary', summary, { optional: true, hint: 'On the page, in place of the line.' }),
      field('Words', body),
      group('Links', links.el, { optional: true }),
      group('Screenshots', roll.el, { optional: true }),
      field('Why it stopped', stopped, { optional: true })
    )
  );
  const bar = saveBar('Save', async (say) => {
    if (!name.value.trim() || !line.value.trim() || !when.value.trim()) throw new Error('A name, a line and a when, please.');
    const pageLinks = links.read();
    const next = {
      slug: q.slug || slugify(name.value) || 'project',
      name: name.value.trim(),
      line: line.value.trim(),
      why: why.value.trim() || undefined,
      status: status.value,
      when: when.value.trim(),
      tags: tags.value.split(',').map((s) => s.trim()).filter(Boolean),
      href: href.value.trim() || undefined,
    };
    if (isNew) {
      /* never a slug that's in the list or already has a folder */
      const taken = new Set([...data.map((x) => x.slug), ...(pages || [])]);
      let s = next.slug;
      for (let n = 2; taken.has(s); n++) s = `${next.slug}-${n}`;
      next.slug = s;
    }
    if (roll.pending()) say('Waiting for the screenshots…');
    const shots = await roll.ready();

    /* the list, changed in a copy so a failed save can be tried again */
    const entry = { ...(p || {}), ...next };
    for (const k of ['why', 'href']) if (entry[k] === undefined) delete entry[k];
    const list = isNew ? [entry, ...data] : data.map((x) => (x === p ? entry : x));

    const dir = `src/content/work/${next.slug}`;
    const fields = {
      summary: summary.value.trim() || undefined,
      links: pageLinks,
      examples: shots.map((s) => ({ src: `./${s.name}`, caption: s.alt, ...(s.url ? { url: s.url } : {}) })),
      stopped: stopped.value.trim() || undefined,
    };
    const files = [
      { path: `${dir}/index.md`, work: { fields, body: body.value } },
      { path: PROJECTS, text: JSON.stringify(list, null, 2) + '\n' },
      ...shots.filter((s) => s.sha).map((s) => ({ path: `${dir}/${s.name}`, sha: s.sha })),
    ];
    const deletes = roll.removed().map((n) => `${dir}/${n}`);
    /* 40 a commit, one kept for the log line the server adds (records.ts) */
    if (files.length + deletes.length > 39) throw new Error('Too many files for one save; add fewer screenshots at a time.');
    say('Saving…');
    const { url } = await api('commit', { message: `${isNew ? 'new project' : 'projects'}, ${next.name}`, files, deletes });
    view.replaceChildren(view.firstChild, done({ url, again: '#/projects', againLabel: 'Projects' }));
  });
  view.append(bar);
  view.run = bar.run;
  return view;
}


/* ---------- the router ---------- */

/* the old Write and Trip rooms are the composer now; their drafts come over on first open */
const toNew = () => {
  location.replace('#/new');
  return h('div', { class: 'view' });
};
const ROUTES = { '': viewHome, new: viewNew, write: toNew, trip: toNew, posts: viewPosts, taste: viewTaste, now: viewNow, projects: viewProjects };
let current = null;

async function route() {
  const view = $('#view');
  if (!view) return;
  const [, name = '', rest = ''] = /^#\/([a-z]*)\/?(.*)$/.exec(location.hash) || [];
  const fn = ROUTES[name] || viewHome;
  relight('');
  view.replaceChildren(loading());
  try {
    const remembered = recentDone();
    current = remembered ? h('div', { class: 'view' }, crumb(name ? name[0].toUpperCase() + name.slice(1) : 'Tend'), doneView(remembered)) : await fn(rest ? decodeURIComponent(rest) : undefined);
    view.replaceChildren(current);
  } catch (e) {
    view.replaceChildren(h('div', { class: 'view' }, crumb(name || 'Tend'), h('p', { class: 'quietline err' }, e?.message || 'Didn’t work.')));
  }
  window.scrollTo(0, 0);
}

function login() {
  const form = $('#login');
  if (!form) return;
  const status = $('.status', form);
  const btn = $('button', form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    status.textContent = '';
    try {
      await api('login', { passphrase: form.passphrase.value });
      location.reload();
    } catch (err) {
      status.textContent = err?.status === 401 ? 'No.' : 'Didn’t work.';
      btn.disabled = false;
      form.passphrase.select();
    }
  });
}

if ($('#login')) login();
else {
  addEventListener('hashchange', route);
  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && current?.run) {
      e.preventDefault();
      current.run();
    }
  });
  route();
}
