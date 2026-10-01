'use strict';

/* Box Pasti: who needs their meal boxed at the current service.
   Static page for GitHub Pages, with data in Supabase (see supabase/schema.sql). */

// Paste your Supabase project values here (Supabase → Project Settings → API).
// While they are empty the page runs in demo mode: data stays in this browser only.
const SUPABASE_URL = 'https://fmzimevpuzaodixruvzb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bFo-V9pQnzcbhSKbSwwG2Q_zfO37rhH';

// The deploy (.github/workflows/deploy.yml) stamps this and index.html with the same build id.
const BUILD = '__VERSION__';

const TZ = 'Europe/Rome';
const LUNCH_ENDS = 15 * 60;            // minutes after midnight, Rome time
const DINNER_ENDS = 21 * 60 + 30;
const KEEP_OVERRIDES_DAYS = 7;
const QR_BUCKET = 'qr';
const JSQR_SRC = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const JSQR_SRI = 'sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx';

// Upload checks. A phone screenshot is usually 0.5–5 MB and about 1000–3000 px tall.
const QR_MAX_FILE_MB = 10;
const QR_MAX_SIDE = 6000;      // px, longest side of the picture
const QR_MIN_SIDE = 150;       // px, shortest side of the picture
const QR_MIN_CODE = 120;       // px, width of the QR itself, so each square is big enough to scan
// The meal app's QR codes carry an ID like 1b4e28ba-2fa1-11d2-883f-0016d3cca427.
const MEAL_QR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MEALS = ['L', 'D'];
const LANG_KEY = 'boxpasti-lang';

/* ----------------------------------------------------------- Language --- */

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Every piece of visible text, in Italian (the default) and English.
const STRINGS = {
  it: {
    locale: 'it-IT',
    days: { Mon: 'lunedì', Tue: 'martedì', Wed: 'mercoledì', Thu: 'giovedì', Fri: 'venerdì' },
    daysShort: { Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Gio', Fri: 'Ven' },
    meals: { L: 'pranzo', D: 'cena' },
    title: (day, meal) => cap(meal) + ' di ' + day,
    every: (day, meal) => 'Ogni ' + day + ' a ' + meal,
    summaryPart: (meal, days) => cap(meal) + ' ' + days,
    weeklySum: (sum) => 'Ogni settimana: ' + sum,
    htmlDesc: 'Chi ha bisogno del box per il pasto di adesso.',
    langLabel: 'Lingua',
    clears: 'Fino alle',
    now: 'In corso',
    search: 'Cerca il tuo nome',
    tabBox: 'Box da fare',
    tabNot: 'Senza box',
    hintBox: 'Cucina: scansiona ogni QR e prepara il box. Tocca un QR per ingrandirlo.',
    hintNot: 'Ritiri tu il pasto. Non ce la fai? Tocca Fammi il box.',
    foot: (lunch, dinner) => 'Si azzera dopo pranzo (' + lunch + ') e cena (' + dinner + ').',
    addQr: 'Aggiungi il tuo QR',
    close: 'Chiudi',
    kmOpen: 'Modalità cucina: tutti i QR in una pagina',
    kmEyebrow: 'Cucina',
    kmClose: 'Esci dalla modalità cucina',
    kmEmpty: 'Nessun box da fare per questo pasto.',
    doneOf: (done, total) => done + ' di ' + total + ' pronti',
    markAll: 'Segna tutti pronti',
    allDone: 'Tutti pronti',
    allToast: 'Tutti segnati come pronti',
    mark: 'Segna pronto',
    marked: 'Pronto',
    markAria: (name) => name + ': segna come pronto',
    markedAria: (name) => name + ': pronto. Tocca per annullare',
    unbox: 'Niente box',
    boxMe: 'Fammi il box',
    onlyThis: 'Solo per questo pasto',
    skip: 'Niente box questa volta',
    noSched: 'Nessun programma settimanale',
    paused: 'Programma settimanale in pausa',
    noQrYet: 'Nessun QR',
    addIt: 'Aggiungilo',
    enlarge: (name) => 'Ingrandisci il QR di ' + name,
    addQrFor: (name) => 'Aggiungi un QR per ' + name,
    edit: (name) => 'Modifica ' + name,
    qrOf: (name) => 'QR di ' + name,
    movedIn: (name) => name + ': box per questo pasto',
    movedOut: (name) => name + ': niente box per questo pasto',
    loading: 'Caricamento…',
    noMatchBox: 'Nessun risultato tra i box da fare.',
    emptyBox: 'Nessuno ha bisogno del box per questo pasto.',
    noMatch: 'Nessun risultato.',
    emptyNot: 'Sono tutti nella lista dei box.',
    loadErr: 'Impossibile caricare la lista. Controlla la connessione.',
    saveErrShort: 'Impossibile salvare. Riprova.',
    addTitle: 'Aggiungiti',
    editTitle: 'Modifica i tuoi dati',
    yourName: 'Il tuo nome',
    namePh: 'Cognome Nome',
    yourQr: 'Il tuo QR',
    yourQrAlt: 'Il QR che hai caricato',
    upload: 'Carica QR',
    replace: 'Sostituisci QR',
    qrHelp: 'Uno screenshot dell’app dei pasti con il tuo QR, anche a schermo intero (max 10 MB).',
    reading: 'Lettura dell’immagine…',
    found: 'QR trovato, controllato e ritagliato.',
    badImage: 'Impossibile leggere l’immagine. Prova con uno screenshot PNG o JPG.',
    notImage: 'Questo file non è un’immagine. Carica uno screenshot PNG o JPG.',
    tooBig: 'Immagine troppo grande: massimo 10 MB e 6000 px per lato.',
    tooSmall: 'Immagine troppo piccola: serve almeno 150 × 150 px. Usa lo screenshot originale, non una miniatura.',
    noQr: 'Non trovo nessun QR in questa immagine. Carica uno screenshot con il QR dell’app dei pasti ben visibile.',
    notMealQr: 'Questo QR non è quello dell’app dei pasti. Controlla di aver caricato il QR giusto.',
    qrTooSmall: 'Il QR è troppo piccolo per essere letto bene. Ingrandiscilo prima di fare lo screenshot.',
    checkFailed: 'Impossibile controllare l’immagine. Controlla la connessione e riprova.',
    weekly: 'Box ogni settimana',
    weeklyHelp: 'Scegli i pasti che salti sempre. Puoi disattivarlo quando vuoi.',
    save: 'Salva',
    saving: 'Salvataggio…',
    cancel: 'Annulla',
    removeMe: 'Toglimi dalla lista',
    needName: 'Inserisci prima il tuo nome.',
    needQr: 'Carica il tuo QR così la cucina può scansionarlo.',
    saveErr: 'Impossibile salvare. Controlla la connessione e riprova.',
    removeErr: 'Impossibile eliminare. Controlla la connessione e riprova.',
    confirmRemove: (name) => 'Togliere ' + name + ' dalla lista?',
    thisEntry: 'questa persona',
    saved: 'Salvato',
    added: 'Sei nella lista',
    removed: 'Eliminato',
    offline: 'Impossibile raggiungere il server. Controlla la connessione e ricarica la pagina.',
    demo: '<strong>Modalità demo.</strong> Le modifiche restano solo in questo browser. Inserisci URL e chiave di Supabase in <code>app.js</code> per condividere la lista.'
  },
  en: {
    locale: 'en-GB',
    days: { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday' },
    daysShort: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri' },
    meals: { L: 'lunch', D: 'dinner' },
    title: (day, meal) => cap(day) + ' ' + meal,
    every: (day, meal) => 'Every ' + cap(day) + ' ' + meal,
    summaryPart: (meal, days) => cap(meal) + ' ' + days,
    weeklySum: (sum) => 'Weekly: ' + sum,
    htmlDesc: 'Who needs their meal boxed at this service.',
    langLabel: 'Language',
    clears: 'Clears',
    now: 'Now collecting',
    search: 'Find your name',
    tabBox: 'To box',
    tabNot: 'Not boxed',
    hintBox: 'Kitchen: scan each QR and box the meal. Tap a QR to enlarge it.',
    hintNot: 'Picking up yourself. Can’t make it? Tap Box me.',
    foot: (lunch, dinner) => 'Resets after lunch (' + lunch + ') and dinner (' + dinner + ').',
    addQr: 'Add your QR',
    close: 'Close',
    kmOpen: 'Kitchen mode: every QR on one page',
    kmEyebrow: 'Kitchen',
    kmClose: 'Exit kitchen mode',
    kmEmpty: 'No boxes to do for this meal.',
    doneOf: (done, total) => done + ' of ' + total + ' boxed',
    markAll: 'Mark all boxed',
    allDone: 'All boxed',
    allToast: 'All marked as boxed',
    mark: 'Mark boxed',
    marked: 'Boxed',
    markAria: (name) => name + ': mark as boxed',
    markedAria: (name) => name + ': boxed. Tap to undo',
    unbox: 'Unbox',
    boxMe: 'Box me',
    onlyThis: 'Added for this meal',
    skip: 'Skipping the box this time',
    noSched: 'No weekly schedule',
    paused: 'Weekly schedule paused',
    noQrYet: 'No QR yet',
    addIt: 'Add it',
    enlarge: (name) => 'Enlarge QR for ' + name,
    addQrFor: (name) => 'Add a QR for ' + name,
    edit: (name) => 'Edit ' + name,
    qrOf: (name) => 'QR code for ' + name,
    movedIn: (name) => name + ' moved to To box',
    movedOut: (name) => name + ' moved to Not boxed',
    loading: 'Loading…',
    noMatchBox: 'No match on the box list.',
    emptyBox: 'Nobody needs a box for this meal yet.',
    noMatch: 'No match.',
    emptyNot: 'Everyone is on the box list.',
    loadErr: 'Couldn’t load the list. Check your connection.',
    saveErrShort: 'Couldn’t save that. Try again.',
    addTitle: 'Add yourself',
    editTitle: 'Edit your entry',
    yourName: 'Your name',
    namePh: 'Surname Name',
    yourQr: 'Your QR',
    yourQrAlt: 'Your uploaded QR',
    upload: 'Upload QR',
    replace: 'Replace QR',
    qrHelp: 'A screenshot of the meal app showing your QR. A full-screen one is fine (max 10 MB).',
    reading: 'Reading the image…',
    found: 'Found your QR, checked it and cropped it.',
    badImage: 'That image couldn’t be read. Try a PNG or JPG screenshot.',
    notImage: 'That file isn’t an image. Upload a PNG or JPG screenshot.',
    tooBig: 'That image is too big: 10 MB and 6000 px per side at most.',
    tooSmall: 'That image is too small: it needs to be at least 150 × 150 px. Use the original screenshot, not a thumbnail.',
    noQr: 'There’s no QR in this image. Upload a screenshot where the meal app’s QR is clearly visible.',
    notMealQr: 'This isn’t a meal-app QR. Check you uploaded the right one.',
    qrTooSmall: 'The QR is too small to scan reliably. Zoom in on it before taking the screenshot.',
    checkFailed: 'Couldn’t check the image. Check your connection and try again.',
    weekly: 'Box me every week',
    weeklyHelp: 'Pick the meals you always miss. Turn off any time.',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    removeMe: 'Remove me from the list',
    needName: 'Add your name first.',
    needQr: 'Upload your QR so the kitchen can scan it.',
    saveErr: 'Couldn’t save. Check your connection and try again.',
    removeErr: 'Couldn’t remove. Check your connection and try again.',
    confirmRemove: (name) => 'Remove ' + name + ' from the list?',
    thisEntry: 'this entry',
    saved: 'Saved',
    added: 'You’re on the list',
    removed: 'Removed',
    offline: 'Couldn’t reach the server. Check your connection and reload.',
    demo: '<strong>Demo mode.</strong> Changes are saved only in this browser. Add the Supabase URL and key in <code>app.js</code> to share the list.'
  }
};

let lang = 'it';
try { if (localStorage.getItem(LANG_KEY) === 'en') lang = 'en'; } catch (e) { /* storage blocked: stay on Italian */ }

function t(key, ...args) {
  const v = STRINGS[lang][key];
  return typeof v === 'function' ? v(...args) : v;
}

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

// 900 → '15:00'
function hhmm(minutes) {
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
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
  return {
    key: ymd(date) + '-' + meal,
    date: date,
    day: DAYS[date.getUTCDay() - 1],
    meal: meal,
    reset: hhmm(meal === 'L' ? LUNCH_ENDS : DINNER_ENDS)
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
  MEALS.forEach((m) => {
    const days = DAYS.filter((d) => s[d][m]).map((d) => t('daysShort')[d]);
    if (days.length) parts.push(t('summaryPart', t('meals')[m], days.join(', ')));
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
let pendingWrites = 0;      // quick changes shown on screen but still being saved
let writeGen = 0;           // goes up with every save, so a refresh can tell it overlapped one
let writeQueue = Promise.resolve();
let toBoxIds = [];        // everyone on To box for this meal, ignoring the search
let qrPersonId = null;    // whose QR is enlarged

async function refresh() {
  const seq = ++loadSeq;
  const gen = writeGen;
  const key = state.svc.key;
  try {
    const [people, ovs, boxed] = await Promise.all([store.loadPeople(), store.loadOverrides(key), store.loadBoxed(key)]);
    if (seq !== loadSeq) return;
    // A save overlapped this load, so it may be older than the screen. Load again once saves settle.
    if (pendingWrites || gen !== writeGen) { refreshSoon(); return; }
    state.people = people.map((p) => ({
      id: p.id, name: p.name, qrUrl: p.qr_url, recurring: !!p.recurring, sched: normSched(p.schedule)
    }));
    state.overrides = {};
    ovs.forEach((o) => { state.overrides[o.person_id] = o.state; });
    state.boxed = new Set(boxed.map((b) => b.person_id));
    state.loaded = true;
  } catch (e) {
    console.error(e);
    if (seq === loadSeq) toast(t('loadErr'));
  }
  render();
}

function refreshSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 250);
}

// Runs saves one at a time, in tap order, so a quick mark-then-undo ends the way it looks.
function queueSave(fn) {
  pendingWrites++;
  writeGen++;
  const run = writeQueue.then(fn);
  writeQueue = run.catch(() => {});
  return run.finally(() => {
    pendingWrites--;
    if (!pendingWrites) refreshSoon();
  });
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
  toast(t(want ? 'movedIn' : 'movedOut', p.name));
  const st = state.overrides[p.id];
  try {
    await queueSave(async () => {
      if (want === natural) await store.clearOverride(key, p.id);
      else await store.setOverride(key, p.id, st);
      if (wasMarked) await store.unmarkBoxed(key, [p.id]);
    });
  } catch (e) {
    console.error(e);
    if (prev) state.overrides[p.id] = prev; else delete state.overrides[p.id];
    if (wasMarked) state.boxed.add(p.id);
    render();
    toast(t('saveErrShort'));
  }
}

// The kitchen's mark: this person's meal is already boxed for the current service.
async function setMarked(ids, on) {
  if (!ids.length) return;
  const key = state.svc.key;
  ids.forEach((id) => { if (on) state.boxed.add(id); else state.boxed.delete(id); });
  render();
  try {
    await queueSave(() => (on ? store.markBoxed(key, ids) : store.unmarkBoxed(key, ids)));
  } catch (e) {
    console.error(e);
    if (key === state.svc.key) {
      ids.forEach((id) => { if (on) state.boxed.delete(id); else state.boxed.add(id); });
      render();
    }
    toast(t('saveErrShort'));
  }
}

/* -------------------------------------------------------------- Render --- */

let lastBoxHtml = null;
let lastNotHtml = null;

function markBtnHtml(p, done) {
  const label = esc(t(done ? 'markedAria' : 'markAria', p.name));
  return `<button class="btn-mark" data-action="mark" data-id="${esc(p.id)}" aria-pressed="${done}" aria-label="${label}">${done ? DONE_ICON + esc(t('marked')) : esc(t('mark'))}</button>`;
}

function cardHtml({ p, ov }) {
  const svc = state.svc;
  const done = state.boxed.has(p.id);
  const reason = ov === 'box' ? t('onlyThis') : t('every', t('days')[svc.day], t('meals')[svc.meal]);
  const stamp = done ? `<span class="stamp" aria-hidden="true">${DONE_ICON}${esc(t('marked'))}</span>` : '';
  const qr = p.qrUrl
    ? `<button class="card-qr" data-action="qr" data-id="${esc(p.id)}" aria-label="${esc(t('enlarge', p.name))}"><img src="${esc(p.qrUrl)}" alt="" loading="lazy" decoding="async">${stamp}</button>`
    : `<button class="card-qr" data-action="edit" data-id="${esc(p.id)}" aria-label="${esc(t('addQrFor', p.name))}"><span class="no-qr">${esc(t('noQrYet'))}<strong>${esc(t('addIt'))}</strong></span>${stamp}</button>`;
  return `<div class="card${done ? ' is-done' : ''}">${qr}
    <div class="card-body">
      <div class="card-name">${esc(p.name)}</div>
      <div class="reason">${esc(reason)}</div>
      <div class="card-actions">
        ${markBtnHtml(p, done)}
        <div class="card-row">
          <button class="btn-unbox" data-action="unbox" data-id="${esc(p.id)}">${esc(t('unbox'))}</button>
          <button class="btn-icon" data-action="edit" data-id="${esc(p.id)}" aria-label="${esc(t('edit', p.name))}">${PEN_ICON}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function rowHtml({ p, ov }) {
  let reason;
  if (ov === 'unbox') reason = t('skip');
  else if (!hasAny(p.sched)) reason = t('noSched');
  else if (!p.recurring) reason = t('paused');
  else reason = t('weeklySum', summary(p.sched));
  return `<div class="row">
    <div class="row-main">
      <div class="row-name">${esc(p.name)}</div>
      <div class="reason">${esc(reason)}</div>
    </div>
    <button class="btn-icon" data-action="edit" data-id="${esc(p.id)}" aria-label="${esc(t('edit', p.name))}">${PEN_ICON}</button>
    <button class="btn-boxme" data-action="box" data-id="${esc(p.id)}">${esc(t('boxMe'))}</button>
  </div>`;
}

function render() {
  const svc = state.svc;
  $('resetTime').textContent = svc.reset;
  $('dateLabel').textContent = svc.date.toLocaleDateString(t('locale'), { day: 'numeric', month: 'long', timeZone: 'UTC' });
  $('mealTitle').textContent = t('title', t('days')[svc.day], t('meals')[svc.meal]);

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
  $('doneCount').textContent = t('doneOf', doneCount, toBoxIds.length);
  $('doneFill').style.width = (toBoxIds.length ? 100 * doneCount / toBoxIds.length : 0) + '%';
  $('allBtn').disabled = allDone;
  $('allBtn').innerHTML = DONE_ICON + esc(t(allDone ? 'allDone' : 'markAll'));

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
  $('boxEmpty').textContent = !state.loaded ? t('loading') : t(q ? 'noMatchBox' : 'emptyBox');

  const notHtml = notBoxed.map(rowHtml).join('');
  if (notHtml !== lastNotHtml) { $('notList').innerHTML = notHtml; lastNotHtml = notHtml; }
  $('notEmpty').hidden = notBoxed.length > 0;
  $('notEmpty').textContent = !state.loaded ? t('loading') : t(q ? 'noMatch' : 'emptyNot');

  if (!$('qrSheet').hidden) {
    const p = state.people.find((x) => x.id === qrPersonId);
    $('qrMark').innerHTML = p && toBoxIds.includes(p.id) ? markBtnHtml(p, state.boxed.has(p.id)) : '';
  }

  $('kmOpen').hidden = !toBoxIds.length;
  if (!$('kitchen').hidden) renderKitchen();
}

/* -------------------------------------------------------- Kitchen mode --- */

// Every QR for this meal on one screen, at the biggest size that still fits.
// URL: …/#cucina, so the kitchen can keep it as a bookmark.
const KM_HASH = '#cucina';
const KM_GAP = 8;          // px between tiles, as in .km-grid
const KM_LABEL = 18;       // px a tile adds below its QR: name, padding, borders
const KM_MIN = 110;        // px: below this a QR gets hard to scan, so scroll instead
const KM_MAX = 420;        // px: no point in bigger on a tablet

let lastKmHtml = null;
let kmPushed = false;      // we added the #cucina history entry, so Back can undo it
let wakeLock = null;

function kmTileHtml(p) {
  const done = state.boxed.has(p.id);
  const stamp = done ? `<span class="stamp" aria-hidden="true">${DONE_ICON}${esc(t('marked'))}</span>` : '';
  const qr = p.qrUrl ? `<img src="${esc(p.qrUrl)}" alt="">` : `<span class="no-qr">${esc(t('noQrYet'))}</span>`;
  return `<button class="km-tile${done ? ' is-done' : ''}" data-id="${esc(p.id)}" aria-pressed="${done}" aria-label="${esc(t(done ? 'markedAria' : 'markAria', p.name))}"><span class="km-qr">${qr}${stamp}</span><span class="km-name">${esc(p.name)}</span></button>`;
}

function renderKitchen() {
  // Still to box first, like the list.
  const ids = toBoxIds.slice().sort((a, b) => state.boxed.has(a) - state.boxed.has(b));
  const done = ids.filter((id) => state.boxed.has(id)).length;
  const allDone = done === ids.length;
  $('kmDate').textContent = $('dateLabel').textContent;
  $('kmTitle').textContent = $('mealTitle').textContent;
  $('kmCount').textContent = t('doneOf', done, ids.length);
  $('kmFill').style.width = (ids.length ? 100 * done / ids.length : 0) + '%';
  $('kmAll').hidden = !ids.length;
  $('kmAll').disabled = allDone;
  $('kmAll').innerHTML = DONE_ICON + esc(t(allDone ? 'allDone' : 'markAll'));

  const html = ids.map((id) => kmTileHtml(state.people.find((p) => p.id === id))).join('');
  if (html !== lastKmHtml) { $('kmGrid').innerHTML = html; lastKmHtml = html; }
  $('kmGrid').hidden = !ids.length;
  $('kmEmpty').hidden = ids.length > 0;
  $('kmEmpty').textContent = state.loaded ? t('kmEmpty') : t('loading');
  fitKitchen(ids.length);
}

// Picks the column count that gives the biggest QR with every tile on screen.
function fitKitchen(n) {
  const g = $('kmGrid');
  if (!n || g.hidden) return;
  const w = g.clientWidth - 24;      // .km-grid side padding
  const h = g.clientHeight - 20;     // .km-grid top and bottom padding
  let best = { cols: 1, cell: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cell = Math.min((w - (cols - 1) * KM_GAP) / cols, (h - (rows - 1) * KM_GAP) / rows - KM_LABEL);
    if (cell > best.cell) best = { cols: cols, cell: cell };
  }
  if (best.cell < KM_MIN) {
    const cols = Math.max(1, Math.floor((w + KM_GAP) / (KM_MIN + KM_GAP)));
    best = { cols: cols, cell: (w - (cols - 1) * KM_GAP) / cols };
  }
  g.style.setProperty('--cols', best.cols);
  g.style.setProperty('--cell', Math.floor(Math.min(best.cell, KM_MAX)) + 'px');
}

// Keeps the phone from locking while the kitchen is scanning.
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
    }
  } catch (e) { /* unsupported or refused: the phone keeps its own screen timeout */ }
}

// Opens or closes kitchen mode to match the address (#cucina), so Back works too.
function syncKitchen() {
  const want = location.hash === KM_HASH;
  const el = $('kitchen');
  if (want === !el.hidden) return;
  el.hidden = !want;
  document.body.classList.toggle('locked', want);
  keepAwake(want);
  if (want) {
    lastKmHtml = null;
    render();
    $('kmClose').focus();
  } else {
    kmPushed = false;
    if (!$('kmOpen').hidden) $('kmOpen').focus();
  }
}

function closeKitchen() {
  if (kmPushed) { history.back(); return; }
  history.replaceState(null, '', location.pathname + location.search);
  syncKitchen();
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
  $('qrImgWrap').innerHTML = `<img src="${esc(p.qrUrl)}" alt="${esc(t('qrOf', p.name))}">`;
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
  setNote(t('qrHelp'), false);
  showErr('');
  updateForm();
  openSheet($('formSheet'), opener);
  $('formSheet').querySelector('.sheet-form').scrollTop = 0;
  if (!p) $('fName').focus();
}

function buildSchedGrid() {
  let html = '<span></span>' + DAYS.map((d) => `<span class="sched-day">${esc(t('daysShort')[d])}</span>`).join('');
  MEALS.forEach((m) => {
    const meal = t('meals')[m];
    html += `<span class="sched-label">${esc(cap(meal))}</span>`;
    DAYS.forEach((d) => {
      html += `<button type="button" class="chip" data-day="${d}" data-meal="${m}" aria-pressed="false" aria-label="${esc(cap(t('days')[d]) + ' ' + meal)}">${CHECK_ICON}</button>`;
    });
  });
  $('fGrid').innerHTML = html;
}

function updateForm() {
  const d = draft;
  $('formTitle').textContent = t(d.id ? 'editTitle' : 'addTitle');
  const src = d.preview || d.qrUrl;
  const prev = $('fQrPreview');
  prev.classList.toggle('is-empty', !src);
  prev.innerHTML = src ? `<img src="${esc(src)}" alt="${esc(t('yourQrAlt'))}">` : esc(t('noQrYet'));
  $('uploadLabel').textContent = t(src ? 'replace' : 'upload');
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
  setNote(t('reading'), false);
  try {
    const blob = await prepareQr(file);
    if (draft !== forDraft) return;
    if (draft.preview) URL.revokeObjectURL(draft.preview);
    draft.blob = blob;
    draft.preview = URL.createObjectURL(blob);
    showErr('');
    setNote(t('found'), false);
    updateForm();
  } catch (err) {
    // Refused: the picture is dropped and any QR already in the form stays as it was.
    if (!err.code) console.error(err);
    if (draft === forDraft) setNote(t(err.code || 'badImage'), true);
  } finally {
    upload.classList.remove('is-busy');
  }
}

async function onSave(e) {
  e.preventDefault();
  if (!draft || saving) return;
  const d = draft;
  const name = $('fName').value.trim().replace(/\s+/g, ' ');
  if (!name) { showErr(t('needName')); $('fName').focus(); return; }
  if (!d.id && !d.blob) { showErr(t('needQr')); return; }

  saving = true;
  $('fSave').disabled = true;
  $('fSave').textContent = t('saving');
  try {
    let qrUrl = d.qrUrl;
    if (d.blob) qrUrl = await store.uploadQr(d.blob);
    const row = { name: name, qr_url: qrUrl, recurring: d.recurring && hasAny(d.sched), schedule: d.sched };
    if (d.id) await store.updatePerson(d.id, row);
    else await store.addPerson(row);
    if (d.blob && d.qrUrl) store.deleteQr(d.qrUrl).catch(console.error);
    closeSheet($('formSheet'));
    toast(t(d.id ? 'saved' : 'added'));
    refresh();
  } catch (err) {
    console.error(err);
    showErr(t('saveErr'));
  } finally {
    saving = false;
    $('fSave').disabled = false;
    $('fSave').textContent = t('save');
  }
}

async function onRemove() {
  if (!draft || !draft.id || saving) return;
  const d = draft;
  const p = state.people.find((x) => x.id === d.id);
  if (!window.confirm(t('confirmRemove', p ? p.name : t('thisEntry')))) return;
  saving = true;
  try {
    await store.removePerson(d.id);
    if (d.qrUrl) store.deleteQr(d.qrUrl).catch(console.error);
    closeSheet($('formSheet'));
    toast(t('removed'));
    refresh();
  } catch (err) {
    console.error(err);
    showErr(t('removeErr'));
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
      s.integrity = JSQR_SRI;
      s.crossOrigin = 'anonymous';
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

function qrError(code) {
  const e = new Error(code);
  e.code = code;            // a STRINGS key, shown to the person as is
  return e;
}

// Finds the QR in a screenshot: its content, its size in pixels, and a square crop around it (with a quiet zone).
function findQr(img, jsQR) {
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const first = Math.min(1, 1200 / Math.max(w0, h0));
  const scales = first < 1 && w0 * h0 <= 12e6 ? [first, 1] : [first];
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
      data: code.data,
      size: size,
      x: Math.max(0, Math.min(w0 - side, cx - side / 2)),
      y: Math.max(0, Math.min(h0 - side, cy - side / 2)),
      side: side
    };
  }
  return null;
}

// Checks the upload and returns a 400px PNG crop of its QR.
// Throws qrError(code) when the picture is refused, so nothing gets saved.
async function prepareQr(file) {
  if (file.type && !file.type.startsWith('image/')) throw qrError('notImage');
  if (file.size > QR_MAX_FILE_MB * 1024 * 1024) throw qrError('tooBig');
  let jsQR;
  try { jsQR = await loadJsQR(); } catch (e) { throw qrError('checkFailed'); }
  const { img, url } = await loadImage(file);
  try {
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (Math.max(w0, h0) > QR_MAX_SIDE) throw qrError('tooBig');
    if (Math.min(w0, h0) < QR_MIN_SIDE) throw qrError('tooSmall');
    const qr = findQr(img, jsQR);
    if (!qr) throw qrError('noQr');
    if (!MEAL_QR.test(qr.data)) throw qrError('notMealQr');
    if (qr.size < QR_MIN_CODE) throw qrError('qrTooSmall');

    const scale = Math.min(1, 400 / qr.side);
    const w = Math.max(1, Math.round(qr.side * scale));
    const c = canvasOf(w, w);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, w);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, qr.x, qr.y, qr.side, qr.side, 0, 0, w, w);
    // What we save has to scan to the very same code.
    const again = jsQR(ctx.getImageData(0, 0, w, w).data, w, w);
    if (!again || again.data !== qr.data) throw qrError('badImage');
    return await new Promise((resolve, reject) => {
      c.toBlob((b) => (b ? resolve(b) : reject(qrError('badImage'))), 'image/png');
    });
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
    toast(t('allToast'));
  });
  $('kmOpen').addEventListener('click', () => { kmPushed = true; location.hash = KM_HASH; });
  $('kmClose').addEventListener('click', closeKitchen);
  $('kmAll').addEventListener('click', () => {
    setMarked(toBoxIds.filter((id) => !state.boxed.has(id)), true);
    toast(t('allToast'));
  });
  $('kmGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.km-tile');
    if (b) setMarked([b.dataset.id], !state.boxed.has(b.dataset.id));
  });
  window.addEventListener('hashchange', syncKitchen);
  window.addEventListener('resize', () => { if (!$('kitchen').hidden) fitKitchen(toBoxIds.length); });
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
    if (!$('kitchen').hidden) closeKitchen();
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
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });

  setInterval(() => tick(false), 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    tick(true);
    if (!$('kitchen').hidden) keepAwake(true);   // the browser drops the wake lock when the page is hidden
  });
}

let bannerKey = null;     // 'offline' | 'demo' | null

// Rewrites every visible text in the current language.
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelector('meta[name="description"]').content = t('htmlDesc');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('foot').textContent = t('foot', hhmm(LUNCH_ENDS), hhmm(DINNER_ENDS));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('.lang-btn').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
  $('banner').hidden = !bannerKey;
  if (bannerKey) $('banner').innerHTML = t(bannerKey);
  buildSchedGrid();
  render();
}

function setLang(next) {
  if (next === lang || !STRINGS[next]) return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage blocked: applies to this visit only */ }
  applyLang();
}

// Right after a deploy, a phone can pair a cached page with the newer script (or the reverse),
// and the script then misses parts of the page it needs. Both carry the same build id,
// so on a mismatch reload once to get a matching pair.
function staleBuild() {
  const page = document.documentElement.dataset.build;
  if (!page || page === BUILD) return false;
  const key = 'boxpasti-reloaded-' + BUILD;
  try {
    if (sessionStorage.getItem(key)) return false;    // already tried: carry on rather than loop
    sessionStorage.setItem(key, '1');
  } catch (e) { return false; }
  location.reload();
  return true;
}

function init() {
  if (staleBuild()) return;
  bindEvents();
  applyLang();
  syncKitchen();

  const configured = SUPABASE_URL && SUPABASE_ANON_KEY;
  if (configured && !window.supabase) {
    bannerKey = 'offline';
    applyLang();
    return;
  }
  store = configured ? supabaseStore() : demoStore();
  if (!store.live) {
    bannerKey = 'demo';
    applyLang();
  }

  refresh();
  store.prune(pruneBeforeKey()).catch(console.error);
  store.subscribe(refreshSoon);
}

init();
