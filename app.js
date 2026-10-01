'use strict';

/* Box Pasti: who needs their meal boxed at the current service.
   Static page for GitHub Pages, with data in Supabase (see supabase/schema.sql). */

// Paste your Supabase project values here (Supabase → Project Settings → API).
// While they are empty the page runs in demo mode: data stays in this browser only.
const SUPABASE_URL = 'https://fmzimevpuzaodixruvzb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bFo-V9pQnzcbhSKbSwwG2Q_zfO37rhH';

const TZ = 'Europe/Rome';
const LUNCH_ENDS = 15 * 60;            // minutes after midnight, Rome time
const DINNER_ENDS = 21 * 60 + 30;
const KEEP_OVERRIDES_DAYS = 7;
const QR_BUCKET = 'qr';
const JSQR_SRC = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
const MEALS = [['L', 'Lunch'], ['D', 'Dinner']];

// Made-up people, only used to fill demo mode.
// The live database is seeded by supabase/seed.local.sql (kept out of git).
const DEMO_SEED = [
  ['Bianchi Luca', 'Thu:L'],
  ['Bruno Matteo', 'Mon:L Fri:L'],
  ['Colombo Davide', 'Thu:L Fri:L'],
  ['Conti Paolo', 'Thu:L Fri:L'],
  ['De Luca Marta', ''],
  ['Esposito Marco', 'Tue:L Wed:L'],
  ['Ferrari Anna', 'Tue:L Wed:L Thu:L Fri:L'],
  ['Gallo Federica', 'Wed:L Thu:L Fri:L'],
  ['Greco Elisa', 'Wed:L Thu:L Fri:L'],
  ['Marino Andrea', 'Mon:D Wed:L Wed:D Thu:L Fri:L'],
  ['Moretti Sara', 'Thu:L Fri:L'],
  ['Ricci Sofia', 'Tue:L Wed:L'],
  ['Romano Chiara', 'Wed:L Thu:L Fri:L'],
  ['Rossi Giulia', 'Mon:L Tue:L Wed:L Thu:L Fri:L'],
  ['Villa Tommaso', 'Mon:D Wed:D']
];

const PEN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"></path></svg>';
const CHECK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';
const DONE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';

const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fold(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/* ---------------------------------------------------------------- Time --- */

// Wall-clock time in Rome, whatever the phone's timezone.
// For testing, ?at=2026-10-01T16:00 pretends it is that Rome time.
function romeParts() {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(new URLSearchParams(location.search).get('at') || '');
  if (m) return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
  const p = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
  return { y: +p.year, mo: +p.month, d: +p.day, h: (+p.hour) % 24, mi: +p.minute };
}

// Dates below are UTC-midnight values standing in for Rome calendar days.
function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function currentService() {
  const r = romeParts();
  const date = new Date(Date.UTC(r.y, r.mo - 1, r.d));
  const t = r.h * 60 + r.mi;
  let meal = 'L';
  if (t >= DINNER_ENDS) date.setUTCDate(date.getUTCDate() + 1);
  else if (t >= LUNCH_ENDS) meal = 'D';
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
    meal = 'L';
  }
  const day = DAYS[date.getUTCDay() - 1];
  return {
    key: ymd(date) + '-' + meal,
    day: day,
    meal: meal,
    dayFull: DAY_FULL[day],
    mealLabel: meal === 'L' ? 'lunch' : 'dinner',
    dateLabel: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }),
    reset: meal === 'L' ? '15:00' : '21:30'
  };
}

// Overrides with a key before this date are stale and can be deleted.
function pruneBeforeKey() {
  const r = romeParts();
  return ymd(new Date(Date.UTC(r.y, r.mo - 1, r.d - KEEP_OVERRIDES_DAYS)));
}

/* ------------------------------------------------------------ Schedule --- */

function emptySched() {
  const s = {};
  DAYS.forEach((d) => { s[d] = { L: false, D: false }; });
  return s;
}

function normSched(raw) {
  const s = emptySched();
  if (raw && typeof raw === 'object') {
    DAYS.forEach((d) => {
      if (raw[d]) { s[d].L = !!raw[d].L; s[d].D = !!raw[d].D; }
    });
  }
  return s;
}

function parseSeedSched(str) {
  const s = emptySched();
  str.split(' ').filter(Boolean).forEach((t) => {
    const [d, m] = t.split(':');
    s[d][m] = true;
  });
  return s;
}

function hasAny(s) {
  return DAYS.some((d) => s[d].L || s[d].D);
}

function summary(s) {
  const parts = [];
  MEALS.forEach(([m, label]) => {
    const days = DAYS.filter((d) => s[d][m]);
    if (days.length) parts.push(label + ' ' + days.join(', '));
  });
  return parts.join(' · ');
}

function isNatural(p, svc) {
  return !!(p.recurring && p.sched[svc.day][svc.meal]);
}

/* -------------------------------------------------------------- Stores --- */

function supabaseStore() {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const check = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  const pathOf = (url) => {
    const marker = '/object/public/' + QR_BUCKET + '/';
    const i = url ? url.indexOf(marker) : -1;
    return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
  };

  return {
    live: true,
    async loadPeople() {
      return check(await sb.from('people').select('id,name,qr_url,recurring,schedule'));
    },
    async loadOverrides(key) {
      return check(await sb.from('overrides').select('person_id,state').eq('service_key', key));
    },
    async addPerson(row) {
      check(await sb.from('people').insert(row));
    },
    async updatePerson(id, row) {
      check(await sb.from('people').update(row).eq('id', id));
    },
    async removePerson(id) {
      check(await sb.from('people').delete().eq('id', id));
    },
    async setOverride(key, personId, st) {
      check(await sb.from('overrides').upsert({ service_key: key, person_id: personId, state: st }));
    },
    async clearOverride(key, personId) {
      check(await sb.from('overrides').delete().eq('service_key', key).eq('person_id', personId));
    },
    async loadBoxed(key) {
      return check(await sb.from('boxed').select('person_id').eq('service_key', key));
    },
    async markBoxed(key, personIds) {
      check(await sb.from('boxed').upsert(personIds.map((id) => ({ service_key: key, person_id: id }))));
    },
    async unmarkBoxed(key, personIds) {
      check(await sb.from('boxed').delete().eq('service_key', key).in('person_id', personIds));
    },
    async prune(beforeKey) {
      check(await sb.from('overrides').delete().lt('service_key', beforeKey));
      check(await sb.from('boxed').delete().lt('service_key', beforeKey));
    },
    async uploadQr(blob) {
      const path = uid() + '.png';
      check(await sb.storage.from(QR_BUCKET).upload(path, blob, { contentType: 'image/png', cacheControl: '31536000' }));
      return sb.storage.from(QR_BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async deleteQr(url) {
      const path = pathOf(url);
      if (path) check(await sb.storage.from(QR_BUCKET).remove([path]));
    },
    subscribe(onChange) {
      sb.channel('box-pasti')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'overrides' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'boxed' }, onChange)
        .subscribe();
    }
  };
}

// Same interface, kept in localStorage. Lets you try the page before Supabase is set up.
function demoStore() {
  const KEY = 'boxpasti-demo-v1';
  let mem = null;

  const data = () => {
    if (!mem) {
      try { mem = JSON.parse(localStorage.getItem(KEY)); } catch (e) { mem = null; }
      if (!mem || !Array.isArray(mem.people)) {
        mem = {
          people: DEMO_SEED.map(([name, sched]) => ({
            id: uid(), name: name, qr_url: null, recurring: !!sched, schedule: parseSeedSched(sched)
          })),
          overrides: [],
          boxed: []
        };
        persist();
      }
      if (!Array.isArray(mem.boxed)) mem.boxed = [];
    }
    return mem;
  };
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode or full: keep in memory */ }
  };
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const dropOverride = (key, personId) => {
    data().overrides = data().overrides.filter((o) => !(o.service_key === key && o.person_id === personId));
  };

  return {
    live: false,
    async loadPeople() { return copy(data().people); },
    async loadOverrides(key) { return copy(data().overrides.filter((o) => o.service_key === key)); },
    async addPerson(row) { data().people.push(Object.assign({ id: uid() }, copy(row))); persist(); },
    async updatePerson(id, row) {
      const p = data().people.find((x) => x.id === id);
      if (p) Object.assign(p, copy(row));
      persist();
    },
    async removePerson(id) {
      const d = data();
      d.people = d.people.filter((x) => x.id !== id);
      d.overrides = d.overrides.filter((o) => o.person_id !== id);
      d.boxed = d.boxed.filter((b) => b.person_id !== id);
      persist();
    },
    async setOverride(key, personId, st) {
      dropOverride(key, personId);
      data().overrides.push({ service_key: key, person_id: personId, state: st });
      persist();
    },
    async clearOverride(key, personId) { dropOverride(key, personId); persist(); },
    async loadBoxed(key) { return copy(data().boxed.filter((b) => b.service_key === key)); },
    async markBoxed(key, personIds) {
      const d = data();
      d.boxed = d.boxed.filter((b) => !(b.service_key === key && personIds.includes(b.person_id)));
      personIds.forEach((id) => d.boxed.push({ service_key: key, person_id: id }));
      persist();
    },
    async unmarkBoxed(key, personIds) {
      data().boxed = data().boxed.filter((b) => !(b.service_key === key && personIds.includes(b.person_id)));
      persist();
    },
    async prune(beforeKey) {
      data().overrides = data().overrides.filter((o) => o.service_key >= beforeKey);
      data().boxed = data().boxed.filter((b) => b.service_key >= beforeKey);
      persist();
    },
    uploadQr(blob) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      });
    },
    async deleteQr() {},
    subscribe(onChange) {
      window.addEventListener('storage', (e) => {
        if (e.key === KEY) { mem = null; onChange(); }
      });
    }
  };
}

/* --------------------------------------------------------------- State --- */

const state = {
  people: [],
  overrides: {},          // person id → 'box' | 'unbox', for the current service only
  boxed: new Set(),       // person ids the kitchen has marked as boxed, for the current service only
  svc: currentService(),
  query: '',
  tab: 'box',
  loaded: false
};

let store = null;
let loadSeq = 0;
let refreshTimer = null;
let toBoxIds = [];        // everyone on To box for this meal, ignoring the search
let qrPersonId = null;    // whose QR is enlarged

async function refresh() {
  const seq = ++loadSeq;
  const key = state.svc.key;
  try {
    const [people, ovs, boxed] = await Promise.all([store.loadPeople(), store.loadOverrides(key), store.loadBoxed(key)]);
    if (seq !== loadSeq) return;
    state.people = people.map((p) => ({
      id: p.id, name: p.name, qrUrl: p.qr_url, recurring: !!p.recurring, sched: normSched(p.schedule)
    }));
    state.overrides = {};
    ovs.forEach((o) => { state.overrides[o.person_id] = o.state; });
    state.boxed = new Set(boxed.map((b) => b.person_id));
    state.loaded = true;
  } catch (e) {
    console.error(e);
    if (seq === loadSeq) toast('Couldn’t load the list. Check your connection.');
  }
  render();
}

function refreshSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 250);
}

// Moves to the next service when the clock passes 15:00 / 21:30.
function tick(force) {
  const svc = currentService();
  if (svc.key !== state.svc.key) {
    state.svc = svc;
    state.overrides = {};
    state.boxed = new Set();
    render();
    refresh();
  } else if (force) {
    refresh();
  }
}

async function setBoxed(p, want) {
  const key = state.svc.key;
  const natural = isNatural(p, state.svc);
  const prev = state.overrides[p.id];
  // Moving someone between lists drops the kitchen's mark, so a new box shows up unmarked.
  const wasMarked = state.boxed.delete(p.id);
  if (want === natural) delete state.overrides[p.id];
  else state.overrides[p.id] = want ? 'box' : 'unbox';
  render();
  toast(want ? p.name + ' moved to To box' : p.name + ' moved to Not boxed');
  try {
    if (want === natural) await store.clearOverride(key, p.id);
    else await store.setOverride(key, p.id, state.overrides[p.id]);
    if (wasMarked) await store.unmarkBoxed(key, [p.id]);
  } catch (e) {
    console.error(e);
    if (prev) state.overrides[p.id] = prev; else delete state.overrides[p.id];
    if (wasMarked) state.boxed.add(p.id);
    render();
    toast('Couldn’t save that. Try again.');
  }
}

// The kitchen's mark: this person's meal is already boxed for the current service.
async function setMarked(ids, on) {
  if (!ids.length) return;
  const key = state.svc.key;
  ids.forEach((id) => { if (on) state.boxed.add(id); else state.boxed.delete(id); });
  render();
  try {
    if (on) await store.markBoxed(key, ids);
    else await store.unmarkBoxed(key, ids);
  } catch (e) {
    console.error(e);
    if (key === state.svc.key) {
      ids.forEach((id) => { if (on) state.boxed.delete(id); else state.boxed.add(id); });
      render();
    }
    toast('Couldn’t save that. Try again.');
  }
}

/* -------------------------------------------------------------- Render --- */

let lastBoxHtml = null;
let lastNotHtml = null;

function markBtnHtml(p, done) {
  const label = esc(p.name) + (done ? ': boxed. Tap to undo' : ': mark as boxed');
  return `<button class="btn-mark" data-action="mark" data-id="${esc(p.id)}" aria-pressed="${done}" aria-label="${label}">${done ? DONE_ICON + 'Boxed' : 'Mark boxed'}</button>`;
}

function cardHtml({ p, ov }) {
  const svc = state.svc;
  const done = state.boxed.has(p.id);
  const reason = ov === 'box' ? 'Added for this meal' : 'Every ' + svc.dayFull + ' ' + svc.mealLabel;
  const stamp = done ? `<span class="stamp" aria-hidden="true">${DONE_ICON}Boxed</span>` : '';
  const qr = p.qrUrl
    ? `<button class="card-qr" data-action="qr" data-id="${esc(p.id)}" aria-label="Enlarge QR for ${esc(p.name)}"><img src="${esc(p.qrUrl)}" alt="" loading="lazy" decoding="async">${stamp}</button>`
    : `<button class="card-qr" data-action="edit" data-id="${esc(p.id)}" aria-label="Add a QR for ${esc(p.name)}"><span class="no-qr">No QR yet<strong>Add it</strong></span>${stamp}</button>`;
  return `<div class="card${done ? ' is-done' : ''}">${qr}
    <div class="card-body">
      <div class="card-name">${esc(p.name)}</div>
      <div class="reason">${esc(reason)}</div>
      <div class="card-actions">
        ${markBtnHtml(p, done)}
        <div class="card-row">
          <button class="btn-unbox" data-action="unbox" data-id="${esc(p.id)}">Unbox</button>
          <button class="btn-icon" data-action="edit" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.name)}">${PEN_ICON}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function rowHtml({ p, ov }) {
  let reason;
  if (ov === 'unbox') reason = 'Skipping the box this time';
  else if (!hasAny(p.sched)) reason = 'No weekly schedule';
  else if (!p.recurring) reason = 'Weekly schedule paused';
  else reason = 'Weekly: ' + summary(p.sched);
  return `<div class="row">
    <div class="row-main">
      <div class="row-name">${esc(p.name)}</div>
      <div class="reason">${esc(reason)}</div>
    </div>
    <button class="btn-icon" data-action="edit" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.name)}">${PEN_ICON}</button>
    <button class="btn-boxme" data-action="box" data-id="${esc(p.id)}">Box me</button>
  </div>`;
}

function render() {
  const svc = state.svc;
  $('resetTime').textContent = svc.reset;
  $('dateLabel').textContent = svc.dateLabel;
  $('mealTitle').textContent = svc.dayFull + ' ' + svc.mealLabel;

  const q = fold(state.query.trim());
  const boxed = [];
  const notBoxed = [];
  toBoxIds = [];
  state.people.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => {
    const ov = state.overrides[p.id];
    const inBox = ov ? ov === 'box' : isNatural(p, svc);
    if (inBox) toBoxIds.push(p.id);
    if (q && fold(p.name).indexOf(q) === -1) return;
    (inBox ? boxed : notBoxed).push({ p: p, ov: ov });
  });
  // Still to box first; the ones the kitchen has marked sink to the bottom.
  boxed.sort((a, b) => state.boxed.has(a.p.id) - state.boxed.has(b.p.id));

  const doneCount = toBoxIds.filter((id) => state.boxed.has(id)).length;
  const allDone = doneCount === toBoxIds.length;
  $('kitchenBar').hidden = !toBoxIds.length;
  $('doneCount').textContent = doneCount + ' of ' + toBoxIds.length;
  $('doneFill').style.width = (toBoxIds.length ? 100 * doneCount / toBoxIds.length : 0) + '%';
  $('allBtn').disabled = allDone;
  $('allBtn').innerHTML = DONE_ICON + (allDone ? 'All boxed' : 'Mark all boxed');

  const onBox = state.tab === 'box';
  $('tabBox').classList.toggle('is-active', onBox);
  $('tabNot').classList.toggle('is-active', !onBox);
  $('tabBox').setAttribute('aria-pressed', String(onBox));
  $('tabNot').setAttribute('aria-pressed', String(!onBox));
  $('countBox').textContent = boxed.length;
  $('countNot').textContent = notBoxed.length;
  $('panelBox').hidden = !onBox;
  $('panelNot').hidden = onBox;

  const boxHtml = boxed.map(cardHtml).join('');
  if (boxHtml !== lastBoxHtml) { $('boxGrid').innerHTML = boxHtml; lastBoxHtml = boxHtml; }
  $('boxGrid').hidden = !boxed.length;
  $('boxEmpty').hidden = boxed.length > 0;
  $('boxEmpty').textContent = !state.loaded ? 'Loading…'
    : q ? 'No match on the box list.' : 'Nobody needs a box for this meal yet.';

  const notHtml = notBoxed.map(rowHtml).join('');
  if (notHtml !== lastNotHtml) { $('notList').innerHTML = notHtml; lastNotHtml = notHtml; }
  $('notEmpty').hidden = notBoxed.length > 0;
  $('notEmpty').textContent = !state.loaded ? 'Loading…'
    : q ? 'No match.' : 'Everyone is on the box list.';

  if (!$('qrSheet').hidden) {
    const p = state.people.find((x) => x.id === qrPersonId);
    $('qrMark').innerHTML = p && toBoxIds.includes(p.id) ? markBtnHtml(p, state.boxed.has(p.id)) : '';
  }
}

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ------------------------------------------------------------- Sheets --- */

let returnFocus = null;

function openSheet(el, opener) {
  returnFocus = opener || document.activeElement;
  el.hidden = false;
  document.body.classList.add('locked');
}

function closeSheet(el) {
  if (el.hidden) return;
  el.hidden = true;
  document.body.classList.remove('locked');
  if (el === $('formSheet')) resetDraft();
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  returnFocus = null;
}

function openQr(p, opener) {
  $('qrImgWrap').innerHTML = `<img src="${esc(p.qrUrl)}" alt="QR code for ${esc(p.name)}">`;
  $('qrName').textContent = p.name;
  qrPersonId = p.id;
  openSheet($('qrSheet'), opener);
  render();
  $('qrSheet').querySelector('[data-close]').focus();
}

/* --------------------------------------------------------------- Form --- */

let draft = null;
let saving = false;

function resetDraft() {
  if (draft && draft.preview) URL.revokeObjectURL(draft.preview);
  draft = null;
}

function openForm(p, opener) {
  resetDraft();
  draft = p
    ? { id: p.id, name: p.name, qrUrl: p.qrUrl, blob: null, preview: null, recurring: p.recurring, sched: normSched(p.sched) }
    : { id: null, name: '', qrUrl: null, blob: null, preview: null, recurring: false, sched: emptySched() };
  $('fName').value = draft.name;
  setNote('A screenshot of the QR from the meal app.', false);
  showErr('');
  updateForm();
  openSheet($('formSheet'), opener);
  $('formSheet').querySelector('.sheet-form').scrollTop = 0;
  if (!p) $('fName').focus();
}

function buildSchedGrid() {
  let html = '<span></span>' + DAYS.map((d) => `<span class="sched-day">${d}</span>`).join('');
  MEALS.forEach(([m, label]) => {
    html += `<span class="sched-label">${label}</span>`;
    DAYS.forEach((d) => {
      html += `<button type="button" class="chip" data-day="${d}" data-meal="${m}" aria-pressed="false" aria-label="${DAY_FULL[d]} ${label.toLowerCase()}">${CHECK_ICON}</button>`;
    });
  });
  $('fGrid').innerHTML = html;
}

function updateForm() {
  const d = draft;
  $('formTitle').textContent = d.id ? 'Edit your entry' : 'Add yourself';
  const src = d.preview || d.qrUrl;
  const prev = $('fQrPreview');
  prev.classList.toggle('is-empty', !src);
  prev.innerHTML = src ? `<img src="${esc(src)}" alt="Your uploaded QR">` : 'No QR yet';
  $('uploadLabel').textContent = src ? 'Replace QR' : 'Upload QR';
  $('fRec').setAttribute('aria-checked', String(d.recurring));
  $('fGrid').classList.toggle('is-off', !d.recurring);
  $('fGrid').querySelectorAll('.chip').forEach((b) => {
    b.setAttribute('aria-pressed', String(!!d.sched[b.dataset.day][b.dataset.meal]));
    b.disabled = !d.recurring;
  });
  $('fRemove').hidden = !d.id;
}

function setNote(text, warn) {
  $('fQrNote').textContent = text;
  $('fQrNote').classList.toggle('is-warn', !!warn);
}

function showErr(msg) {
  $('fErr').textContent = msg;
  $('fErr').hidden = !msg;
}

async function onFile(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file || !draft) return;
  const forDraft = draft;
  const upload = $('fFile').closest('.upload');
  upload.classList.add('is-busy');
  setNote('Reading the image…', false);
  try {
    const out = await prepareQr(file);
    if (draft !== forDraft) return;
    if (draft.preview) URL.revokeObjectURL(draft.preview);
    draft.blob = out.blob;
    draft.preview = URL.createObjectURL(out.blob);
    showErr('');
    if (out.found) setNote('Found your QR and cropped it.', false);
    else setNote('Couldn’t spot a QR in that image. Crop the screenshot to just the code if you can.', true);
    updateForm();
  } catch (err) {
    console.error(err);
    setNote('A screenshot of the QR from the meal app.', false);
    showErr('That image couldn’t be read. Try a PNG or JPG screenshot.');
  } finally {
    upload.classList.remove('is-busy');
  }
}

async function onSave(e) {
  e.preventDefault();
  if (!draft || saving) return;
  const d = draft;
  const name = $('fName').value.trim().replace(/\s+/g, ' ');
  if (!name) { showErr('Add your name first.'); $('fName').focus(); return; }
  if (!d.id && !d.blob) { showErr('Upload your QR so the kitchen can scan it.'); return; }

  saving = true;
  $('fSave').disabled = true;
  $('fSave').textContent = 'Saving…';
  try {
    let qrUrl = d.qrUrl;
    if (d.blob) qrUrl = await store.uploadQr(d.blob);
    const row = { name: name, qr_url: qrUrl, recurring: d.recurring && hasAny(d.sched), schedule: d.sched };
    if (d.id) await store.updatePerson(d.id, row);
    else await store.addPerson(row);
    if (d.blob && d.qrUrl) store.deleteQr(d.qrUrl).catch(console.error);
    closeSheet($('formSheet'));
    toast(d.id ? 'Saved' : 'You’re on the list');
    refresh();
  } catch (err) {
    console.error(err);
    showErr('Couldn’t save. Check your connection and try again.');
  } finally {
    saving = false;
    $('fSave').disabled = false;
    $('fSave').textContent = 'Save';
  }
}

async function onRemove() {
  if (!draft || !draft.id || saving) return;
  const d = draft;
  const p = state.people.find((x) => x.id === d.id);
  if (!window.confirm('Remove ' + (p ? p.name : 'this entry') + ' from the list?')) return;
  saving = true;
  try {
    await store.removePerson(d.id);
    if (d.qrUrl) store.deleteQr(d.qrUrl).catch(console.error);
    closeSheet($('formSheet'));
    toast('Removed');
    refresh();
  } catch (err) {
    console.error(err);
    showErr('Couldn’t remove. Check your connection and try again.');
  } finally {
    saving = false;
  }
}

/* --------------------------------------------------------- QR images --- */

let jsQRPromise = null;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!jsQRPromise) {
    jsQRPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSQR_SRC;
      s.onload = () => (window.jsQR ? resolve(window.jsQR) : reject(new Error('jsQR missing')));
      s.onerror = () => { jsQRPromise = null; reject(new Error('jsQR failed to load')); };
      document.head.appendChild(s);
    });
  }
  return jsQRPromise;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img: img, url: url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unreadable image')); };
    img.src = url;
  });
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Finds the QR in a screenshot and returns a square crop around it (with a quiet zone).
async function findQrBox(img) {
  let jsQR;
  try { jsQR = await loadJsQR(); } catch (e) { return null; }
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const first = Math.min(1, 1200 / Math.max(w0, h0));
  const scales = first < 1 && w0 * h0 <= 6e6 ? [first, 1] : [first];
  for (const s of scales) {
    const w = Math.round(w0 * s);
    const h = Math.round(h0 * s);
    const ctx = canvasOf(w, h).getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
    if (!code) continue;
    const loc = code.location;
    const pts = [loc.topLeftCorner, loc.topRightCorner, loc.bottomLeftCorner, loc.bottomRightCorner];
    const xs = pts.map((pt) => pt.x / s);
    const ys = pts.map((pt) => pt.y / s);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    const size = Math.max(maxX - minX, maxY - minY);
    const side = Math.min(size * 1.2, w0, h0);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return {
      x: Math.max(0, Math.min(w0 - side, cx - side / 2)),
      y: Math.max(0, Math.min(h0 - side, cy - side / 2)),
      side: side
    };
  }
  return null;
}

// Crops to the QR when it can find one, downscales, and re-encodes as PNG.
async function prepareQr(file) {
  const { img, url } = await loadImage(file);
  try {
    const box = await findQrBox(img);
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight, max = 800;
    if (box) { sx = box.x; sy = box.y; sw = box.side; sh = box.side; max = 400; }
    const scale = Math.min(1, max / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const c = canvasOf(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    const blob = await new Promise((resolve, reject) => {
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/png');
    });
    return { blob: blob, found: !!box };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* --------------------------------------------------------------- Init --- */

function bindEvents() {
  $('search').addEventListener('input', (e) => { state.query = e.target.value; render(); });
  $('tabBox').addEventListener('click', () => { state.tab = 'box'; render(); });
  $('tabNot').addEventListener('click', () => { state.tab = 'not'; render(); });
  $('addBtn').addEventListener('click', (e) => openForm(null, e.currentTarget));

  $('main').addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const p = state.people.find((x) => x.id === b.dataset.id);
    if (!p) return;
    if (b.dataset.action === 'qr') openQr(p, b);
    else if (b.dataset.action === 'edit') openForm(p, b);
    else if (b.dataset.action === 'box') setBoxed(p, true);
    else if (b.dataset.action === 'unbox') setBoxed(p, false);
    else if (b.dataset.action === 'mark') setMarked([p.id], !state.boxed.has(p.id));
  });
  $('allBtn').addEventListener('click', () => {
    setMarked(toBoxIds.filter((id) => !state.boxed.has(id)), true);
    toast('All marked as boxed');
  });
  $('qrMark').addEventListener('click', (e) => {
    const b = e.target.closest('[data-action="mark"]');
    if (b) setMarked([b.dataset.id], !state.boxed.has(b.dataset.id));
  });

  ['qrSheet', 'formSheet'].forEach((id) => {
    const el = $(id);
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-close]')) closeSheet(el);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeSheet($('qrSheet'));
    closeSheet($('formSheet'));
  });

  $('fName').addEventListener('input', () => showErr(''));
  $('fFile').addEventListener('change', onFile);
  $('fRec').addEventListener('click', () => {
    if (!draft) return;
    draft.recurring = !draft.recurring;
    updateForm();
  });
  $('fGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b || !draft || !draft.recurring) return;
    const slot = draft.sched[b.dataset.day];
    slot[b.dataset.meal] = !slot[b.dataset.meal];
    updateForm();
  });
  $('form').addEventListener('submit', onSave);
  $('fRemove').addEventListener('click', onRemove);

  setInterval(() => tick(false), 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(true); });
}

function init() {
  buildSchedGrid();
  bindEvents();
  render();

  const configured = SUPABASE_URL && SUPABASE_ANON_KEY;
  if (configured && !window.supabase) {
    $('banner').textContent = 'Couldn’t reach the server. Check your connection and reload.';
    $('banner').hidden = false;
    return;
  }
  store = configured ? supabaseStore() : demoStore();
  if (!store.live) {
    $('banner').innerHTML = '<strong>Demo mode.</strong> Changes are saved only in this browser. Add the Supabase URL and key in <code>app.js</code> to share the list.';
    $('banner').hidden = false;
  }

  refresh();
  store.prune(pruneBeforeKey()).catch(console.error);
  store.subscribe(refreshSoon);
}

init();
