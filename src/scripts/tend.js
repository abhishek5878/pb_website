/*
 * /tend: the publishing room (docs/design/tend-spec.md).
 *
 * One page, hash routes: #/ home · #/write · #/trip · #/taste · #/now ·
 * #/projects · #/projects/<slug> · #/posts · #/posts/<id>. Every save is one
 * POST to /api/tend/commit/; photos are shrunk on a canvas here (which drops
 * EXIF and GPS), uploaded one blob each with progress, then named in the same
 * commit. A project is one editor for its line in projects.json and its page,
 * src/content/work/<slug>/index.md, saved together.
 * UI words only: nothing in this file writes in his voice.
 */

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
const WRITE_KINDS = ['note', 'essay', 'poem', 'book', 'film', 'listening'];
const ALL_KINDS = ['note', 'essay', 'poem', 'book', 'film', 'listening', 'trip', 'photo', 'link', 'video', 'mix', 'build'];
/* The lanes of /writing/ (src/content.config.ts LANES): none, or one of the three. */
const LANES = [
  { value: '', label: 'none' },
  { value: 'night', label: 'night' },
  { value: 'signal', label: 'signal' },
  { value: 'build', label: 'build' },
];
const REVIEW = new Set(['book', 'film', 'listening']);
const PHOTO = new Set(['trip', 'photo']);

/* ---------- pieces ---------- */

const crumb = (name) =>
  h('div', { class: 'label-row' }, h('a', { href: '#/', class: 'quiet back' }, 'Tend'), h('span', { class: 'here' }, name));

function field(label, control, { optional = false, hint = '' } = {}) {
  const fl = h('span', { class: 'fl' }, label, optional && h('span', { class: 'opt' }, 'optional'));
  return h('label', { class: 'field' }, fl, control, hint && h('span', { class: 'hint' }, hint));
}

/** A named set of controls (links, screenshots): a group, not a label, so a tap on its name focuses nothing. */
function group(label, control, { optional = false } = {}) {
  const fl = h('span', { class: 'fl' }, label, optional && h('span', { class: 'opt' }, 'optional'));
  return h('div', { class: 'field', role: 'group', 'aria-label': label }, fl, control);
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
  const links = h(
    'p',
    { class: 'links' },
    url && h('a', { href: url }, `${site}${url}`),
    again && h('a', { href: again, class: 'quiet' }, againLabel || 'Another'),
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
 * maps a kept file to an image of it, `wide` lays them out one per row.
 */
function photoRoll(existing = [], { prefix = 'photo', taken = [], withUrl = false, thumbs = {}, wide = false, addLabel = 'Add photos', keptLabel = 'In the post' } = {}) {
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
    for (const file of files) {
      const s = { name: `${prefix}-${next++}.jpg`, alt: '', url: '', sha: null, state: 'shrinking', file };
      shots.push(s);
      render();
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

/* ---------- the post form (Write, Trip, Posts) ---------- */

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

/**
 * One form for every post. `kinds`: the kinds offered; `initial`: { fields, body };
 * `photos`: whether the roll shows; `draftKey`: autosave slot (new posts only).
 */
function postForm({ kinds, initial = {}, photos = false, draftKey }) {
  const f = { ...(initial.fields || {}) };
  let kind = kinds.includes(f.kind) ? f.kind : kinds[0];
  const v = (k) => (f[k] == null ? '' : String(f[k]));

  const title = input({ value: v('title'), placeholder: '' });
  const subtitle = input({ value: v('subtitle') });
  const date = h('input', { type: 'date', value: v('date') || today(), required: true });
  const place = input({ value: v('place') });
  const subject = input({ value: v('subject') });
  const by = input({ value: v('by') });
  const year = h('input', { type: 'number', inputmode: 'numeric', min: 1800, max: 2100, value: v('year') });
  const rating = h(
    'select',
    {},
    h('option', { value: '' }, '–'),
    ...[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((r) => h('option', { value: String(r), selected: f.rating === r }, `${stars(r)}  ${r}`))
  );
  const body = textarea({ class: 'words', rows: 8, value: initial.body || '', 'aria-label': 'Words' });
  const pull = textarea({ rows: 2, value: (f.pull || []).join('\n'), placeholder: 'One per line, his exact words from the piece' });
  const tags = input({ value: (f.tags || []).join(', '), autocapitalize: 'none', placeholder: 'comma, separated' });
  const link = h('input', { type: 'url', value: v('link'), inputmode: 'url', autocapitalize: 'none' });
  const youtube = h('input', { type: 'url', value: v('youtube'), inputmode: 'url', autocapitalize: 'none' });
  const draft = h('input', { type: 'checkbox', checked: f.draft === true });
  const light = lightPicker(v('light'));
  relight(v('light'));
  /* which lane of /writing/ it runs in; a WASP issue with none still counts as signal */
  const lane = pills('lane', LANES, LANES.some((l) => l.value === f.lane) ? f.lane : '', () => {});

  const titleField = field('Title', title);
  const subtitleField = field('Subtitle', subtitle, { optional: true });
  const reviewFields = h('div', { class: 'form' }, field('Subject', subject), h('div', { class: 'two' }, field('By', by), field('Year', year)), field('Rating', rating));
  const placeField = field('Place', place, { optional: true });
  const roll = photos ? photoRoll(f.images || []) : null;
  const linkField = field('Link', link);
  const videoField = field('YouTube', youtube);

  const kindPills = pills('kind', kinds.map((k) => ({ value: k, label: k })), kind, (k) => {
    kind = k;
    show();
  });

  function show() {
    const optional = kind === 'note' || kind === 'photo' || REVIEW.has(kind); /* a review is named by its subject */
    titleField.replaceChildren(h('span', { class: 'fl' }, 'Title', optional && h('span', { class: 'opt' }, 'optional')), title);
    reviewFields.hidden = !REVIEW.has(kind);
    subtitleField.hidden = !(kind === 'essay' || subtitle.value);
    placeField.hidden = !PHOTO.has(kind);
    linkField.hidden = kind !== 'link';
    videoField.hidden = kind !== 'video';
    body.placeholder = kind === 'poem' ? 'Each line a line.' : '';
  }
  show();

  const more = h(
    'details',
    { class: 'more', open: !!(f.light || (f.pull || []).length || f.draft || (f.tags || []).length) },
    h('summary', {}, 'More'),
    h('div', { class: 'form' }, field('Light', light), field('Pull lines', pull), field('Tags', tags), linkField, videoField, h('label', { class: 'check' }, draft, 'Draft (not on the site yet)'))
  );

  const el = h(
    'div',
    { class: 'form' },
    kinds.length > 1 && field('Kind', kindPills),
    titleField,
    subtitleField,
    placeField,
    field('Date', date),
    field('Lane', lane, { optional: true }),
    reviewFields,
    field('Words', body),
    roll && field('Photos', roll.el),
    more
  );

  /* the draft, autosaved so a closed tab costs nothing */
  if (draftKey) {
    let t = 0;
    const save = () => {
      clearTimeout(t);
      t = setTimeout(() => saveDraft(draftKey, { fields: read().fields, body: body.value }), 400);
    };
    el.addEventListener('input', save);
    el.addEventListener('change', save);
  }

  /**
   * The fields as the server wants them. What the form shows is read from its
   * inputs; everything else an existing post carried (canonical, publication,
   * audio, images without a roll, review fields of another kind…) goes back
   * exactly as it came, so an edit never loses a field.
   */
  function read() {
    const fields = {};
    for (const [k, val] of Object.entries(f)) if (val !== undefined && val !== null && val !== '') fields[k] = val;
    Object.assign(fields, { kind, date: date.value, title: title.value.trim() || undefined, subtitle: subtitle.value.trim() || undefined });
    if (PHOTO.has(kind)) fields.place = place.value.trim() || undefined;
    if (REVIEW.has(kind)) {
      fields.subject = subject.value.trim() || undefined;
      fields.by = by.value.trim() || undefined;
      fields.year = year.value ? Number(year.value) : undefined;
      fields.rating = rating.value ? Number(rating.value) : undefined;
    }
    if (kind === 'link') fields.link = link.value.trim() || undefined;
    if (kind === 'video') fields.youtube = youtube.value.trim() || undefined;
    fields.pull = pull.value.split('\n').map((s) => s.trim()).filter(Boolean);
    fields.tags = tags.value.split(',').map((s) => s.trim()).filter(Boolean);
    fields.light = light.value() || undefined;
    fields.lane = lane.value() || undefined;
    fields.draft = draft.checked;
    return { fields, body: body.value };
  }

  return { el, read, roll, kind: () => kind, body };
}

/** Everything a post save needs, from the form: paths, images, the commit. */
async function publishPost(form, { existingPath, existingId, posts, say }) {
  const { fields, body } = form.read();
  if (!fields.date) throw new Error('A date, please.');
  if (!fields.title && fields.kind !== 'note' && fields.kind !== 'photo' && !fields.subject) throw new Error('A title, please.');
  if (REVIEW.has(fields.kind) && !fields.subject) throw new Error('What is it? The subject, please.');
  const photos = form.roll ? form.roll.count() : 0;
  if (!body.trim() && !photos) throw new Error('Nothing to publish yet.');

  let shots = [];
  if (form.roll) {
    if (form.roll.pending()) say('Waiting for the photos…');
    shots = await form.roll.ready();
    fields.images = shots.map((s) => ({ src: `./${s.name}`, alt: s.alt }));
  }

  let id = existingId;
  if (!id) {
    const base = slugify(fields.title) || slugify(fields.subject) || slugify(body.trim().split(/\s+/).slice(0, 6).join(' ')) || fields.kind;
    id = `${fields.date}-${base}`;
    const taken = new Set((posts || []).map((p) => p.id));
    for (let n = 2; taken.has(id); n++) id = `${fields.date}-${base}-${n}`;
  }
  const dir = `src/content/posts/${id}`;
  const folder = shots.length > 0 || (existingPath || '').endsWith('/index.md');
  const mdPath = folder ? `${dir}/index.md` : `${dir}.md`;

  const files = [{ path: mdPath, post: { fields, body } }];
  for (const s of shots) if (s.sha) files.push({ path: `${dir}/${s.name}`, sha: s.sha });
  const deletes = [];
  if (existingPath && existingPath !== mdPath) deletes.push(existingPath);
  if (form.roll) for (const name of form.roll.removed()) deletes.push(`${dir}/${name}`);

  const what = fields.title || fields.subject || fields.kind;
  const message = existingId ? `edit ${what}` : `new ${fields.kind}, ${what}`;
  say('Publishing…');
  return api('commit', { message, files, deletes });
}

/* ---------- views ---------- */

const posts = { list: null, at: 0 };
/** The posts, fetched once a minute at most; new posts check their id against it. */
async function postList(force = false) {
  if (force || !posts.list || Date.now() - posts.at > 60_000) {
    const r = await api('list');
    posts.list = r.posts;
    posts.at = Date.now();
  }
  return posts.list;
}

function viewHome() {
  const choices = [
    ['#/write', 'Write', 'note, essay, poem, review'],
    ['#/trip', 'Trip', 'photos and words'],
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
  return h(
    'div',
    { class: 'view' },
    h('div', { class: 'label-row' }, h('span', {}, 'Tend'), h('time', { class: 'mono', datetime: today() }, fmtDate(today()))),
    h('nav', { class: 'choices', 'aria-label': 'Rooms' }, ...choices.map(([href, name, hint]) => h('a', { href }, h('span', { class: 'name' }, name), hint && h('span', { class: 'hint' }, hint)))),
    h('p', { class: 'out' }, out)
  );
}

function viewWrite() {
  const draft = loadDraft('write');
  const form = postForm({ kinds: WRITE_KINDS, initial: draft || {}, draftKey: 'write' });
  postList().catch(() => {});
  const view = h('div', { class: 'view' }, crumb('Write'), form.el);
  const bar = saveBar('Publish', async (say) => {
    const { url } = await publishPost(form, { posts: await postList().catch(() => []), say });
    dropDraft('write');
    posts.list = null;
    relight('');
    view.replaceChildren(crumb('Write'), done({ url, again: '#/write', againLabel: 'Write another' }));
  });
  if (draft) bar.say('Draft restored.');
  view.append(bar);
  view.run = bar.run;
  return view;
}

function viewTrip() {
  const draft = loadDraft('trip');
  const form = postForm({ kinds: ['trip', 'photo'], initial: draft || {}, photos: true, draftKey: 'trip' });
  postList().catch(() => {});
  const view = h('div', { class: 'view' }, crumb('Trip'), form.el);
  const bar = saveBar('Publish', async (say) => {
    const { url } = await publishPost(form, { posts: await postList().catch(() => []), say });
    dropDraft('trip');
    posts.list = null;
    relight('');
    view.replaceChildren(crumb('Trip'), done({ url, again: '#/trip', againLabel: 'Another trip' }));
  });
  if (draft) bar.say('Draft restored.');
  view.append(bar);
  view.run = bar.run;
  return view;
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
  const kinds = [...new Set([fields.kind, ...ALL_KINDS])].filter(Boolean);
  const form = postForm({ kinds, initial: { fields, body }, photos: PHOTO.has(fields.kind) || (fields.images || []).length > 0 });
  const name = fields.title || fields.subject || id;
  const view = h('div', { class: 'view' }, crumb('Posts'), form.el);
  const del = h(
    'button',
    { type: 'button', class: 'textbtn danger' },
    'Delete'
  );
  const bar = saveBar(
    'Save',
    async (say) => {
      const { url } = await publishPost(form, { existingPath: meta.path, existingId: id, say });
      posts.list = null;
      relight('');
      view.replaceChildren(crumb('Posts'), done({ url, again: '#/posts', againLabel: 'Posts' }));
    },
    del
  );
  del.addEventListener('click', async () => {
    if (!confirm(`Delete “${name}”? It leaves the site with the next deploy.`)) return;
    del.disabled = true;
    bar.say('Deleting…');
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
      bar.say(e.message || 'Didn’t work.', true);
      del.disabled = false;
    }
  });
  view.append(bar);
  view.run = bar.run;
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

/* now: the bubbles */
async function viewNow() {
  const { data } = await api('read', { path: 'src/data/now.json' });
  const rows = data.map((r) => ({ ...r }));
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
  const view = h('div', { class: 'view' }, crumb('Now'), list, add);
  const bar = saveBar('Save', async (say) => {
    const clean = rows.map((r) => ({ verb: r.verb.trim(), short: r.short.trim(), what: r.what.trim() })).filter((r) => r.verb || r.short || r.what);
    if (clean.some((r) => !r.verb || !r.short || !r.what)) throw new Error('Every row needs a verb, a short and a what.');
    say('Saving…');
    const { url } = await api('commit', { message: 'now', files: [{ path: 'src/data/now.json', text: JSON.stringify(clean, null, 2) + '\n' }] });
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
    if (files.length + deletes.length > 40) throw new Error('Too many files for one save; add fewer screenshots at a time.');
    say('Saving…');
    const { url } = await api('commit', { message: `${isNew ? 'new project' : 'projects'}, ${next.name}`, files, deletes });
    view.replaceChildren(view.firstChild, done({ url, again: '#/projects', againLabel: 'Projects' }));
  });
  view.append(bar);
  view.run = bar.run;
  return view;
}

/* ---------- the router ---------- */

const ROUTES = { '': viewHome, write: viewWrite, trip: viewTrip, posts: viewPosts, taste: viewTaste, now: viewNow, projects: viewProjects };
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
