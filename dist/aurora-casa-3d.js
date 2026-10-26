/*
 * Aurora Casa 3D — scheda per Home Assistant
 * DomotikPro.it · https://domotikpro.it
 *
 * La tua casa in 3D, viva, collegata ai sensori veri. Si gira con il dito e:
 *  - il sole è quello vero: le ombre dei muri si allungano sul giardino e i fasci di luce
 *    entrano dalle finestre giuste, con la loro lunghezza giusta, all'ora giusta;
 *  - le stanze si accendono con le luci vere, con coni di luce e vetri che brillano di notte;
 *  - le persone viste dai sensori di movimento e dai radar camminano come figure luminose
 *    e lasciano una scia sul pavimento;
 *  - l'energia scorre dal quadro agli apparecchi: colonne di luce alte quanto i watt;
 *  - pioggia, neve, nuvole e lampi dal meteo; stelle, luna e aurora boreale di notte;
 *  - una barra del sole per vedere le ombre dell'intera giornata, foto e Short verticale.
 * Usa la stessa configurazione di Aurora Casa Viva (stanze, finestre, porte, apparecchi, radar):
 * cambi solo la prima riga in  type: custom:aurora-casa-3d. Oppure scrivi soltanto
 *     type: custom:aurora-casa-3d
 *     casa_viva: auto
 * e la scheda trova da sola la mappa Aurora Casa Viva che hai già in una tua plancia e la rifà in 3D.
 * Un solo file, nessuna libreria, nessuna compilazione, nessun cloud. L'unica richiesta esterna
 * sono i font Google (con fonts: false nessuna).
 * Copyright (c) 2026 DomotikPro.it (Luca Pinelli). Uso personale gratuito: vedi LICENSE.
 * Guida: https://domotikpro.it/progetti/aurora-casa-3d
 */
const AC3_VERSION = '1.3.0';

(() => {
  if (customElements.get('aurora-casa-3d')) return;

  const RAD = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const mulc = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const addc = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const rgba = (c, a) => `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${clamp(a, 0, 1).toFixed(3)})`;
  const arr = v => v == null ? [] : Array.isArray(v) ? v : [v];
  const parsePts = s => typeof s === 'string' ? s.split(',').map(p => p.trim().split(/\s+/).map(Number)) : s;
  const MIN = 60000, DAY = 86400000;
  const OUT_DIR = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const hhmm = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const hourOf = ms => { const d = new Date(ms); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
  const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ───────── testi (italiano / inglese) ─────────
  const TXT = {
    it: {
      live: 'Dal vivo', preview: 'Anteprima del sole', sun: 'Sole', alt: 'altezza', below: 'sotto l\'orizzonte', power: 'Consumo', lights: 'luci accese',
      orbit: 'Orbita', view: 'Vista', now: 'Adesso', photo: 'Foto', short: 'Short', rec: 'Registro…', house: 'Casa', top: 'Dall\'alto', cinema: 'Cinema',
      day: 'Il giorno', temp: 'Temperatura', light: 'Luce', on: 'accesa', off: 'spenta', presence: 'Presenza', stuck: 'Sensore bloccato su «acceso» (ignorato)', arrange: 'Arreda', arr_hint: 'Scegli un mobile qui sopra, poi trascinalo sul pavimento. Tocca una stanza per scegliere dove metterlo.', arr_rot: 'Ruota', arr_w: 'Larghezza', arr_d: 'Profondità', arr_h: 'Altezza', arr_move: 'Sposta', arr_dup: 'Duplica', arr_del: 'Elimina', arr_undo: 'Annulla', arr_copy: 'Copia YAML', arr_copied: 'Copiato!', arr_reset: 'Ripristina', arr_reset_q: 'Cancello gli arredi salvati e torno a quelli scritti nella configurazione (se ci sono)?', arr_done: 'Fine', arr_saving: 'Salvo…', arr_saved_ha: 'Salvato in Home Assistant', arr_saved_local: 'Salvato su questo dispositivo', arr_nosave: 'Non riesco a salvare', arr_upper_on: '+ Pensili', arr_upper_off: '− Pensili', yes: 'sì', no: 'no', sunin: 'Sole in stanza', close: 'Chiudi',
      toggle: 'Accendi / spegni', cost: 'costo', hr: 'all\'ora', noRec: 'Questo browser non può registrare video dalla scheda.',
      finding: 'Cerco la mappa di Aurora Casa Viva nelle tue plance…', mapFrom: 'Mappa', retry: 'Riprova', noCV: 'Non ho trovato nessuna scheda Aurora Casa Viva nelle plance che posso leggere.', noCVHint: 'Aggiungi la scheda Aurora Casa Viva a una plancia, oppure scrivi il nome della plancia (casa_viva: nome-plancia) o incolla qui le stanze (rooms).', cvFail: 'Non riesco a leggere le plance',
      armed: 'Allarme inserito', triggered: 'ALLARME', cap_rain: 'Fuori piove, la pioggia cade sul tetto', cap_sun: 'Il sole entra da', cap_lights: 'Luci accese:', cap_night: 'La casa di notte', cap_dawn: 'Sta per sorgere il sole', cap_dusk: 'Il sole è appena tramontato', and: 'e', clear: 'Sereno',
      cond: { sunny: 'Sereno', 'clear-night': 'Sereno', partlycloudy: 'Poco nuvoloso', cloudy: 'Nuvoloso', fog: 'Nebbia', rainy: 'Pioggia', pouring: 'Pioggia forte', 'lightning-rainy': 'Temporale', lightning: 'Fulmini', snowy: 'Neve', 'snowy-rainy': 'Nevischio', hail: 'Grandine', windy: 'Ventoso', exceptional: 'Eccezionale' },
      dirs: ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest'], title: 'La mia casa in 3D', subtitle: 'Home Assistant · Aurora Casa 3D', locale: 'it-IT',
    },
    en: {
      live: 'Live', preview: 'Sun preview', sun: 'Sun', alt: 'altitude', below: 'below the horizon', power: 'Power', lights: 'lights on',
      orbit: 'Orbit', view: 'View', now: 'Now', photo: 'Photo', short: 'Short', rec: 'Recording…', house: 'House', top: 'Top down', cinema: 'Cinema',
      day: 'The day', temp: 'Temperature', light: 'Light', on: 'on', off: 'off', presence: 'Presence', stuck: 'Sensor stuck on (ignored)', arrange: 'Furnish', arr_hint: 'Pick a piece above, then drag it onto the floor. Tap a room to choose where it goes.', arr_rot: 'Rotate', arr_w: 'Width', arr_d: 'Depth', arr_h: 'Height', arr_move: 'Move', arr_dup: 'Duplicate', arr_del: 'Delete', arr_undo: 'Undo', arr_copy: 'Copy YAML', arr_copied: 'Copied!', arr_reset: 'Reset', arr_reset_q: 'Delete the saved furniture and go back to the one in the configuration (if any)?', arr_done: 'Done', arr_saving: 'Saving…', arr_saved_ha: 'Saved in Home Assistant', arr_saved_local: 'Saved on this device', arr_nosave: 'Cannot save', arr_upper_on: '+ Wall units', arr_upper_off: '− Wall units', yes: 'yes', no: 'no', sunin: 'Sun in room', close: 'Close',
      toggle: 'Toggle', cost: 'cost', hr: 'per hour', noRec: 'This browser cannot record video from the card.',
      finding: 'Looking for your Aurora Casa Viva map in your dashboards…', mapFrom: 'Map', retry: 'Retry', noCV: 'I could not find an Aurora Casa Viva card in the dashboards I can read.', noCVHint: 'Add the Aurora Casa Viva card to a dashboard, or set the dashboard name (casa_viva: dashboard-name), or paste the rooms here.', cvFail: 'Cannot read the dashboards',
      armed: 'Alarm armed', triggered: 'ALARM', cap_rain: 'It is raining outside', cap_sun: 'Sunlight enters', cap_lights: 'Lights on:', cap_night: 'The house at night', cap_dawn: 'The sun is about to rise', cap_dusk: 'The sun has just set', and: 'and', clear: 'Clear',
      cond: { sunny: 'Sunny', 'clear-night': 'Clear', partlycloudy: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Fog', rainy: 'Rain', pouring: 'Heavy rain', 'lightning-rainy': 'Thunderstorm', lightning: 'Lightning', snowy: 'Snow', 'snowy-rainy': 'Sleet', hail: 'Hail', windy: 'Windy', exceptional: 'Exceptional' },
      dirs: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'], title: 'My home in 3D', subtitle: 'Home Assistant · Aurora Casa 3D', locale: 'en-GB',
    },
  };
  const RAINY = { rainy: .75, pouring: 1, 'lightning-rainy': .9, 'snowy-rainy': .6, hail: .8 };
  const SNOWY = { snowy: 1, 'snowy-rainy': .5 };
  const CLOUDY = { sunny: .05, 'clear-night': .05, partlycloudy: .45, cloudy: .88, fog: .8, rainy: .9, pouring: .95, 'lightning-rainy': .95, lightning: .85, snowy: .9, 'snowy-rainy': .9, hail: .9, windy: .3, 'windy-variant': .5, exceptional: .5 };

  // ───────── sole: algoritmo NOAA semplificato (precisione ~0,5°) ─────────
  function sunAt(ms, lat, lon) {
    const n = ms / DAY + 2440587.5 - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
    const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 0.0000004 * n) * RAD;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const gmst = ((18.697374558 + 24.06570982441908 * n) % 24 + 24) % 24;
    const ha = (gmst * 15 + lon) * RAD - ra, la = lat * RAD;
    const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha));
    const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha));
    return { az: (az / RAD + 360) % 360, el: el / RAD };
  }
  function sunColor(el) {
    if (el < 2) return [255, 122, 70];
    if (el < 10) return mixc([255, 122, 70], [255, 192, 122], (el - 2) / 8);
    if (el < 30) return mixc([255, 192, 122], [255, 238, 205], (el - 10) / 20);
    return [255, 246, 228];
  }
  const tempColor = T => T < 19 ? mixc([84, 140, 255], [80, 200, 230], clamp((T - 17) / 2, 0, 1)) : T < 22 ? mixc([80, 200, 230], [255, 196, 110], (T - 19) / 3) : mixc([255, 196, 110], [255, 92, 92], clamp((T - 22) / 4, 0, 1));

  // ───────── cielo: la stessa palette dell'ora del giorno di Aurora Glass v3 ─────────
  const KEYS = [
    [0, { s1: '#070B24', s2: '#141A52', s3: '#2A2A78', win: '#FFD27A', sun: '#FFF1B0', cl: .06, st: 1, dy: 0, b1: '#7C5CFF', b2: '#3B82F6', b3: '#22D3EE' }],
    [5, { s1: '#070B24', s2: '#141A52', s3: '#2A2A78', win: '#FFD27A', sun: '#FFF1B0', cl: .06, st: 1, dy: 0, b1: '#7C5CFF', b2: '#3B82F6', b3: '#22D3EE' }],
    [6.5, { s1: '#3A2A7A', s2: '#D9648C', s3: '#FFC38A', win: '#FFE3A3', sun: '#FFC27A', cl: .38, st: .3, dy: .35, b1: '#FB7185', b2: '#F59E0B', b3: '#8B5CF6' }],
    [8.5, { s1: '#4A90E6', s2: '#8ACBFB', s3: '#F6E6D2', win: '#FFF6D2', sun: '#FFF3B8', cl: .7, st: 0, dy: .9, b1: '#38BDF8', b2: '#34D399', b3: '#818CF8' }],
    [12, { s1: '#2F86E6', s2: '#74BFFB', s3: '#D4EEFF', win: '#FFF6D2', sun: '#FFF3B8', cl: .8, st: 0, dy: 1, b1: '#38BDF8', b2: '#34D399', b3: '#818CF8' }],
    [16.5, { s1: '#3B86E0', s2: '#86C2F4', s3: '#F8E6C8', win: '#FFF6D2', sun: '#FFF3B8', cl: .75, st: 0, dy: .95, b1: '#38BDF8', b2: '#34D399', b3: '#818CF8' }],
    [18.5, { s1: '#35205F', s2: '#C23F7A', s3: '#FF9A62', win: '#FFD27A', sun: '#FFB36B', cl: .4, st: .25, dy: .3, b1: '#F97316', b2: '#EC4899', b3: '#8B5CF6' }],
    [20.5, { s1: '#10103A', s2: '#2B2260', s3: '#4A2D78', win: '#FFD27A', sun: '#FFB36B', cl: .15, st: .8, dy: .05, b1: '#8B5CF6', b2: '#6366F1', b3: '#22D3EE' }],
    [22, { s1: '#070B24', s2: '#141A52', s3: '#2A2A78', win: '#FFD27A', sun: '#FFF1B0', cl: .06, st: 1, dy: 0, b1: '#7C5CFF', b2: '#3B82F6', b3: '#22D3EE' }],
    [24, { s1: '#070B24', s2: '#141A52', s3: '#2A2A78', win: '#FFD27A', sun: '#FFF1B0', cl: .06, st: 1, dy: 0, b1: '#7C5CFF', b2: '#3B82F6', b3: '#22D3EE' }],
  ].map(([h, o]) => [h, Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? hex(v) : v]))]);
  function palette(h) {
    h = ((h % 24) + 24) % 24;
    let i = 0; while (i < KEYS.length - 2 && h > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]), K = {};
    for (const k of Object.keys(a[1])) { const x = a[1][k], y = b[1][k]; K[k] = typeof x === 'number' ? x + (y - x) * t : mixc(x, y, t); }
    K.nt = 1 - K.dy;
    return K;
  }

  // ───────── geometria ─────────
  function inPoly(P, x, y) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i], b = P[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1);
    return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t));
  }
  // Le pareti oblique ricalcate su una griglia vengono a gradini da pochi centimetri: in 3D sembrano una sega
  // e raddoppiano i pezzi da disegnare. Tra un angolo vero (due lati lunghi) e il successivo si tiene
  // solo ciò che si scosta più di tol metri dalla retta (Douglas-Peucker): i gradini diventano una diagonale,
  // le nicchie e gli sporti veri restano.
  function smoothSteps(P, tol) {
    const n = P.length; if (!(tol > 0) || n < 5) return P;
    const len = i => Math.hypot(P[(i + 1) % n][0] - P[i][0], P[(i + 1) % n][1] - P[i][1]);
    let anchors = []; for (let i = 0; i < n; i++) if (len(i) >= tol * 3.4 && len((i + n - 1) % n) >= tol * 3.4) anchors.push(i);
    if (anchors.length < 2) {
      let far = 1, fd = 0; for (let i = 1; i < n; i++) { const d = Math.hypot(P[i][0] - P[0][0], P[i][1] - P[0][1]); if (d > fd) { fd = d; far = i; } }
      anchors = [0, far].sort((a, b) => a - b);
    }
    const keep = new Array(n).fill(false);
    anchors.forEach((a, k) => {
      const b = anchors[(k + 1) % anchors.length], chain = [a]; for (let i = (a + 1) % n; ; i = (i + 1) % n) { chain.push(i); if (i === b) break; }
      keep[a] = keep[b] = true;
      const stack = [[0, chain.length - 1]];
      while (stack.length) {
        const [s, e] = stack.pop(); let bd = tol, bi = -1;
        for (let j = s + 1; j < e; j++) { const d = distSeg(P[chain[j]], P[chain[s]], P[chain[e]]); if (d > bd) { bd = d; bi = j; } }
        if (bi > 0) { keep[chain[bi]] = true; stack.push([s, bi], [bi, e]); }
      }
    });
    const out = P.filter((_, i) => keep[i]);
    return out.length >= 3 ? out : P;
  }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = []; for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    const up = []; for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  const polyD = (c, P) => { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); c.closePath(); };

  // ───────── sprite: aloni pre-disegnati, così le luci costano poco ─────────
  const SPR = {};
  function glow(name) {
    if (SPR[name]) return SPR[name];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.62)'); g.addColorStop(.5, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return SPR[name] = c;
  }
  const tintCache = new Map();
  function glowTint(col) {
    const key = (col[0] >> 3) + ',' + (col[1] >> 3) + ',' + (col[2] >> 3);
    let c = tintCache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.drawImage(glow('w'), 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; x.fillRect(0, 0, 128, 128);
    if (tintCache.size > 60) tintCache.clear();
    tintCache.set(key, c); return c;
  }
  function halo(ctx, col, x, y, r, a, ry) {
    ctx.globalAlpha = clamp(a, 0, 1); ctx.drawImage(glowTint(col), x - r, y - (ry ?? r), r * 2, (ry ?? r) * 2); ctx.globalAlpha = 1;
  }

  // ───────── arredi: catalogo ─────────
  // Misure in metri. In ogni mobile x è la larghezza, y la profondità con il FRONTE verso +y (rotate: 0 = fronte rivolto
  // a sud della pianta), z l'altezza da terra. Un pezzo è [x0, y0, x1, y1, z0, z1, tono, forma]: il tono moltiplica il
  // colore del mobile (oppure è un colore #rrggbb fisso), la forma 'o' è un tondo.
  const FURN_KEY = 'aurora_casa_3d';
  const FURN_COLORS = ['#7B8DB8', '#B98F62', '#E6E9F0', '#8A5E6B', '#6FA383', '#4B5568', '#D96C5F', '#C9A074'];
  const legs = (w, d, z1, t, tone) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (w / 2 - t * 1.4) - t / 2, b * (d / 2 - t * 1.4) - t / 2, a * (w / 2 - t * 1.4) + t / 2, b * (d / 2 - t * 1.4) + t / 2, 0, z1, tone]);
  const lines = (x0, x1, y, zs, tone) => zs.map(z => [x0, y - .004, x1, y + .004, z, z + .014, tone]);
  const sofaParts = (w, d, h) => [
    [-w / 2, -d / 2, w / 2, d / 2, 0, .14, .55],
    [-w / 2 + .17, -d / 2 + .22, w / 2 - .17, d / 2, .14, .46],
    [-w / 2, -d / 2, w / 2, -d / 2 + .25, .14, h],
    [-w / 2, -d / 2 + .12, -w / 2 + .18, d / 2, .14, .68, .92],
    [w / 2 - .18, -d / 2 + .12, w / 2, d / 2, .14, .68, .92]];
  const bedParts = (w, d) => {
    const p = [[-w / 2, -d / 2, w / 2, d / 2, 0, .26, '#6B5642'], [-w / 2 + .03, -d / 2 + .08, w / 2 - .03, d / 2 - .02, .26, .5, 1], [-w / 2, -d / 2, w / 2, -d / 2 + .08, 0, .95, '#6B5642'], [-w / 2 + .03, -d / 2 + .62, w / 2 - .03, d / 2 - .02, .5, .53, .72]];
    if (w > 1.1) p.push([-w / 2 + .1, -d / 2 + .15, -.04, -d / 2 + .5, .5, .58, 1.1], [.04, -d / 2 + .15, w / 2 - .1, -d / 2 + .5, .5, .58, 1.1]);
    else p.push([-w / 2 + .1, -d / 2 + .15, w / 2 - .1, -d / 2 + .5, .5, .58, 1.1]);
    return p;
  };
  const FURN = {
    sofa: { it: '🛋️ Divano', en: '🛋️ Sofa', s: [2.1, .92, .86], c: '#7B8DB8', parts: sofaParts },
    armchair: { it: '💺 Poltrona', en: '💺 Armchair', s: [.92, .9, .86], c: '#8E7BB8', parts: sofaParts },
    table: { it: '🍽️ Tavolo', en: '🍽️ Table', s: [1.4, .8, .76], c: '#B98F62', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, h - .05, h, 1.1], ...legs(w, d, h - .05, .07, .72)] },
    table_round: { it: '⭕ Tavolo tondo', en: '⭕ Round table', s: [1, 1, .76], c: '#B98F62', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, h - .05, h, 1.1, 'o'], [-.07, -.07, .07, .07, .05, h - .05, .72, 'o'], [-w / 4, -d / 4, w / 4, d / 4, 0, .05, .72, 'o']] },
    chair: { it: '🪑 Sedia', en: '🪑 Chair', s: [.45, .45, .9], c: '#C9A074', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, .4, .45, 1.05], ...legs(w, d, .4, .04, .7), [-w / 2, -d / 2, w / 2, -d / 2 + .05, .45, h, .95]] },
    bed: { it: '🛏️ Letto', en: '🛏️ Bed', s: [1.6, 2, .62], c: '#E8E2D8', parts: bedParts },
    bed_single: { it: '🛏️ Letto singolo', en: '🛏️ Single bed', s: [.9, 2, .62], c: '#E8E2D8', parts: bedParts },
    wardrobe: { it: '🚪 Armadio', en: '🚪 Wardrobe', s: [1.8, .6, 2.1], c: '#CDBA9A', parts: (w, d, h) => {
      const n = Math.max(1, Math.round(w / .6)), p = [[-w / 2, -d / 2, w / 2, d / 2, 0, h]];
      for (let i = 1; i < n; i++) { const x = -w / 2 + w * i / n; p.push([x - .006, d / 2, x + .006, d / 2 + .005, .06, h - .06, .5]); }
      for (let i = 0; i < n; i++) { const x = -w / 2 + w * (i + (i % 2 ? .12 : .88)) / n; p.push([x - .012, d / 2, x + .012, d / 2 + .02, .95, 1.25, .45]); }
      return p;
    } },
    kitchen: { it: '🍳 Mobili cucina', en: '🍳 Kitchen units', s: [2.4, .62, .92], c: '#E6E9F0', parts: (w, d, h, it) => {
      const p = [[-w / 2 + .02, -d / 2 + .02, w / 2 - .02, d / 2 - .02, 0, .1, .35], [-w / 2, -d / 2, w / 2, d / 2 - .01, .1, h - .04], [-w / 2 - .01, -d / 2, w / 2 + .01, d / 2 + .02, h - .04, h, '#59606F']];
      const n = Math.max(1, Math.round(w / .6)); for (let i = 1; i < n; i++) { const x = -w / 2 + w * i / n; p.push([x - .005, d / 2 - .01, x + .005, d / 2 - .004, .12, h - .06, .5]); }
      if (w >= 1.2) p.push([w / 2 - .62, -.2, w / 2 - .12, .2, h, h + .012, '#262B36'], [-w / 2 + .15, -.2, -w / 2 + .7, .2, h, h + .012, '#AEB8C8']);
      if (it && it.upper) p.push([-w / 2, -d / 2, w / 2, -d / 2 + .34, 1.45, 2.15, .95]);
      return p;
    } },
    fridge: { it: '🧊 Frigorifero', en: '🧊 Fridge', s: [.62, .66, 1.85], c: '#D5DAE3', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h], [-w / 2 + .01, d / 2, w / 2 - .01, d / 2 + .004, 1.18, 1.2, .4], [w / 2 - .1, d / 2, w / 2 - .075, d / 2 + .03, 1.25, 1.7, .4], [w / 2 - .1, d / 2, w / 2 - .075, d / 2 + .03, .75, 1.1, .4]] },
    tv: { it: '📺 TV con mobile', en: '📺 TV and stand', s: [1.4, .42, 1.05], c: '#5B4A3E', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, .45], [-.2, -.08, .2, .08, .45, .52, '#10131B'], [-w * .42, -.02, w * .42, .02, .52, h, '#10131B']] },
    desk: { it: '🖥️ Scrivania', en: '🖥️ Desk', s: [1.4, .7, .75], c: '#C2A27A', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, h - .04, h, 1.08], [-w / 2, -d / 2, -w / 2 + .04, d / 2, 0, h - .04, .8], [w / 2 - .42, -d / 2, w / 2, d / 2, 0, h - .04, .9], ...lines(w / 2 - .4, w / 2 - .02, d / 2, [.15, .35, .55], .55)] },
    bookcase: { it: '📚 Libreria', en: '📚 Bookcase', s: [.9, .34, 1.9], c: '#9E7B54', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h], ...lines(-w / 2 + .02, w / 2 - .02, d / 2, [.38, .76, 1.14, 1.52], .55)] },
    dresser: { it: '🗄️ Cassettiera', en: '🗄️ Dresser', s: [.9, .45, .85], c: '#B89B72', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h], ...lines(-w / 2 + .02, w / 2 - .02, d / 2, [h / 3, h * 2 / 3], .55)] },
    nightstand: { it: '🗄️ Comodino', en: '🗄️ Nightstand', s: [.45, .4, .5], c: '#B89B72', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h], ...lines(-w / 2 + .02, w / 2 - .02, d / 2, [h / 2], .55)] },
    plant: { it: '🪴 Pianta', en: '🪴 Plant', s: [.45, .45, 1.25], c: '#4E9A6A', parts: (w, d, h) => [[-w * .36, -d * .36, w * .36, d * .36, 0, .3, '#8B5A3C', 'o'], [-w / 2, -d / 2, w / 2, d / 2, .3, .75, 1, 'o'], [-w * .42, -d * .42, w * .42, d * .42, .75, 1.05, 1.12, 'o'], [-w * .28, -d * .28, w * .28, d * .28, 1.05, h, 1.2, 'o']] },
    carpet: { it: '🟫 Tappeto', en: '🟫 Rug', s: [2.2, 1.5, .02], c: '#8A5E6B', flat: true, parts: (w, d) => [[-w / 2, -d / 2, w / 2, d / 2, 0, .02]] },
    toilet: { it: '🚽 WC', en: '🚽 Toilet', s: [.4, .7, .42], c: '#F1F4F8', parts: (w, d) => [[-w / 2, -d / 2, w / 2, -d / 2 + .2, 0, .78], [-w / 2, -d / 2 + .12, w / 2, d / 2, 0, .42, 1, 'o']] },
    sink: { it: '🚰 Lavabo', en: '🚰 Sink', s: [.6, .46, .9], c: '#E6EAF0', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h - .06], [-w / 2 - .01, -d / 2 - .01, w / 2 + .01, d / 2 + .01, h - .06, h, '#59606F'], [-w * .32, -d * .3, w * .32, d * .3, h, h + .01, '#EDF1F7']] },
    shower: { it: '🚿 Doccia', en: '🚿 Shower', s: [.9, .9, .12], c: '#DDE4EE', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h], [-.06, -.06, .06, .06, h, h + .006, .5, 'o']] },
    bathtub: { it: '🛁 Vasca', en: '🛁 Bathtub', s: [1.7, .75, .56], c: '#F1F4F8', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h], [-w / 2 + .07, -d / 2 + .07, w / 2 - .07, d / 2 - .07, h, h + .006, .78]] },
    washer: { it: '🧺 Lavatrice', en: '🧺 Washer', s: [.6, .6, .85], c: '#F1F4F8', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h], [-.2, d / 2, .2, d / 2 + .012, .2, .62, '#2A3342']] },
    box: { it: '📦 Scatola', en: '📦 Box', s: [1, 1, 1], c: '#8896B3', parts: (w, d, h) => [[-w / 2, -d / 2, w / 2, d / 2, 0, h]] },
  };
  const ALIAS = { divano: 'sofa', poltrona: 'armchair', tavolo: 'table', tavolo_tondo: 'table_round', sedia: 'chair', letto: 'bed', letto_singolo: 'bed_single', armadio: 'wardrobe', cucina: 'kitchen', mobili_cucina: 'kitchen', frigo: 'fridge', frigorifero: 'fridge', scrivania: 'desk', libreria: 'bookcase', cassettiera: 'dresser', comodino: 'nightstand', tappeto: 'carpet', pianta: 'plant', wc: 'toilet', water: 'toilet', lavabo: 'sink', doccia: 'shower', vasca: 'bathtub', lavatrice: 'washer', scatola: 'box' };

  // ───────── importazione della mappa dalla scheda Aurora Casa Viva già presente in una plancia ─────────
  const CV_TYPE = 'custom:aurora-casa-viva';
  function collectCards(node, out, ctx) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(n => collectCards(n, out, ctx)); return; }
    if (node.type === CV_TYPE && node.rooms && typeof node.rooms === 'object') { out.push({ config: node, ...ctx }); return; }
    for (const k of Object.keys(node)) { const v = node[k]; if (v && typeof v === 'object') collectCards(v, out, ctx); }
  }
  // Cerca nelle plance (prima quella principale, poi le altre) la scheda Aurora Casa Viva.
  // spec: 'auto' | true | 'nome-plancia' | { dashboard, view, index }. Serve poter leggere le plance:
  // la lista di tutte le plance la danno solo gli amministratori; per gli altri vale la plancia indicata o quella principale.
  async function findCasaViva(hass, spec) {
    const o = spec && typeof spec === 'object' ? spec : { dashboard: typeof spec === 'string' && spec !== 'auto' ? spec : null };
    const names = {}; const targets = [];
    if (o.dashboard) targets.push(o.dashboard === 'lovelace' ? null : o.dashboard);
    else {
      targets.push(null);
      // 'lovelace' è la plancia principale, già in elenco come null
      try { const list = await hass.callWS({ type: 'lovelace/dashboards/list' }); for (const d of list || []) if (d && d.url_path && d.url_path !== 'lovelace') { targets.push(d.url_path); names[d.url_path] = d.title; } } catch (e) { /* utente non amministratore: resta la plancia principale */ }
    }
    let lastErr = null, readable = 0;
    const hits = [];
    for (const url of targets) {
      let cfg;
      try { cfg = await hass.callWS({ type: 'lovelace/config', url_path: url, force: false }); readable++; }
      catch (e) {
        // una plancia generata in automatico non ha una configurazione salvata: è vuota, non è un errore
        if (e && (e.code === 'config_not_found' || /config_not_found/.test(String(e.message || e)))) { readable++; continue; }
        lastErr = e; continue;
      }
      const views = cfg && Array.isArray(cfg.views) ? cfg.views : [];
      views.forEach((v, vi) => {
        const found = []; collectCards(v, found, {});
        for (const f of found) hits.push({ config: f.config, dashboard: url || 'lovelace', title: names[url] || (url ? url : 'Home'), view: v.title || v.path || String(vi) });
      });
      // basta la scheda richiesta: niente lettura delle altre plance (ognuna è una richiesta, e certe sono pesanti)
      if (hits.filter(h => !o.view || String(h.view).toLowerCase() === String(o.view).toLowerCase()).length > (o.index || 0)) break;
    }
    if (!readable) { const e = new Error(lastErr && (lastErr.message || lastErr.code) ? String(lastErr.message || lastErr.code) : 'lovelace/config'); e.code = 'unreadable'; throw e; }
    let list = hits;
    if (o.view) list = list.filter(h => String(h.view).toLowerCase() === String(o.view).toLowerCase());
    const hit = list[o.index || 0];
    if (!hit) return null;
    const config = JSON.parse(JSON.stringify(hit.config)); delete config.type;
    return { config, meta: { dashboard: hit.dashboard, title: hit.title, view: hit.view, cards: list.length } };
  }
  // la configurazione locale vince su quella importata (le stanze si fondono una per una)
  function mergeConfig(imp, raw) {
    const out = { ...imp };
    for (const [k, v] of Object.entries(raw || {})) {
      if (k === 'type' || k === 'casa_viva') continue;
      if ((k === 'rooms' || k === 'layers' || k === 'short' || k === 'camera') && v && typeof v === 'object' && imp[k] && typeof imp[k] === 'object') {
        out[k] = { ...imp[k] }; for (const [id, r] of Object.entries(v)) out[k][id] = k === 'rooms' && r && typeof r === 'object' ? { ...(imp[k][id] || {}), ...r } : r;
      } else out[k] = v;
    }
    out.type = 'custom:aurora-casa-3d';
    return out;
  }
  window.AuroraCasa3D = { version: AC3_VERSION, findCasaViva, mergeConfig };

  const CSS = `
  :host{display:block}
  ha-card{display:block;overflow:hidden;background:#05080f;color:#E8ECF8;font-family:Manrope,var(--ha-font-family-body,system-ui),sans-serif;border-radius:var(--ha-card-border-radius,18px);border:1px solid rgba(255,255,255,.08);position:relative}
  .wrap{position:relative;touch-action:pan-y}
  canvas.cv{display:block;width:100%;cursor:grab;touch-action:pan-y;-webkit-user-select:none;user-select:none}
  canvas.cv.drag{cursor:grabbing}
  .hud{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;gap:10px;pointer-events:none}
  .glass{background:rgba(6,9,18,.5);backdrop-filter:blur(12px) saturate(1.3);-webkit-backdrop-filter:blur(12px) saturate(1.3);border:1px solid rgba(255,255,255,.13);border-radius:16px;padding:10px 13px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
  .clock{font-family:Sora,Manrope,sans-serif;font-size:28px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}
  .mode{font-size:12px;color:#A3AECB;margin-top:6px}
  .mode b{color:#22D3EE;font-weight:700}
  .mode b.sim{color:#FFC069}
  .info{font-size:13px;color:#C9D1E8;line-height:1.55;text-align:right}
  .info span{color:#A3AECB}
  .info b{font-family:Sora,Manrope,sans-serif;font-weight:600;color:#fff}
  .alarm{display:inline-block;margin-top:4px;font-size:12px;font-weight:700;letter-spacing:.8px;color:#C4B5FD}
  .alarm.trig{color:#FF7A85}
  .pop{position:absolute;right:12px;bottom:12px;width:262px;max-width:calc(100% - 24px);font-size:13px}
  .pop h3{margin:0 0 8px;font-family:Sora,Manrope,sans-serif;font-size:15px;font-weight:600;color:#E8ECF8;display:flex;justify-content:space-between;align-items:center;gap:8px}
  .pop h3 button{border:0;background:rgba(255,255,255,.08);color:#E8ECF8;width:28px;height:28px;border-radius:9px;cursor:pointer;font-size:15px;line-height:1}
  .pop .r{display:flex;justify-content:space-between;gap:10px;padding:2px 0}
  .pop .r span:first-child{color:#A3AECB}
  .pop button.tg{margin-top:8px;width:100%;min-height:38px;border-radius:11px;border:1px solid rgba(34,211,238,.45);background:rgba(34,211,238,.12);color:#E8ECF8;font:inherit;font-size:13px;cursor:pointer}
  .bar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,0))}
  .btns{display:flex;gap:6px;flex-wrap:wrap}
  .btn{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#E8ECF8;border-radius:11px;padding:0 12px;min-height:38px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
  .btn:hover{background:rgba(255,255,255,.09)}
  .btn.on{border-color:rgba(34,211,238,.6);background:rgba(34,211,238,.15)}
  .btn.rec{border-color:rgba(255,92,110,.7);background:rgba(255,92,110,.18)}
  .sunbar{position:relative;height:44px;min-width:0}
  .sunbar canvas{position:absolute;inset:0 0 auto 0;width:100%;height:26px;border-radius:9px;top:4px}
  .sunbar input{position:absolute;left:0;top:0;width:100%;height:34px;margin:0;opacity:0;cursor:grab}
  .sunbar .head{position:absolute;top:0;width:2px;height:34px;background:#fff;box-shadow:0 0 10px #fff,0 0 20px #FFC069;pointer-events:none;transform:translateX(-1px)}
  .sunbar .ticks{position:absolute;left:0;right:0;top:31px;display:flex;justify-content:space-between;font-size:12px;color:#A3AECB;pointer-events:none}
  .narrow .hud{position:static;padding:10px 12px 0;flex-wrap:wrap;background:linear-gradient(180deg,rgba(5,8,15,.9),rgba(5,8,15,0))}
  .narrow .hud .glass{padding:0;background:none;border:0;backdrop-filter:none;box-shadow:none}
  .narrow .info{text-align:left}
  .narrow .pop{position:static;width:auto;max-width:none;margin:0 12px 10px}
  .narrow .bar{grid-template-columns:1fr}
  .narrow .bar .btns:last-child{justify-content:space-between}
  .msg{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:min(440px,calc(100% - 32px));text-align:center;font-size:14px;line-height:1.5}
  .msg b{display:block;font-family:Sora,Manrope,sans-serif;font-weight:600;font-size:16px;margin-bottom:6px}
  .msg span{color:#A3AECB}
  .msg button{margin-top:12px;min-height:38px;padding:0 16px;border-radius:11px;border:1px solid rgba(34,211,238,.45);background:rgba(34,211,238,.12);color:#E8ECF8;font:inherit;font-size:13px;cursor:pointer}
  .msg .dots{display:inline-block;width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:#22D3EE;animation:ac3spin 1s linear infinite;margin-bottom:10px}
  @keyframes ac3spin{to{transform:rotate(360deg)}}
  .narrow .msg{position:relative;left:auto;top:auto;transform:none;margin:24px auto}
  canvas.cv.arrange{touch-action:none;cursor:default}
  .arr{padding:10px 12px;border-top:1px solid rgba(255,255,255,.07);background:rgba(8,12,24,.94);font-size:13px}
  .arr .pal{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
  .arr .pal::-webkit-scrollbar{height:6px}
  .arr .pal::-webkit-scrollbar-thumb{background:rgba(255,255,255,.25);border-radius:3px}
  .arr .chip{flex:0 0 auto;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#E8ECF8;border-radius:10px;padding:0 11px;min-height:38px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
  .arr .chip:hover{background:rgba(34,211,238,.14);border-color:rgba(34,211,238,.5)}
  .arr .hint{color:#A3AECB;padding:2px 0 6px;line-height:1.45}
  .arr .selrow{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;padding:4px 0 8px}
  .arr .selrow b{font-family:Sora,Manrope,sans-serif;font-weight:600}
  .arr .selrow>span{display:inline-flex;gap:5px;align-items:center;color:#A3AECB}
  .arr .mini{min-width:36px;min-height:36px;padding:0 9px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#E8ECF8;font:inherit;font-size:13px;cursor:pointer}
  .arr .mini:hover{background:rgba(34,211,238,.14)}
  .arr .sw1{width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.35);padding:0;cursor:pointer}
  .arr .foot{display:flex;flex-wrap:wrap;gap:6px;align-items:center;border-top:1px solid rgba(255,255,255,.07);padding-top:8px}
  .arr .foot .st{flex:1;color:#A3AECB;font-size:12px;min-width:110px}
  [hidden]{display:none!important}
  `;

  class AuroraCasa3D extends HTMLElement {
    static getStubConfig() {
      return { casa_viva: 'auto' };
    }
    getCardSize() { return 10; }
    getGridOptions() { return { columns: 'full', min_columns: 6 }; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); }

    setConfig(config) {
      if (!config || (!config.rooms && !config.casa_viva)) throw new Error('Aurora Casa 3D: serve "rooms" oppure casa_viva: auto');
      this._raw = config;
      this._L = TXT[config.language === 'en' ? 'en' : config.language === 'it' ? 'it' : (String(navigator.language || '').toLowerCase().startsWith('it') ? 'it' : 'en')];
      this._cvSpec = config.casa_viva || null;
      if (!this._cvSpec) { this._loading = false; this._applyConfig(config); return; }
      // la mappa viene da Aurora Casa Viva: se l'ho già letta (o è in memoria) la uso subito, poi la rileggo
      let imp = this._imported;
      if (!imp) { const c = this._cacheGet(); if (c) { imp = c.config; this._importMeta = c.meta; } }
      if (imp) { const merged = mergeConfig(imp, config); this._loading = false; this._appliedKey = JSON.stringify(merged); this._applyConfig(merged); }
      else {
        this._loading = true;
        this._applyConfig({ ...config, rooms: { _: { name: '', points: '0 0,60 0,60 60,0 60' } } });
      }
      if (this._hass && !this._importStarted) this._importNow();
    }
    // applica una configurazione completa (dopo la lettura o la fusione)
    _applyConfig(cfg) {
      const keep = this._built && !this._loading && this._cam ? { cam: this._cam, tgt: this._tgt, vmode: this._vmode } : null;
      this._config = cfg; this._prep(cfg);
      if (keep && !this._firstReal) { this._cam = keep.cam; this._tgt = keep.tgt; this._vmode = keep.vmode; }
      if (this._built) { this._resize(); this._read(); if (this._firstReal) { this._firstReal = false; this._playIntro(); } }
      this._msgUpdate();
    }
    _viewKey() { return 'ac3-view:' + (this._cvSpec ? (typeof this._cvSpec === 'string' ? this._cvSpec : JSON.stringify(this._cvSpec)) : 'rooms'); }
    _loadView() { try { const v = JSON.parse(localStorage.getItem(this._viewKey()) || 'null'); return v && isFinite(v.yaw) && isFinite(v.pitch) && isFinite(v.zoom) ? v : null; } catch (e) { return null; } }
    _saveViewSoon() {
      if (this._config.remember_view === false) return;
      clearTimeout(this._vt); this._vt = setTimeout(() => this._saveViewNow(), 2500);
    }
    _saveViewNow() {
      if (!this._vt) return; clearTimeout(this._vt); this._vt = 0;
      try { localStorage.setItem(this._viewKey(), JSON.stringify({ yaw: +(this._cam.yaw % 360).toFixed(1), pitch: +this._tgt.pitch.toFixed(1), zoom: +this._tgt.zoom.toFixed(2), vmode: this._vmode })); } catch (e) { /* memoria piena o modalità privata */ }
    }
    _cacheKey() { return 'ac3-casa-viva:' + (typeof this._cvSpec === 'string' ? this._cvSpec : JSON.stringify(this._cvSpec)); }
    _cacheGet() { try { const v = JSON.parse(localStorage.getItem(this._cacheKey()) || 'null'); return v && v.config && v.config.rooms ? v : null; } catch (e) { return null; } }
    async _importNow() {
      if (!this._cvSpec || !this._hass) return;
      this._importStarted = true; this._importErr = null;
      try {
        const hit = await findCasaViva(this._hass, this._cvSpec);
        if (!hit) { const e = new Error(this._L.noCV); e.code = 'none'; throw e; }
        this._imported = hit.config; this._importMeta = hit.meta;
        try { localStorage.setItem(this._cacheKey(), JSON.stringify({ config: hit.config, meta: hit.meta, t: Date.now() })); } catch (e) { /* memoria piena o modalità privata */ }
        const merged = mergeConfig(hit.config, this._raw), key = JSON.stringify(merged);
        const wasLoading = this._loading; this._loading = false;
        if (wasLoading) this._firstReal = true;
        if (key !== this._appliedKey || wasLoading) { this._appliedKey = key; this._applyConfig(merged); }
        console.info('%c AURORA CASA 3D %c mappa letta da Aurora Casa Viva: plancia «' + hit.meta.title + '», vista «' + hit.meta.view + '», ' + Object.keys(hit.config.rooms).length + ' stanze', 'background:#7C5CFF;color:#fff;font-weight:700;border-radius:4px 0 0 4px', '');
      } catch (e) {
        this._importErr = e && e.code === 'none' ? e.message : (this._L.cvFail + ': ' + String(e && e.message || e));
      }
      this._msgUpdate();
    }
    _msgUpdate() {
      const E = this._el; if (!E || !E.msg) return;
      const L = this._L;
      if (this._loading && this._importErr) E.msg.innerHTML = `<b>${L.noCV === this._importErr ? L.noCV : this._importErr}</b><span>${L.noCVHint}</span><br><button data-a="retry">${L.retry}</button>`;
      else if (this._loading) E.msg.innerHTML = `<div class="dots"></div><b>${L.finding}</b>`;
      E.msg.hidden = !this._loading; E.msg.classList.toggle('glass', !!this._loading);
    }
    set hass(h) {
      this._hass = h;
      if (!this._furnLoaded) this._furnLoad();
      if (this._cvSpec && !this._importStarted) this._importNow();
      if (!this._built) this._build();
      this._read();
    }
    get hass() { return this._hass; }

    connectedCallback() {
      this._vis = true;
      if (this._built) { this._observe(); this._resize(); this._start(); }
    }
    disconnectedCallback() {
      this._furnFlush(); this._saveViewNow();
      this._stop();
    }

    // ───────── geometria: stanze, muri con i buchi di porte e finestre, grafo dei cavi ─────────
    _prep(c) {
      const ppm = c.px_per_meter || 54;
      const raw = {}; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [id, r] of Object.entries(c.rooms)) {
        const P = parsePts(r.points); raw[id] = P;
        for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const m = p => [(p[0] - cx) / ppm, (p[1] - cy) / ppm];
      this._ppm = ppm; this._c0 = [cx, cy]; this._m = m;
      const H = c.wall_height ?? 2.7, TH = c.wall_thickness ?? .13;
      this._H = H; this._TH = TH; this._Hin = Math.min(c.inner_wall_height ?? 1.25, H); this._cutH = c.cut_height ?? .2;
      const tol = c.smooth_walls === false ? 0 : typeof c.smooth_walls === 'number' ? c.smooth_walls : .12;

      const rooms = {};
      for (const [id, r] of Object.entries(c.rooms)) {
        const P = smoothSteps(raw[id].map(m), tol);
        let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; }
        const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
        const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        const node = r.node ? m(r.node) : [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
        let cen = [0, 0]; P.forEach(p => { cen[0] += p[0] / P.length; cen[1] += p[1] / P.length; });
        const lab = r.label ? m(r.label) : node;
        rooms[id] = {
          id, name: r.name || id, short: r.short, P, bb, area: Math.abs(a) / 2, outdoor: !!r.outdoor, node: inPoly(P, node[0], node[1]) ? node : (inPoly(P, cen[0], cen[1]) ? cen : node),
          label: lab, spine: null,
          lights: arr(r.light), motion: arr(r.motion), temp: r.temperature, tone: (hash(id) % 7) / 7,
        };
        rooms[id].spine = r.walk ? r.walk.map(m) : [rooms[id].node];
        // bordi: normale verso l'esterno
        rooms[id].E = P.map((p, i) => {
          const q = P[(i + 1) % P.length], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1e-9;
          let n = [dy / L, -dx / L]; const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
          if (inPoly(P, mid[0] + n[0] * .06, mid[1] + n[1] * .06)) n = [-n[0], -n[1]];
          return { room: id, i, A: p, B: q, L, u: [dx / L, dy / L], n, holes: [] };
        });
      }
      this._rooms = rooms;
      const roomAt = (x, y, skip) => { for (const r of Object.values(rooms)) if (r.id !== skip && inPoly(r.P, x, y)) return r.id; return null; };
      this._roomAt = roomAt;
      const ext = [Infinity, Infinity, -Infinity, -Infinity];
      for (const r of Object.values(rooms)) { ext[0] = Math.min(ext[0], r.bb[0]); ext[1] = Math.min(ext[1], r.bb[1]); ext[2] = Math.max(ext[2], r.bb[2]); ext[3] = Math.max(ext[3], r.bb[3]); }
      this._ext = ext;
      const marg = c.ground_margin ?? 2.1;
      this._plat = [[ext[0] - marg, ext[1] - marg], [ext[2] + marg, ext[1] - marg], [ext[2] + marg, ext[3] + marg], [ext[0] - marg, ext[3] + marg]];
      this._R = Math.hypot((ext[2] - ext[0]) / 2 + marg, (ext[3] - ext[1]) / 2 + marg);

      // buchi nei muri: finestre e porte
      const nearestEdge = (rid, p) => {
        const r = rooms[rid]; if (!r) return null; let best = null, bd = 1e9;
        for (const e of r.E) { const d = distSeg(p, e.A, e.B); if (d < bd) { bd = d; best = e; } }
        return best && bd < .55 ? best : null;
      };
      this._openings = arr(c.openings).map((o, oi) => {
        const a = m(o.from), b = m(o.to), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const e = nearestEdge(o.room, mid); const O = { ...o, a, b, mid, n: Array.isArray(o.outside) ? o.outside : OUT_DIR[o.outside || 'left'], sill: o.sill ?? .9, top: o.top ?? 2.2, edge: e, open: 0 };
        if (e) {
          const t0 = (a[0] - e.A[0]) * e.u[0] + (a[1] - e.A[1]) * e.u[1], t1 = (b[0] - e.A[0]) * e.u[0] + (b[1] - e.A[1]) * e.u[1];
          e.holes.push({ t0: clamp(Math.min(t0, t1), 0, e.L), t1: clamp(Math.max(t0, t1), 0, e.L), z0: O.sill, z1: O.top, type: 'win', oi });
        }
        return O;
      });
      this._doorsList = [];
      arr(c.doors).forEach(d => {
        const at = m(d.at);
        for (const rid of arr(d.rooms)) {
          if (rid === 'fuori') continue;
          const e = nearestEdge(rid, at); if (!e) continue;
          const tc = clamp((at[0] - e.A[0]) * e.u[0] + (at[1] - e.A[1]) * e.u[1], 0, e.L), hw = (d.width ?? .92) / 2;
          e.holes.push({ t0: clamp(tc - hw, 0, e.L), t1: clamp(tc + hw, 0, e.L), z0: 0, z1: 2.05, type: 'door' });
        }
      });
      // pezzi di muro (a tratti corti: l'ordine di disegno resta preciso)
      const pieces = [];
      for (const r of Object.values(rooms)) {
        for (const e of r.E) {
          const S = [e.A[0] + e.u[0] * e.L / 2 + e.n[0] * (TH + .1), e.A[1] + e.u[1] * e.L / 2 + e.n[1] * (TH + .1)];
          e.nbMid = roomAt(S[0], S[1], r.id);
          if (r.outdoor && e.nbMid && !rooms[e.nbMid].outdoor) { e.skip = true; continue; }
          const bp = new Set([0, e.L]); e.holes.forEach(h => { bp.add(h.t0); bp.add(h.t1); });
          const ts = [...bp].sort((p, q) => p - q);
          for (let k = 0; k < ts.length - 1; k++) {
            const ta = ts[k], tb = ts[k + 1]; if (tb - ta < .02) continue;
            const mid = (ta + tb) / 2, hs = e.holes.filter(h => h.t0 <= mid && h.t1 >= mid);
            const add = (z0, z1, kind, extra = {}) => {
              const n = kind === 'glass' ? 1 : Math.max(1, Math.ceil((tb - ta) / 1.3));
              for (let q = 0; q < n; q++) pieces.push({ e, room: r.id, ta: lerp(ta, tb, q / n), tb: lerp(ta, tb, (q + 1) / n), z0, z1, kind, last: tb >= e.L - .001 && q === n - 1, ...extra });
            };
            if (r.outdoor) { add(0, .95, 'rail'); continue; }
            if (!hs.length) { add(0, H, 'solid'); continue; }
            const z0 = Math.min(...hs.map(h => h.z0)), z1 = Math.max(...hs.map(h => h.z1)), win = hs.find(h => h.type === 'win');
            if (z0 > .02) add(0, z0, 'solid');
            if (win) add(z0, z1, 'glass', { oi: win.oi });
            if (z1 < H - .02) add(z1, H, 'solid');
          }
        }
      }
      for (const p of pieces) {
        const e = p.e, mid = (p.ta + p.tb) / 2, S = [e.A[0] + e.u[0] * mid + e.n[0] * (TH + .1), e.A[1] + e.u[1] * mid + e.n[1] * (TH + .1)];
        p.nb = roomAt(S[0], S[1], p.room); p.inner = !!(p.nb && !rooms[p.nb].outdoor && !rooms[p.room].outdoor);
        p.cx = e.A[0] + e.u[0] * mid + e.n[0] * TH / 2; p.cy = e.A[1] + e.u[1] * mid + e.n[1] * TH / 2;
      }
      this._pieces = pieces;
      this._door = c.door && c.door.hinge ? { ...c.door, hinge: m(c.door.hinge), len: (c.door.length || 52) / ppm, ang: c.door.angle ?? 85, A: 0 } : null;
      this._devices = arr(c.devices).filter(d => d && d.entity && (d.at || rooms[d.room])).map(d => ({ ...d, at: d.at ? m(d.at) : rooms[d.room].node.slice(), P: 0, tgt: 0 }));
      this._media = arr(c.media);
      this._radars = arr(c.radars).filter(r => r && r.at && rooms[r.room]).map(r => ({ ...r, atm: m(r.at), fov: r.fov ?? 120, range: r.range_mm ?? 6000, ppm: r.ppm ?? ppm }));
      this._panel = c.panel && c.panel.at ? { room: c.panel.room, at: m(c.panel.at) } : null;
      this._outside = c.outside_point ? m(c.outside_point) : null;
      // grafo per i cavi: percorsi delle stanze + porte + quadro + apparecchi
      const N = {}, adj = {};
      const link = (a, b) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); };
      const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
      for (const r of Object.values(rooms)) r.spine.forEach((p, i) => { N[r.id + '#' + i] = p; if (i) link(r.id + '#' + (i - 1), r.id + '#' + i); });
      const nearest = (room, p) => { const r = rooms[room]; if (!r) return null; let bi = 0, bd = 1e9; r.spine.forEach((q, i) => { const d = dist(p, q); if (d < bd) { bd = d; bi = i; } }); return room + '#' + bi; };
      arr(c.doors).forEach((d, k) => { const id = 'door' + k; N[id] = m(d.at); for (const rm of arr(d.rooms)) { if (rm === 'fuori') continue; const n = nearest(rm, N[id]); if (n) link(id, n); } });
      if (this._panel) { N.panel = this._panel.at; const n = nearest(this._panel.room, this._panel.at); if (n) link('panel', n); }
      this._devices.forEach((d, i) => { N['dev' + i] = d.at; const n = nearest(d.room, d.at); if (n) link('dev' + i, n); });
      this._N = N; this._adj = adj; this._routes = {};
      this._dist = dist;
      // elementi decorativi con seme fisso
      seed = 11;
      this._stars = Array.from({ length: 150 }, () => ({ x: rnd(), y: rnd(), r: .5 + rnd() * 1.3, p: rnd() * TAU }));
      this._clouds = Array.from({ length: 7 }, (_, i) => ({ x: rnd(), y: .04 + rnd() * .26, s: .7 + rnd() * .9, k: i / 7 }));
      this._trees = [];
      if (c.trees !== false) {
        const R = this._R, tries = 400;
        for (let i = 0; i < tries && this._trees.length < (c.tree_count ?? 9); i++) {
          const x = lerp(this._plat[0][0] + .5, this._plat[2][0] - .5, rnd()), y = lerp(this._plat[0][1] + .5, this._plat[2][1] - .5, rnd());
          if (x > ext[0] - 1.1 && x < ext[2] + 1.1 && y > ext[1] - 1.1 && y < ext[3] + 1.1) continue;
          if (this._trees.some(t => Math.hypot(t.x - x, t.y - y) < 1.8)) continue;
          this._trees.push({ x, y, h: 1.7 + rnd() * 1.6, r: .55 + rnd() * .35, ph: rnd() * TAU, tone: rnd() });
        }
      }
      this._drops = Array.from({ length: 420 }, () => ({ x: rnd(), y: rnd(), z: rnd(), v: .75 + rnd() * .5, k: rnd() }));
      this._motes = Array.from({ length: 90 }, () => ({ u: rnd(), v: rnd(), p: rnd() * TAU, s: .3 + rnd() }));
      // la casa resta dove la lasci: gira da sola solo con auto_rotate: true, e riapre nella vista in cui l'hai lasciata
      const sv = c.remember_view === false ? null : this._loadView();
      this._cam = { yaw: sv?.yaw ?? c.camera?.yaw ?? -28, pitch: sv?.pitch ?? c.camera?.pitch ?? 50, zoom: sv?.zoom ?? c.camera?.zoom ?? 1, vy: 0, auto: c.auto_rotate === true };
      this._tgt = { pitch: this._cam.pitch, zoom: this._cam.zoom };
      this._vmode = sv?.vmode ?? 0;
      this._lit = {}; this._ppl = new Map(); this._wx = this._wxFrom('sunny');
      this._furnBuild();
    }

    _route(a, b) {
      const key = a + '>' + b; if (this._routes[key]) return this._routes[key];
      const N = this._N, adj = this._adj, D = { [a]: 0 }, P = {}, Q = new Set(Object.keys(N));
      while (Q.size) {
        let u = null; for (const q of Q) if (D[q] !== undefined && (u === null || D[q] < D[u])) u = q;
        if (u === null || u === b) break; Q.delete(u);
        for (const v of adj[u] || []) { const nd = D[u] + this._dist(N[u], N[v]); if (D[v] === undefined || nd < D[v]) { D[v] = nd; P[v] = u; } }
      }
      const path = [b]; while (path[0] !== a && P[path[0]]) path.unshift(P[path[0]]);
      if (path[0] !== a) return this._routes[key] = null;
      return this._routes[key] = path.map(k => N[k]);
    }

    // ───────── interfaccia ─────────
    _build() {
      this._built = true;
      const L = this._L, c = this._config;
      if (c.fonts !== false && window.AURORA_CASA_3D_FONTS !== false && !document.getElementById('ac3-fonts')) {
        const l = document.createElement('link'); l.id = 'ac3-fonts'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap';
        document.head.appendChild(l);
      }
      this.shadowRoot.innerHTML = `<style>${CSS}</style>
      <ha-card>
        <div class="wrap" data-k="wrap">
          <div class="hud">
            <div class="glass"><div class="clock" data-k="clock">--:--</div><div class="mode" data-k="mode"></div></div>
            <div class="glass info" data-k="info"></div>
          </div>
          <canvas class="cv" data-k="cv" role="img" aria-label="${L.title}"></canvas>
          <div class="glass pop" data-k="pop" hidden></div>
          <div class="msg glass" data-k="msg" hidden></div>
        </div>
        <div class="arr" data-k="arr" hidden></div>
        <div class="bar">
          <div class="btns"><button class="btn on" data-k="orbit">${L.orbit}</button><button class="btn" data-k="view">${L.view}: ${L.house}</button>${c.furniture_edit === false ? '' : `<button class="btn" data-k="arrBtn">${L.arrange}</button>`}</div>
          <div class="sunbar"><canvas data-k="strip"></canvas><input type="range" min="0" max="1439" step="1" value="720" data-k="range" aria-label="${L.day}"><div class="head" data-k="head"></div><div class="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>
          <div class="btns"><button class="btn" data-k="now">${L.now}</button><button class="btn" data-k="photo">${L.photo}</button><button class="btn" data-k="short">${L.short}</button></div>
        </div>
      </ha-card>`;
      const E = this._el = {};
      this.shadowRoot.querySelectorAll('[data-k]').forEach(n => { E[n.dataset.k] = n; });
      this._card = this.shadowRoot.querySelector('ha-card');
      this._ctx = E.cv.getContext('2d');
      this._shc = document.createElement('canvas');
      this._rt = 0; this._last = 0; this._idle = 99; this._sim = null; this._hudT = 0;
      this._reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this._reduce) this._cam.auto = false;
      E.orbit.classList.toggle('on', this._cam.auto);
      if (this._vmode > 0) E.view.textContent = `${L.view}: ${this._views()[this._vmode].n}`;
      this._bind();
      this._resize();
      if (!this._loading) this._playIntro(); else this._firstReal = true;
      this._msgUpdate();
      this._idle = 0;
      this._start();
    }

    // apertura: la camera arriva dall'alto e da lontano
    _playIntro() {
      if (this._reduce || this._config.intro !== true) return;
      this._introYaw = this._cam.yaw; this._cam.yaw -= 85; this._cam.pitch = 84; this._cam.zoom = .6; this._intro = 4;
    }

    _bind() {
      const E = this._el, cv = E.cv, cam = this._cam, pts = new Map();
      let down = null, pinch = 0;
      cv.addEventListener('pointerdown', ev => {
        cv.setPointerCapture(ev.pointerId);
        if (this._edit) {
          // in modalità Arreda un mobile sotto il dito si sposta; altrimenti si gira la casa come sempre
          const r0 = cv.getBoundingClientRect(), fx = (ev.clientX - r0.left) / r0.width * this._cw, fy = (ev.clientY - r0.top) / r0.height * this._ch, hit = this._pickFurn(fx, fy), p0 = hit && this._unproject(fx, fy);
          if (hit && p0) { this._furnSel = hit; this._fdrag = { it: hit, id: ev.pointerId, off: [p0[0] - hit.m[0], p0[1] - hit.m[1]], moved: false }; this._pushUndo(); this._arrUI(); cv.classList.add('drag'); return; }
        }
        pts.set(ev.pointerId, [ev.clientX, ev.clientY]);
        down = { x: ev.clientX, y: ev.clientY, t: performance.now(), moved: 0, lx: ev.clientX, ly: ev.clientY, id: ev.pointerId };
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
        this._idle = 0; cam.vy = 0; cv.classList.add('drag');
      });
      cv.addEventListener('pointermove', ev => {
        if (this._fdrag && ev.pointerId === this._fdrag.id) { this._furnDrag(ev); return; }
        if (!pts.has(ev.pointerId)) return;
        pts.set(ev.pointerId, [ev.clientX, ev.clientY]); this._idle = 0;
        if (pts.size === 2) {
          const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (pinch) { this._tgt.zoom = clamp(this._tgt.zoom * d / pinch, .6, 2.6); cam.zoom = this._tgt.zoom; }
          pinch = d; if (down) down.moved = 99; return;
        }
        if (!down || ev.pointerId !== down.id) return;
        const dx = ev.clientX - down.lx, dy = ev.clientY - down.ly; down.lx = ev.clientX; down.ly = ev.clientY;
        down.moved += Math.abs(dx) + Math.abs(dy);
        cam.yaw += dx * .42; cam.vy = dx * .42 * 60 * .5;
        this._tgt.pitch = clamp(this._tgt.pitch - dy * .25, 18, 88); cam.pitch = this._tgt.pitch;
        if (this._tgtMode) this._vmode = -1;
      });
      const up = ev => {
        if (this._fdrag && ev.pointerId === this._fdrag.id) { const d = this._fdrag; this._fdrag = null; cv.classList.remove('drag'); if (d.moved) this._furnSaveSoon(); else if (this._hist) this._hist.pop(); this._arrUI(); return; }
        pts.delete(ev.pointerId); cv.classList.remove('drag'); pinch = 0; this._saveViewSoon();
        if (!down || ev.pointerId !== down.id) return;
        const dt = performance.now() - down.t, moved = down.moved; const d0 = down; down = null;
        if (moved < 7) {
          const r = cv.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * this._cw, sy = (ev.clientY - r.top) / r.height * this._ch;
          this._tap(sx, sy, dt > 480);
        } else if (Math.abs(cam.vy) < 4) cam.vy = 0;
      };
      cv.addEventListener('pointerup', up);
      // il browser si prende il gesto (per esempio per scorrere la pagina): nessun tocco
      cv.addEventListener('pointercancel', ev => { if (this._fdrag) { this._fdrag = null; this._furnSaveSoon(); } pts.delete(ev.pointerId); cv.classList.remove('drag'); pinch = 0; down = null; });
      // la rotella zooma solo con Ctrl (o Cmd, o il pizzico del trackpad): altrimenti la pagina scorre normalmente
      cv.addEventListener('wheel', ev => { if (!(ev.ctrlKey || ev.metaKey)) return; ev.preventDefault(); this._idle = 0; this._tgt.zoom = clamp(this._tgt.zoom * Math.exp(-ev.deltaY * .0012), .6, 2.6); this._saveViewSoon(); }, { passive: false });
      cv.addEventListener('dblclick', () => { this._resetView(); });
      E.orbit.addEventListener('click', () => { cam.auto = !cam.auto; this._idle = cam.auto ? 99 : 0; E.orbit.classList.toggle('on', cam.auto); });
      E.view.addEventListener('click', () => this._nextView());
      E.range.addEventListener('input', () => {
        const d = new Date(); d.setHours(0, 0, 0, 0); this._setSim(d.getTime() + (+E.range.value) * MIN);
      });
      E.now.addEventListener('click', () => this._setSim(null));
      E.photo.addEventListener('click', () => this._photo());
      if (E.arrBtn) E.arrBtn.addEventListener('click', () => this._arrToggle());
      E.arr.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) this._arrAct(b.dataset); });
      E.short.addEventListener('click', () => this._recordShort());
      E.msg.addEventListener('click', ev => { if (ev.target.closest('[data-a=retry]')) { this._importStarted = false; this._importErr = null; this._loading = true; this._msgUpdate(); this._importNow(); } });
      E.pop.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.a === 'close') { this._sel = null; E.pop.hidden = true; }
        if (b.dataset.a === 'toggle' && this._sel) this._toggleRoom(this._sel);
      });
      this._observe();
    }
    // si ferma quando la scheda esce dalla vista e riparte quando torna
    _observe() {
      if (this._ro) this._ro.disconnect(); if (this._io) this._io.disconnect();
      if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this._el.wrap); }
      if (window.IntersectionObserver) { this._io = new IntersectionObserver(es => { this._vis = es.some(e => e.isIntersecting); }, { threshold: 0 }); this._io.observe(this); }
    }

    _setSim(ms) {
      this._sim = ms; this._el.now.classList.toggle('on', ms != null);
      if (ms != null) { const d = new Date(ms); this._el.range.value = d.getHours() * 60 + d.getMinutes(); }
      this._read();
      this.dispatchEvent(new CustomEvent('ac3-time', { detail: { ms }, bubbles: true, composed: true }));
    }
    _time() { return this._sim ?? Date.now(); }

    // alba, mezzogiorno solare e tramonto del giorno indicato (serve per i pulsanti rapidi della demo)
    _sunTimes(day = new Date()) {
      const hc = this._hass?.config || {}, lat = hc.latitude ?? this._config.latitude ?? 41.9, lon = hc.longitude ?? this._config.longitude ?? 12.5;
      const d0 = new Date(day); d0.setHours(0, 0, 0, 0); let rise = null, set = null, noon = d0.getTime() + 12 * 60 * MIN, best = -90;
      let prev = sunAt(d0.getTime(), lat, lon).el;
      for (let m = 1; m <= 1440; m++) {
        const t = d0.getTime() + m * MIN, e = sunAt(t, lat, lon).el;
        if (prev < 0 && e >= 0 && rise == null) rise = t; if (prev >= 0 && e < 0 && set == null) set = t;
        if (e > best) { best = e; noon = t; } prev = e;
      }
      return { rise, set, noon };
    }

    _views() { return [{ n: this._L.house, pitch: 50, zoom: 1 }, { n: this._L.top, pitch: 84, zoom: 1.04 }, { n: this._L.cinema, pitch: 27, zoom: 1.3 }]; }
    _nextView() {
      this._vmode = (this._vmode + 1) % 3; const v = this._views()[this._vmode];
      this._tgt.pitch = v.pitch; this._tgt.zoom = v.zoom; this._el.view.textContent = `${this._L.view}: ${v.n}`; this._idle = 0; this._saveViewSoon();
    }
    _resetView() {
      const c = this._config; this._vmode = 0; this._tgt.pitch = c.camera?.pitch ?? 50; this._tgt.zoom = c.camera?.zoom ?? 1;
      this._el.view.textContent = `${this._L.view}: ${this._L.house}`; this._saveViewSoon();
    }

    _resize() {
      if (!this._built) return;
      const E = this._el, W = Math.max(280, Math.round(E.wrap.clientWidth || 640)), c = this._config;
      this._narrow = W < 560; this._card.classList.toggle('narrow', this._narrow);
      const ratio = c.height ? c.height / W : (W < 520 ? .98 : W < 900 ? .86 : .7);
      const dpr = clamp((window.devicePixelRatio || 1) * (c.quality ?? 1), .75, c.max_dpr ?? 2);
      this._dpr = dpr; this._cssW = W; this._cssH = Math.round(W * ratio);
      E.cv.width = Math.round(W * dpr); E.cv.height = Math.round(this._cssH * dpr);
      E.cv.style.height = this._cssH + 'px';
      this._cw = E.cv.width; this._ch = E.cv.height;
      this._drawStrip();
    }

    // barra del sole: il colore del cielo ora per ora e la curva dell'altezza del sole
    _drawStrip() {
      const cv = this._el.strip, w = Math.max(60, cv.clientWidth || 300), h = 26, dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const x = cv.getContext('2d'); x.scale(dpr, dpr);
      const hc = this._hass?.config || {}, lat = hc.latitude ?? this._config.latitude ?? 41.9, lon = hc.longitude ?? this._config.longitude ?? 12.5;
      const d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const els = [];
      for (let i = 0; i <= w; i += 2) els.push(sunAt(d0.getTime() + i / w * DAY, lat, lon));
      els.forEach((s, i) => { const K = palette(this._skyHour(s)); x.fillStyle = rgba(mixc(K.s1, K.s3, .55), 1); x.fillRect(i * 2, 0, 2, h); });
      x.beginPath(); x.moveTo(0, h);
      els.forEach((s, i) => { const y = h - clamp((s.el + 6) / 66, 0, 1) * (h - 3); x.lineTo(i * 2, y); });
      x.lineTo(w, h); x.closePath(); x.fillStyle = 'rgba(255,214,150,.42)'; x.fill();
      x.beginPath(); els.forEach((s, i) => { const y = h - clamp((s.el + 6) / 66, 0, 1) * (h - 3); i ? x.lineTo(i * 2, y) : x.moveTo(0, y); });
      x.strokeStyle = 'rgba(255,236,190,.95)'; x.lineWidth = 1.5; x.stroke();
      this._stripKey = new Date().getDate();
    }

    // ora "equivalente" per la palette del cielo: segue l'alba e il tramonto veri del posto
    _skyHour(s) {
      const el = s.el;
      if (s.az < 180) return el < -18 ? 3 : el < -8 ? lerp(3, 5, (el + 18) / 10) : el < 0 ? lerp(5, 6.5, (el + 8) / 8) : el < 15 ? lerp(6.5, 8.5, el / 15) : el < 40 ? lerp(8.5, 12, (el - 15) / 25) : 12;
      return el >= 45 ? 12 : el > 15 ? lerp(16.5, 12, (el - 15) / 30) : el > 0 ? lerp(18.5, 16.5, el / 15) : el > -8 ? lerp(20.5, 18.5, (el + 8) / 8) : el > -18 ? lerp(22, 20.5, (el + 18) / 10) : 22;
    }

    // ───────── stato dai sensori ─────────
    _wxFrom(cond, a = {}) {
      const cc = a.cloud_coverage != null ? a.cloud_coverage / 100 : (CLOUDY[cond] ?? .3);
      const unit = a.wind_speed_unit || 'km/h';
      const ws = a.wind_speed != null ? (unit === 'm/s' ? a.wind_speed : unit === 'mph' ? a.wind_speed * .447 : a.wind_speed / 3.6) : 2;
      return { cond, cloud: clamp(Math.max(cc, RAINY[cond] ? .85 : 0), 0, 1), rain: RAINY[cond] || 0, snow: SNOWY[cond] || 0, wind: ws, out: a.temperature ?? null, storm: /lightning/.test(cond) };
    }
    _read() {
      const h = this._hass; if (!h || !this._rooms) return;
      const S = e => h.states && h.states[e], num = e => { const s = S(e); return s ? parseFloat(s.state) : NaN; };
      const st = this._st = { lights: {}, rgb: {}, bri: {}, temp: {}, pres: {}, stuck: {}, radars: [], alarm: null };
      // un sensore di movimento (PIR) resta «acceso» al massimo qualche minuto: se è fermo su «acceso» da più di
      // motion_timeout minuti (10 di serie, 0 = mai) ha perso il messaggio di «spento» e non è una persona.
      // I sensori di presenza (radar, device_class occupancy) possono restare accesi per ore.
      const tmo = (this._config.motion_timeout ?? 10) * MIN, nowMs = Date.now();
      const moving = (e, room) => {
        const s = S(e); if (!s || s.state !== 'on') return false;
        if (tmo > 0 && s.attributes && s.attributes.device_class === 'motion') {
          const t = Date.parse(s.last_changed);
          if (isFinite(t) && nowMs - t > tmo) { st.stuck[room] = Math.max(st.stuck[room] || 0, Math.round((nowMs - t) / MIN)); return false; }
        }
        return true;
      };
      for (const r of Object.values(this._rooms)) {
        let on = false, rgb = null, bri = 0;
        for (const e of r.lights) { const s = S(e); if (s && s.state === 'on') { on = true; const a = s.attributes || {}; if (Array.isArray(a.rgb_color)) rgb = a.rgb_color; bri = Math.max(bri, a.brightness != null ? a.brightness / 255 : 1); } }
        st.lights[r.id] = on; st.rgb[r.id] = rgb; st.bri[r.id] = on ? Math.max(.35, bri) : 0;
        if (r.temp) { const v = num(r.temp); if (!isNaN(v)) st.temp[r.id] = v; }
        st.pres[r.id] = r.motion.map(e => moving(e, r.id)).some(Boolean);
      }
      this._openings.forEach(o => { o.tgt = o.entity && S(o.entity) && S(o.entity).state === 'on' ? 1 : 0; });
      if (this._door) this._door.tgt = this._door.entity && S(this._door.entity) && S(this._door.entity).state === 'on' ? 1 : 0;
      let sum = 0;
      this._devices.forEach(d => { const v = num(d.entity); d.tgt = isNaN(v) ? 0 : Math.max(0, v); sum += d.tgt; });
      const tot = this._config.power_total ? num(this._config.power_total) : NaN; st.total = isNaN(tot) ? sum : tot;
      st.media = this._media.map(m => S(m.entity) && /^(playing|on)$/.test(S(m.entity).state));
      st.alarm = this._config.alarm && S(this._config.alarm) ? S(this._config.alarm).state : null;
      const w = this._config.weather && S(this._config.weather); this._wx = w ? this._wxFrom(w.state, w.attributes) : this._wxFrom('sunny');
      this._radars.forEach(r => {
        const o = { on: r.presence ? !!(S(r.presence) && S(r.presence).state === 'on') : false, t: [null, null, null] };
        if (r.type === 'ld2450') for (let i = 1; i <= 3; i++) {
          const x = num(`${r.prefix}_target_${i}_x`), y = num(`${r.prefix}_target_${i}_y`);
          if (isFinite(x) && isFinite(y) && !(x === 0 && y === 0) && Math.hypot(x, y) <= r.range) o.t[i - 1] = this._ldPos(r, x, y);
        }
        if (o.on || o.t.some(Boolean)) st.pres[r.room] = true;
        st.radars.push(o);
      });
    }
    _ldPos(r, x, y) {
      // stessa formula di Aurora Casa Viva: x laterale (flip = positivo a sinistra), y in avanti, in millimetri
      const A = (r.angle || 0) * RAD, fx = Math.cos(A), fy = Math.sin(A), sg = r.flip ? -1 : 1, k = r.ppm / 1000, ks = (r.ppm_side ?? r.ppm) / 1000;
      const px = r.at[0] + (y * k * fx + sg * x * ks * -fy), py = r.at[1] + (y * k * fy + sg * x * ks * fx);
      return this._m([px, py]);
    }

    // ───────── interazione con le stanze ─────────
    _unproject(sx, sy) {
      const F = this._lastF; if (!F) return null;
      const xr = (sx - F.ox) / F.s, yr = (sy - F.oy) / (F.s * F.sp);
      return [xr * F.cy + yr * F.sy, -xr * F.sy + yr * F.cy];
    }
    _tap(sx, sy, long) {
      const p = this._unproject(sx, sy); if (!p) return;
      if (this._edit) {
        // in modalità Arreda il tocco sceglie il mobile o la stanza dove metterlo: non accende nessuna luce
        this._furnSel = this._pickFurn(sx, sy); this._sel = null;
        if (!this._furnSel) for (const r of Object.values(this._rooms)) if (!r.outdoor && inPoly(r.P, p[0], p[1])) this._sel = r.id;
        this._arrUI(); return;
      }
      let id = null; for (const r of Object.values(this._rooms)) if (!r.outdoor && inPoly(r.P, p[0], p[1])) id = r.id;
      if (!id) for (const r of Object.values(this._rooms)) if (inPoly(r.P, p[0], p[1])) id = r.id;
      if (!id) { this._sel = null; this._el.pop.hidden = true; return; }
      if (!long && this._config.tap_action === 'toggle') { this._sel = id; this._toggleRoom(id); this._showPop(); return; }
      this._sel = id; this._showPop();
    }
    _toggleRoom(id) {
      const r = this._rooms[id]; if (!r || !this._hass || !r.lights.length) return;
      for (const e of r.lights) { const dom = e.split('.')[0]; this._hass.callService(['light', 'switch', 'input_boolean'].includes(dom) ? dom : 'homeassistant', 'toggle', { entity_id: e }); }
      setTimeout(() => this._showPop(), 400);
    }
    _showPop() {
      const id = this._sel, E = this._el, L = this._L; if (!id) return;
      const r = this._rooms[id], st = this._st || {}, F = this._lastF;
      const rows = [];
      if (st.temp && st.temp[id] != null) rows.push([L.temp, st.temp[id].toLocaleString(L.locale, { maximumFractionDigits: 1 }) + ' °C']);
      if (r.lights.length) rows.push([L.light, st.lights[id] ? L.on : L.off]);
      if (r.motion.length || this._radars.some(x => x.room === id)) rows.push([L.presence, st.pres[id] ? L.yes : L.no]);
      if (st.stuck && st.stuck[id]) rows.push([L.stuck, st.stuck[id] + ' min']);
      if (F && F.sunIn && F.sunIn[id] > .05) rows.push([L.sunin, Math.round(F.sunIn[id] * 100) + ' %']);
      const devs = this._devices.filter(d => d.room === id && d.P > 5);
      devs.forEach(d => rows.push([d.name || d.entity, Math.round(d.P).toLocaleString(L.locale) + ' W']));
      E.pop.hidden = false;
      E.pop.innerHTML = `<h3><span>${r.name}</span><button data-a="close" aria-label="${L.close}">×</button></h3>${rows.map(x => `<div class="r"><span>${x[0]}</span><span>${x[1]}</span></div>`).join('')}${r.lights.length ? `<button class="tg" data-a="toggle">${L.toggle}</button>` : ''}`;
    }

    // ───────── arredi: lettura, salvataggio, modifica ─────────
    // L'elenco viene da quello salvato con il pulsante «Arreda» (nei dati dell'utente di Home Assistant, così lo ritrovi su
    // ogni dispositivo) oppure, se non c'è, da "furniture" scritto nella configurazione.
    _toPx(m) { return [m[0] * this._ppm + this._c0[0], m[1] * this._ppm + this._c0[1]]; }
    _furnItem(f) {
      const key = String(f && f.type || '').toLowerCase(), type = FURN[key] ? key : ALIAS[key], def = FURN[type];
      if (!def || !Array.isArray(f.at) || !isFinite(f.at[0]) || !isFinite(f.at[1])) return null;
      const num = (v, d) => isFinite(+v) && +v > 0 ? +v : d;
      const it = { id: ++this._fid, type, at: [+f.at[0], +f.at[1]], size: [num(Array.isArray(f.size) ? f.size[0] : null, def.s[0]), num(Array.isArray(f.size) ? f.size[1] : null, def.s[1])], height: num(f.height, def.s[2]), rotate: +f.rotate || 0, color: /^#[0-9a-f]{6}$/i.test(f.color || '') ? f.color : null, upper: !!f.upper };
      this._furnGeom(it); return it;
    }
    _furnGeom(it) {
      const def = FURN[it.type], w = it.size[0], d = it.size[1], h = it.height, th = it.rotate * RAD, cs = Math.cos(th), sn = Math.sin(th), m = this._m(it.at);
      it.m = m; it.base = hex(it.color || def.c);
      const tr = (x, y) => [m[0] + x * cs - y * sn, m[1] + x * sn + y * cs], all = [];
      it.parts = def.parts(w, d, h, it).map(p => {
        const [x0, y0, x1, y1, z0, z1, tone, shape] = p; let poly;
        if (shape === 'o') { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2; poly = Array.from({ length: 12 }, (_, i) => tr(cx + Math.cos(i / 12 * TAU) * rx, cy + Math.sin(i / 12 * TAU) * ry)); }
        else poly = [tr(x0, y0), tr(x1, y0), tr(x1, y1), tr(x0, y1)];
        const col = typeof tone === 'string' ? hex(tone) : tone != null ? mulc(it.base, tone) : it.base;
        all.push(...poly);
        return { poly, z0, z1, col, round: shape === 'o', cx: poly.reduce((a, q) => a + q[0], 0) / poly.length, cy: poly.reduce((a, q) => a + q[1], 0) / poly.length };
      });
      it.fp = hull(all); it.room = this._roomAt(m[0], m[1]);
    }
    _furnBuild() {
      this._fid = this._fid || 0; this._furn = []; this._furnSel = null;
      if (!this._rooms) return;
      const list = this._furnSaved || arr(this._config.furniture);
      for (const f of list) { const it = this._furnItem(f); if (it) this._furn.push(it); }
    }
    _furnPlain() {
      return (this._furn || []).map(it => {
        const def = FURN[it.type], o = { type: it.type, at: [+it.at[0].toFixed(1), +it.at[1].toFixed(1)] };
        if (Math.abs(it.size[0] - def.s[0]) > .004 || Math.abs(it.size[1] - def.s[1]) > .004) o.size = [+it.size[0].toFixed(2), +it.size[1].toFixed(2)];
        if (Math.abs(it.height - def.s[2]) > .004) o.height = +it.height.toFixed(2);
        if (it.rotate) o.rotate = Math.round(it.rotate);
        if (it.color) o.color = it.color;
        if (it.upper) o.upper = true;
        return o;
      });
    }
    _furnYaml() {
      const f = o => '  - type: ' + o.type + '\n    at: [' + o.at.join(', ') + ']' + (o.size ? '\n    size: [' + o.size.join(', ') + ']' : '') + (o.height ? '\n    height: ' + o.height : '') + (o.rotate ? '\n    rotate: ' + o.rotate : '') + (o.color ? '\n    color: "' + o.color + '"' : '') + (o.upper ? '\n    upper: true' : '');
      return 'furniture:\n' + this._furnPlain().map(f).join('\n') + '\n';
    }
    async _furnLoad() {
      if (this._furnLoaded || !this._hass) return;
      this._furnLoaded = true;
      let v = null;
      try { const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: FURN_KEY }); v = r && r.value; } catch (e) { /* Home Assistant senza dati salvati */ }
      if (!v) { try { v = JSON.parse(localStorage.getItem('ac3-furn') || 'null'); } catch (e) { /* niente */ } }
      if (v && Array.isArray(v.furniture)) { this._furnSaved = v.furniture; if (this._rooms && !this._loading) this._furnBuild(); }
    }
    _furnSaveSoon() { this._furnWhere = 'saving'; this._arrStatus(); clearTimeout(this._fst); this._fst = setTimeout(() => this._furnSave(), 700); }
    async _furnSave() {
      clearTimeout(this._fst); this._fst = 0;
      const value = { v: 1, furniture: this._furnPlain() }; this._furnSaved = value.furniture;
      let where = this._hass.config && this._hass.config.version === 'demo' ? 'local' : 'ha';
      try { await this._hass.callWS({ type: 'frontend/set_user_data', key: FURN_KEY, value }); }
      catch (e) { where = 'local'; try { localStorage.setItem('ac3-furn', JSON.stringify(value)); } catch (e2) { where = 'none'; } }
      this._furnWhere = where; this._arrStatus();
    }
    _furnFlush() { if (this._fst) this._furnSave(); }
    _pickFurn(sx, sy) {
      let best = null;
      for (const it of this._furn || []) if (it._hull && inPoly(it._hull, sx, sy) && (!best || it._d > best._d)) best = it;
      return best;
    }
    _pushUndo() { (this._hist = this._hist || []).push(JSON.stringify(this._furnPlain())); if (this._hist.length > 30) this._hist.shift(); }
    _arrStatus() {
      const s = this._el && this._el.arr && this._el.arr.querySelector('.st'); if (!s) return; const L = this._L;
      s.textContent = this._furnWhere === 'saving' ? L.arr_saving : this._furnWhere === 'ha' ? L.arr_saved_ha : this._furnWhere === 'local' ? L.arr_saved_local : this._furnWhere === 'none' ? L.arr_nosave : '';
    }
    _arrToggle(on) {
      const E = this._el; this._edit = on ?? !this._edit;
      E.arrBtn.classList.toggle('on', this._edit); E.arr.hidden = !this._edit; E.cv.classList.toggle('arrange', this._edit);
      if (this._edit) { this._cam.auto = false; E.orbit.classList.remove('on'); this._sel = null; E.pop.hidden = true; this._arrUI(); }
      else { this._furnSel = null; this._fdrag = null; this._furnFlush(); }
    }
    _arrUI() {
      const E = this._el, L = this._L, it = this._furnSel, lang = L === TXT.en ? 'en' : 'it';
      const g = (a, v, t, tt) => `<button class="mini" data-a="${a}" data-v="${v}" aria-label="${tt || t}">${t}</button>`;
      const sl = E.arr.querySelector('.pal') ? E.arr.querySelector('.pal').scrollLeft : 0;
      const chips = Object.entries(FURN).map(([k, d]) => `<button class="chip" data-a="add" data-v="${k}">${d[lang]}</button>`).join('');
      const sel = it ? `<div class="selrow"><b>${FURN[it.type][lang].replace(/^\S+\s/, '')}</b>
        <span>${L.arr_rot} ${g('rot', -15, '⟲', L.arr_rot + ' −15°')}${g('rot', 15, '⟳', L.arr_rot + ' +15°')}${g('rot', 90, '90°')}</span>
        <span>${L.arr_w} ${g('w', -.1, '−')}${g('w', .1, '+')}</span>
        <span>${L.arr_d} ${g('d', -.1, '−')}${g('d', .1, '+')}</span>
        <span>${L.arr_h} ${g('h', -.1, '−')}${g('h', .1, '+')}</span>
        <span>${L.arr_move} ${g('mv', 'l', '◀')}${g('mv', 'u', '▲')}${g('mv', 'd', '▼')}${g('mv', 'r', '▶')}</span>
        <span class="sw">${FURN_COLORS.map(c => `<button class="sw1" data-a="col" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</span>
        ${it.type === 'kitchen' ? `<span>${g('upper', 0, it.upper ? L.arr_upper_off : L.arr_upper_on)}</span>` : ''}
        <span>${g('dup', 0, L.arr_dup)}${g('del', 0, L.arr_del)}</span></div>` : `<div class="hint">${L.arr_hint}</div>`;
      E.arr.innerHTML = `<div class="pal">${chips}</div>${sel}<div class="foot">${g('undo', 0, '↶ ' + L.arr_undo)}${g('copy', 0, L.arr_copy)}${g('reset', 0, L.arr_reset)}<span class="st"></span>${g('done', 0, L.arr_done)}</div>`;
      const p = E.arr.querySelector('.pal'); if (p) p.scrollLeft = sl; this._arrStatus();
    }
    _arrAct(ds) {
      const a = ds.a, v = ds.v, it = this._furnSel, L = this._L;
      const clampSize = (x, lo, hi) => Math.round(clamp(x, lo, hi) * 100) / 100;
      if (a === 'done') { this._arrToggle(false); return; }
      if (a === 'copy') {
        const txt = this._furnYaml(), ok = () => { const b = this._el.arr.querySelector('[data-a=copy]'); if (b) { b.textContent = L.arr_copied; setTimeout(() => { if (b.isConnected) b.textContent = L.arr_copy; }, 1500); } };
        try { navigator.clipboard.writeText(txt).then(ok, () => window.prompt(L.arr_copy, txt)); } catch (e) { window.prompt(L.arr_copy, txt); }
        return;
      }
      if (a === 'reset') {
        if (!window.confirm(L.arr_reset_q)) return;
        this._furnSaved = null; this._hist = []; this._furnBuild();
        try { localStorage.removeItem('ac3-furn'); } catch (e) { /* niente */ }
        this._hass.callWS({ type: 'frontend/set_user_data', key: FURN_KEY, value: { v: 1, reset: true } }).catch(() => { /* niente */ });
        this._furnWhere = ''; this._arrUI(); return;
      }
      if (a === 'undo') {
        const s = this._hist && this._hist.pop(); if (!s) return;
        this._furnSaved = JSON.parse(s); this._furnBuild(); this._furnSaveSoon(); this._arrUI(); return;
      }
      if (a === 'add') {
        const rm = this._rooms[this._sel] && !this._rooms[this._sel].outdoor ? this._rooms[this._sel] : Object.values(this._rooms).filter(r => !r.outdoor).sort((p, q) => q.area - p.area)[0];
        if (!rm) return; this._pushUndo();
        const n = this._furnItem({ type: v, at: this._toPx(rm.node), rotate: 0 }); if (!n) return;
        this._furn.push(n); this._furnSel = n; this._furnSaveSoon(); this._arrUI(); return;
      }
      if (!it) return;
      this._pushUndo();
      if (a === 'rot') it.rotate = ((it.rotate + +v) % 360 + 360) % 360;
      else if (a === 'w') it.size[0] = clampSize(it.size[0] + +v, .1, 8);
      else if (a === 'd') it.size[1] = clampSize(it.size[1] + +v, .1, 8);
      else if (a === 'h') it.height = clampSize(it.height + +v, .02, 3);
      else if (a === 'col') it.color = v;
      else if (a === 'upper') it.upper = !it.upper;
      else if (a === 'mv') {
        const F = this._lastF, st = .05 * this._ppm, r = [F.cy, -F.sy], dn = [F.sy, F.cy];
        const dv = v === 'l' ? [-r[0], -r[1]] : v === 'r' ? r : v === 'u' ? [-dn[0], -dn[1]] : dn;
        it.at = [it.at[0] + dv[0] * st, it.at[1] + dv[1] * st];
      }
      else if (a === 'dup') {
        const c = this._furnItem({ ...this._furnPlain()[this._furn.indexOf(it)], at: [it.at[0] + .35 * this._ppm, it.at[1] + .35 * this._ppm] }); if (c) { this._furn.push(c); this._furnSel = c; }
        this._furnSaveSoon(); this._arrUI(); return;
      }
      else if (a === 'del') { this._furn = this._furn.filter(x => x !== it); this._furnSel = null; this._furnSaveSoon(); this._arrUI(); return; }
      this._furnGeom(it); this._furnSaveSoon(); this._arrUI();
    }
    _furnDrag(ev) {
      const d = this._fdrag, cv = this._el.cv, r = cv.getBoundingClientRect(), p = this._unproject((ev.clientX - r.left) / r.width * this._cw, (ev.clientY - r.top) / r.height * this._ch);
      if (!p) return;
      const q = x => Math.round(x / .05) * .05, e = this._ext;
      const m = [clamp(q(p[0] - d.off[0]), e[0] - 1.2, e[2] + 1.2), clamp(q(p[1] - d.off[1]), e[1] - 1.2, e[3] + 1.2)];
      d.it.at = this._toPx(m); this._furnGeom(d.it); d.moved = true;
    }

    // ───────── arredi: disegno ─────────
    _furnShade(F, base, n, lit, rgb, k = 1) {
      const env = clamp(.5 + F.dayF * .42 + lit * .45, .36, 1.12);
      let f = 1.12;
      if (n) { const nr = n[0] * F.sy + n[1] * F.cy, fl = -(n[0] * .53 + n[1] * .85); f = (.82 + .18 * fl) * (.9 + .1 * Math.min(1, Math.abs(nr) * 1.4)); }
      const c = mulc(base, env * f * k), tl = lit * .1, l = rgb || [255, 200, 128];
      return [c[0] * F.tint[0] + l[0] * tl, c[1] * F.tint[1] + l[1] * tl, c[2] * F.tint[2] + l[2] * tl];
    }
    // tappeti e ombre a terra (sotto cavi, scie e persone)
    _rFurnFloor(F) {
      if (!this._furn || !this._furn.length || this._config.layers?.furniture === false) return;
      const { ctx, ui } = F;
      for (const it of this._furn) {
        const lit = this._lit[it.room] || 0, rgb = F.st.rgb[it.room];
        if (FURN[it.type].flat) {
          const col = this._furnShade(F, it.base, null, lit, rgb, .8), pts = it.parts[0].poly.map(p => F.P(p[0], p[1], .004));
          ctx.fillStyle = rgba(col, .96); polyD(ctx, pts); ctx.fill();
          ctx.strokeStyle = rgba(mulc(col, 1.25), .55); ctx.lineWidth = ui * 1.3; const ins = it.parts[0].poly.map((p, i, A) => { const c = [it.m[0], it.m[1]]; return [c[0] + (p[0] - c[0]) * .88, c[1] + (p[1] - c[1]) * .88]; }).map(p => F.P(p[0], p[1], .005)); polyD(ctx, ins); ctx.stroke();
          continue;
        }
        const h = it.height, a = it.fp.map(p => F.P(p[0], p[1], 0)), b = it.fp.map(p => F.P(p[0] + h * .1, p[1] + h * .16, 0));
        ctx.fillStyle = 'rgba(4,8,24,.24)'; polyD(ctx, hull(a.concat(b))); ctx.fill();
      }
    }
    _furnPart(F, it, p) {
      const { ctx, ui } = F, lit = this._lit[it.room] || 0, rgb = F.st.rgb[it.room], P = p.poly, n = P.length;
      ctx.lineJoin = 'round'; ctx.lineWidth = ui * .8; ctx.strokeStyle = 'rgba(8,12,28,.4)';
      for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-6) continue;
        const nx = dy / L, ny = -dx / L; if (nx * F.sy + ny * F.cy <= .001) continue;
        ctx.fillStyle = rgba(this._furnShade(F, p.col, [nx, ny], lit, rgb), 1);
        polyD(ctx, [F.P(a[0], a[1], p.z0), F.P(b[0], b[1], p.z0), F.P(b[0], b[1], p.z1), F.P(a[0], a[1], p.z1)]); ctx.fill(); if (!p.round) ctx.stroke();
      }
      ctx.fillStyle = rgba(this._furnShade(F, p.col, null, lit, rgb), 1); polyD(ctx, P.map(q => F.P(q[0], q[1], p.z1))); ctx.fill(); ctx.stroke();
    }

    // ───────── ciclo di animazione ─────────
    _start() {
      if (this._raf) return;
      this._last = performance.now();
      const loop = ts => {
        this._raf = requestAnimationFrame(loop);
        if (!this._vis || document.hidden || this._rec) return;
        const minDt = 1000 / (this._config.max_fps || 45);
        if (ts - this._last < minDt - 2) return;
        const dt = Math.min(.1, (ts - this._last) / 1000); this._last = ts;
        this._tick(dt); this._draw();
      };
      this._raf = requestAnimationFrame(loop);
    }
    _stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; if (this._ro) this._ro.disconnect(); if (this._io) this._io.disconnect(); this._ro = this._io = null; }

    _tick(dt) {
      this._rt += dt; this._idle += dt;
      if ((this._rd = (this._rd || 0) + dt) > 15) { this._rd = 0; this._read(); }
      const cam = this._cam, k = 1 - Math.exp(-6 * dt);
      if (cam.auto && this._idle > 5 && !this._reduce) cam.yaw += (this._config.auto_rotate_speed ?? 3.2) * dt * Math.min(1, (this._idle - 5) / 2);
      if (Math.abs(cam.vy) > .1) { cam.yaw += cam.vy * dt; cam.vy *= Math.exp(-3.2 * dt); } else cam.vy = 0;
      if (this._intro > 0) { this._intro -= dt; const kk = 1 - Math.exp(-1.15 * dt); cam.yaw += (this._introYaw - cam.yaw) * kk; cam.pitch += (this._tgt.pitch - cam.pitch) * kk; cam.zoom += (this._tgt.zoom - cam.zoom) * kk; }
      else { cam.pitch += (this._tgt.pitch - cam.pitch) * k; cam.zoom += (this._tgt.zoom - cam.zoom) * k; }
      const st = this._st || {};
      for (const r of Object.values(this._rooms)) { const t = st.bri ? st.bri[r.id] || 0 : 0; this._lit[r.id] = (this._lit[r.id] || 0) + (t - (this._lit[r.id] || 0)) * (1 - Math.exp(-7 * dt)); }
      this._openings.forEach(o => { o.open += ((o.tgt || 0) - o.open) * (1 - Math.exp(-4 * dt)); });
      if (this._door) this._door.A += ((this._door.tgt || 0) - this._door.A) * (1 - Math.exp(-4 * dt));
      this._devices.forEach(d => { d.P += (d.tgt - d.P) * (1 - Math.exp(-3 * dt)); });
      this._tickPeople(dt);
      if (this._wx.storm) { this._flashT = (this._flashT ?? 4) - dt; if (this._flashT < 0) { this._flash = 1; this._flashT = 3 + rnd() * 6; } }
      this._flash = Math.max(0, (this._flash || 0) - dt * 2.6);
      if (this._stripKey !== new Date().getDate()) this._drawStrip();
    }

    _tickPeople(dt) {
      const st = this._st; if (!st) return;
      const want = new Map(), rooms = this._rooms, radarRooms = new Set(this._radars.filter(r => r.type === 'ld2450').map(r => r.room));
      this._radars.forEach((r, ri) => { const s = st.radars[ri]; if (s && r.type === 'ld2450') s.t.forEach((p, k) => { if (p) want.set('r' + ri + '_' + k, { x: p[0], y: p[1], room: r.room, radar: true }); }); });
      for (const r of Object.values(rooms)) if (st.pres[r.id] && !radarRooms.has(r.id)) want.set('m' + r.id, { room: r.id });
      const COLS = [[94, 225, 255], [255, 180, 120], [183, 140, 255]];
      for (const [key, w] of want) {
        let p = this._ppl.get(key);
        if (!p) { const sp = w.radar ? [w.x, w.y] : rooms[w.room].node; p = { key, x: sp[0], y: sp[1], tx: sp[0], ty: sp[1], a: 0, trail: [], room: w.room, wait: 0, tt: 0, col: COLS[this._ppl.size % 3], h: 1.66 + rnd() * .16, ph: rnd() * TAU }; this._ppl.set(key, p); }
        p.alive = true; p.room = w.room;
        if (w.radar) { p.tx = w.x; p.ty = w.y; p.x += (p.tx - p.x) * (1 - Math.exp(-8 * dt)); p.y += (p.ty - p.y) * (1 - Math.exp(-8 * dt)); }
        else {
          p.wait -= dt;
          const dd = Math.hypot(p.tx - p.x, p.ty - p.y), r = rooms[w.room];
          if (dd < .1 && p.wait <= 0) {
            p.wait = 1.2 + rnd() * 3.2;
            if (r.spine.length > 1) { const q = r.spine[(rnd() * r.spine.length) | 0]; p.tx = q[0]; p.ty = q[1]; }
            else for (let i = 0; i < 14; i++) { const x = lerp(r.bb[0], r.bb[2], rnd()), y = lerp(r.bb[1], r.bb[3], rnd()); if (inPoly(r.P, x, y) && [0, 1, 2, 3].every(j => inPoly(r.P, x + (j % 2 ? .3 : -.3), y + (j < 2 ? .3 : -.3)))) { p.tx = x; p.ty = y; break; } }
          }
          if (dd > .06) { const v = Math.min(.62 * dt, dd); p.x += (p.tx - p.x) / dd * v; p.y += (p.ty - p.y) / dd * v; }
        }
        p.a = Math.min(1, p.a + dt * 2.2);
      }
      for (const [key, p] of this._ppl) {
        if (!want.has(key)) { p.alive = false; p.a -= dt * 1.4; }
        p.tt += dt; if (p.tt > .07) { p.tt = 0; p.trail.push([p.x, p.y]); if (p.trail.length > 34) p.trail.shift(); }
        if (!p.alive && p.a <= 0) this._ppl.delete(key);
      }
    }

    _draw() {
      const cam = this._cam, V = { yaw: cam.yaw, pitch: cam.pitch, zoom: cam.zoom, T: this._time(), ui: this._dpr, rt: this._rt, live: true };
      this._render(this._ctx, this._cw, this._ch, V);
      this._hudT -= 1 / 40; if (this._hudT <= 0) { this._hudT = 1; this._hud(); }
    }

    _hud() {
      const E = this._el, L = this._L, F = this._lastF, st = this._st || {}; if (!F) return;
      const T = F.T, sun = F.sun, w = F.w, dir = L.dirs[Math.round(((sun.az % 360) / 45)) % 8];
      E.clock.textContent = hhmm(T);
      E.mode.innerHTML = this._sim != null ? `<b class="sim">${L.preview}</b>` : `<b>${L.live}</b>`;
      const lit = Object.values(this._rooms).filter(r => st.lights && st.lights[r.id]).length;
      const kw = (st.total || 0) / 1000, tariff = this._config.tariff;
      const cond = L.cond[w.cond] || '';
      const alarm = st.alarm && /^armed/.test(st.alarm) ? `<div class="alarm">${L.armed}</div>` : st.alarm === 'triggered' ? `<div class="alarm trig">${L.triggered}</div>` : '';
      E.info.innerHTML = `<div><span>${L.sun}</span> <b>${sun.el > -1 ? Math.round(sun.az) + '° ' + dir : L.below}</b>${sun.el > -1 ? ` <span>· ${Math.round(sun.el)}° ${L.alt}</span>` : ''}</div>`
        + `<div><span>${L.power}</span> <b>${kw.toLocaleString(L.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kW</b>${tariff ? ` <span>· ${(kw * tariff).toLocaleString(L.locale, { style: 'currency', currency: 'EUR' })} ${L.hr}</span>` : ''}</div>`
        + (this._importMeta ? `<div><span>${L.mapFrom}</span> <b>Casa Viva</b> <span>· ${this._importMeta.title}</span></div>` : '')
        + `<div><span>${cond}${w.out != null ? ' · ' + Number(w.out).toLocaleString(L.locale, { maximumFractionDigits: 1 }) + '°' : ''}</span>${lit ? ` <span>· ${lit} ${L.lights}</span>` : ''}</div>${alarm}`;
      E.head.style.left =(this._sim != null ? (new Date(T).getHours() * 60 + new Date(T).getMinutes()) / 1440 : (new Date().getHours() * 60 + new Date().getMinutes()) / 1440) * 100 + '%';
      if (this._sel && !E.pop.hidden) this._showPop();
    }

    // ═════════════════════ disegno ═════════════════════
    _frame(ctx, W, H, V) {
      const F = { ctx, W, H, V, ui: V.ui, rt: V.rt, T: V.T };
      const yaw = V.yaw * RAD, pit = V.pitch * RAD;
      F.cy = Math.cos(yaw); F.sy = Math.sin(yaw); F.cp = Math.cos(pit); F.sp = Math.sin(pit);
      const ext = this._ext, port = W < H, Rh = Math.hypot((ext[2] - ext[0]) / 2, (ext[3] - ext[1]) / 2) * (port ? .9 : 1) + (port ? .7 : 1.5);
      F.s = Math.min(W * .5 / Rh, H * .5 / (Rh * F.sp + this._H * F.cp * .6 + .5)) * V.zoom;
      F.ox = W / 2; F.oy = H * .5 + this._H * F.cp * F.s * .4 + (V.shiftY || 0) * H;
      const { cy, sy, cp, sp, s, ox, oy } = F;
      F.P = (x, y, z = 0) => [ox + (x * cy - y * sy) * s, oy + ((x * sy + y * cy) * sp - z * cp) * s];
      F.D = (x, y, z = 0) => (x * sy + y * cy) * cp + z * sp;
      const hc = this._hass?.config || {}, c = this._config, lat = hc.latitude ?? c.latitude ?? 41.9, lon = hc.longitude ?? c.longitude ?? 12.5;
      F.hour = hourOf(V.T);
      F.sun = sunAt(V.T, lat, lon); F.el = F.sun.el;
      F.w = V.w || this._wx;
      F.K = palette(this._skyHour(F.sun));
      // cielo coperto: i colori scivolano verso il grigio
      if (F.w.cloud > .35) {
        const k = sstep(.35, 1, F.w.cloud) * (F.w.rain > 0 ? .8 : .62), gray = mulc([84, 94, 116], .55 + .6 * sstep(-6, 12, F.el));
        for (const n of ['s1', 's2', 's3']) F.K[n] = mixc(F.K[n], mulc(gray, n === 's1' ? .8 : n === 's2' ? 1 : 1.15), k);
      }
      const A = (F.sun.az - (c.north || 0)) * RAD; F.d = [-Math.sin(A), Math.cos(A)];
      F.dayF = sstep(-9, 9, F.el);
      F.cloudSun = Math.pow(1 - F.w.cloud * .93, 1.6);
      F.sunI = sstep(-1.5, 8, F.el) * F.cloudSun;
      F.tint = mixc([1, 1, 1], mulc(F.K.s3, 1 / 255), .5 * (1 - F.dayF * .75));
      F.kS = Math.min(11, 1 / Math.tan(Math.max(F.el, 1.6) * RAD));
      F.amb = lerp(.38, .74, F.dayF) * (1 - F.w.cloud * .1);
      F.sunCol = sunColor(F.el);
      F.lk = clamp(F.s / (34 * V.ui), .9, 1.1);
      F.st = this._st || { lights: {}, rgb: {}, bri: {}, temp: {}, pres: {}, radars: [], total: 0 };
      F.beams = []; F.sunIn = {};
      if (F.el > .4) {
        for (const o of this._openings) {
          const cosI = -(F.d[0] * o.n[0] + F.d[1] * o.n[1]); if (cosI <= .04 || !o.edge) continue;
          const inten = Math.min(1, .3 + Math.sin(F.el * RAD) * 2.2) * Math.min(1, cosI * 1.7) * F.cloudSun;
          if (inten < .02) continue;
          F.beams.push({ o, inten, cosI }); F.sunIn[o.room] = Math.max(F.sunIn[o.room] || 0, inten);
        }
      }
      // colori delle superfici
      F.wallExt = (nx, ny) => {
        const lam = Math.max(0, -(nx * F.d[0] + ny * F.d[1])) * Math.cos(Math.max(F.el, 0) * RAD);
        const base = mixc([112, 124, 176], [214, 224, 246], F.dayF), sh = F.amb * .92 + F.sunI * lam * .8;
        const c = addc(mulc(base, clamp(sh, .22, 1.12)), mulc(F.sunCol, F.sunI * lam * .16));
        return [c[0] * F.tint[0], c[1] * F.tint[1], c[2] * F.tint[2]];
      };
      F.wallIn = id => {
        const lit = this._lit[id] || 0, rgb = F.st.rgb[id] || [255, 200, 128];
        const base = mulc(mixc([104, 116, 164], [204, 212, 236], F.dayF * .9), clamp(F.amb * 1.02, .25, 1));
        return addc([base[0] * F.tint[0], base[1] * F.tint[1], base[2] * F.tint[2]], mulc(rgb, lit * .5));
      };
      F.top = () => mulc(mixc([132, 146, 196], [252, 253, 255], F.dayF), clamp(.58 + F.amb * .5 + F.sunI * Math.sin(Math.max(F.el, 0) * RAD) * .25, .45, 1.1));
      return F;
    }

    _render(ctx, W, H, V) {
      const F = this._frame(ctx, W, H, V);
      if (V.live) this._lastF = F;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
      if (this._loading) { this._rSky(F); ctx.restore(); return F; }
      this._rSky(F); this._rGround(F); this._rShadows(F); this._rFloors(F); this._rFloorFx(F); this._rItems(F); this._rWeather(F); this._rFinish(F);
      ctx.restore();
      return F;
    }

    // ───────── cielo, stelle, aurora boreale, sole, luna, nuvole ─────────
    _rSky(F) {
      const { ctx, W, H, K, w, ui, rt } = F;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, rgba(K.s1, 1)); g.addColorStop(.55, rgba(K.s2, 1)); g.addColorStop(1, rgba(K.s3, 1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (w.cloud > .5) { ctx.fillStyle = `rgba(28,34,60,${((w.cloud - .5) * .55).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      const clear = 1 - w.cloud * .9;
      if (K.st > .03) {
        const shift = F.V.yaw * .9 * ui;
        for (const t of this._stars) {
          const a = K.st * (.45 + .55 * Math.sin(rt * 1.6 + t.p)) * clear * (t.y < .75 ? 1 : .3);
          if (a < .03) continue;
          ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
          const x = ((t.x * W + shift) % W + W) % W, r = t.r * ui; ctx.fillRect(x, t.y * H * .8, r, r);
        }
      }
      // aurora boreale, per il nome: solo di notte e con cielo sereno
      if (this._config.aurora_sky !== false && K.st > .55 && w.cloud < .65) this._aurora(F, (K.st - .55) / .45 * (1 - w.cloud / .65) * .55);
      // sole e luna: posizione vera rispetto alla vista
      const u = [-F.d[0], -F.d[1]], xr = u[0] * F.cy - u[1] * F.sy, yr = u[0] * F.sy + u[1] * F.cy;
      const sunA = sstep(-3, 3, F.el), cloudDim = 1 - w.cloud * .65;
      if (sunA > .01) {
        const sx = W / 2 + xr * W * .42, sy = H * .3 - clamp(F.el, 0, 65) / 65 * H * .2;
        const dim = yr > .3 ? .6 : 1;
        const low = 1 - sstep(0, 28, F.el), sc = F.sunCol, rr = (15 + low * 9) * ui;
        halo(ctx, sc, sx, sy, H * (.42 + low * .2), (.55 + low * .15) * sunA * cloudDim * dim);
        halo(ctx, mixc(sc, [255, 255, 255], .5), sx, sy, H * .13, .8 * sunA * cloudDim * dim);
        ctx.fillStyle = rgba(mixc(sc, [255, 255, 255], .55 - low * .35), sunA * cloudDim * dim); ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU); ctx.fill();
      }
      const moonA = sstep(2, -7, F.el) * (1 - w.cloud * .75);
      if (moonA > .01) {
        const mx = W / 2 - xr * W * .36 + W * .06, my = H * .27 - clamp(-F.el, 0, 40) / 40 * H * .1, r = 15 * ui;
        halo(ctx, [190, 210, 255], mx, my, H * .22, .42 * moonA);
        const jd = F.T / DAY + 2440587.5, ph = (((jd - 2451550.1) / 29.530588853) % 1 + 1) % 1, kk = Math.cos(ph * TAU);
        ctx.save(); ctx.globalAlpha = moonA;
        ctx.fillStyle = 'rgb(58,68,104)'; ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgb(238,243,255)'; ctx.beginPath();
        if (ph < .5) ctx.arc(mx, my, r, -Math.PI / 2, Math.PI / 2, false); else ctx.arc(mx, my, r, Math.PI / 2, 3 * Math.PI / 2, false);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(mx, my, Math.max(.01, r * Math.abs(kk)), r, 0, 0, TAU);
        ctx.fillStyle = kk > 0 ? 'rgb(58,68,104)' : 'rgb(238,243,255)'; ctx.fill();
        ctx.restore();
      }
      // nuvole
      const n = Math.round(1 + w.cloud * 6), dark = w.rain > 0 || w.cloud > .8;
      const cc = dark ? mixc([120, 128, 150], F.K.s2, .3) : mixc([255, 255, 255], F.K.s3, .35);
      for (let i = 0; i < n; i++) {
        const cl = this._clouds[i], wind = (.004 + w.wind * .0008) * rt, x = (((cl.x + wind * (.6 + cl.s * .4)) % 1.3) - .15) * W - F.V.yaw * .8 * ui, y = cl.y * H;
        const a = (.2 + .42 * Math.max(F.K.cl, w.cloud)) * (dark ? 1.2 : 1) * (1 - F.K.nt * .35);
        for (let j = 0; j < 5; j++) halo(ctx, cc, x + (j - 2) * 38 * cl.s * ui, y + Math.sin(j * 1.7) * 7 * ui, 62 * cl.s * ui, a * .72, 30 * cl.s * ui);
      }
    }

    _aurora(F, a0) {
      const { ctx, W, H, rt } = F, sc = 4, w = Math.ceil(W / sc), h = Math.ceil(H * .4 / sc);
      let c = this._auC; if (!c) c = this._auC = document.createElement('canvas');
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; this._auG = null; }
      const g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.globalCompositeOperation = 'lighter';
      const cols = [[60, 255, 170], [34, 211, 238], [170, 110, 255]];
      if (!this._auG) this._auG = cols.map(k => { const gg = g.createLinearGradient(0, 0, 0, h * .7); gg.addColorStop(0, rgba(k, 0)); gg.addColorStop(.2, rgba(k, 1)); gg.addColorStop(.55, rgba(k, .35)); gg.addColorStop(1, rgba(k, 0)); return gg; });
      for (let i = 0; i < 3; i++) {
        g.fillStyle = this._auG[i];
        for (let x = 0; x < w; x++) {
          const u = x / w, wave = Math.sin(u * 5.2 + rt * .35 + i * 1.7) * .5 + Math.sin(u * 11 - rt * .5 + i) * .25;
          const y = h * (.1 + i * .07) + wave * h * .2, amp = .5 + .5 * Math.sin(u * 7.3 + rt * .6 + i * 2.1), ray = .6 + .4 * Math.sin(u * 150 + i * 5 + Math.sin(rt * .7 + u * 9) * 2);
          g.save(); g.translate(0, y); g.globalAlpha = clamp(a0 * .8 * amp * ray * (.55 + .45 * Math.sin(u * 3 + i)), 0, 1); g.fillRect(x, 0, 1.25, h * .7); g.restore();
        }
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.filter = 'blur(2px)'; ctx.drawImage(c, 0, 0, W, h * sc); ctx.restore();
    }

    // ───────── piattaforma / giardino ─────────
    _rGround(F) {
      const { ctx, ui, K, s, sp } = F, pl = this._plat, th = .4;
      const top = pl.map(p => F.P(p[0], p[1], 0)), bot = pl.map(p => F.P(p[0], p[1], -th));
      // alone sotto la casa che la fa "galleggiare"
      const c0 = F.P(0, 0, -th - .1); halo(ctx, K.b1, c0[0], c0[1] + 6 * ui, this._R * s * 1.15, .3 + .12 * K.nt, this._R * s * 1.15 * sp * .8);
      const alarm = F.st.alarm, rim = alarm === 'triggered' ? [255, 90, 110] : alarm && /^armed/.test(alarm) ? [167, 139, 250] : K.b3;
      const blink = alarm === 'triggered' ? .5 + .5 * Math.sin(F.rt * 9) : 1;
      const N = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      for (let i = 0; i < 4; i++) {
        const nr = N[i][0] * F.sy + N[i][1] * F.cy; if (nr <= .02) continue;
        const a = top[i], b = top[(i + 1) % 4], a2 = bot[i], b2 = bot[(i + 1) % 4];
        const g = ctx.createLinearGradient(0, a[1], 0, a2[1]); g.addColorStop(0, rgba(mixc([46, 62, 98], [120, 148, 150], F.dayF * .5), .96)); g.addColorStop(1, rgba([10, 14, 30], .96));
        ctx.fillStyle = g; polyD(ctx, [a, b, b2, a2]); ctx.fill();
        ctx.strokeStyle = rgba([255, 255, 255], .12); ctx.lineWidth = ui; ctx.stroke();
      }
      const cen = F.P(0, 0, 0), day = mixc([16, 26, 52], [118, 152, 138], F.dayF), edge = mixc([10, 14, 32], [84, 116, 108], F.dayF);
      const gg = ctx.createRadialGradient(cen[0], cen[1], 0, cen[0], cen[1], this._R * s * 1.05);
      gg.addColorStop(0, rgba(mulc(day, 1 + F.sunI * .1), 1)); gg.addColorStop(1, rgba(edge, 1));
      ctx.fillStyle = gg; polyD(ctx, top); ctx.fill();
      // griglia di vetro
      ctx.save(); polyD(ctx, top); ctx.clip();
      ctx.strokeStyle = `rgba(255,255,255,${(.045 + .03 * F.dayF).toFixed(3)})`; ctx.lineWidth = ui * .8; ctx.beginPath();
      for (let x = Math.ceil(pl[0][0]); x <= pl[2][0]; x++) { const a = F.P(x, pl[0][1], 0), b = F.P(x, pl[2][1], 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      for (let y = Math.ceil(pl[0][1]); y <= pl[2][1]; y++) { const a = F.P(pl[0][0], y, 0), b = F.P(pl[2][0], y, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke(); ctx.restore();
      ctx.save(); ctx.shadowColor = rgba(rim, .9 * blink); ctx.shadowBlur = 12 * ui; ctx.strokeStyle = rgba(rim, (alarm ? .85 : .55) * blink); ctx.lineWidth = 1.6 * ui;
      polyD(ctx, top); ctx.stroke(); ctx.restore();
      F.platPath = top;
    }

    // ───────── ombre sul giardino: muri, tetto invisibile, alberi ─────────
    _rShadows(F) {
      const I = F.sunI * sstep(.4, 6, F.el); if (I < .03) return;
      const sh = this._shc, sw = Math.round(F.W * .36), shh = Math.round(F.H * .36);
      if (sh.width !== sw || sh.height !== shh) { sh.width = sw; sh.height = shh; }
      const g = sh.getContext('2d'), sc = sh.width / F.W;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, sh.width, sh.height); g.setTransform(sc, 0, 0, sc, 0, 0);
      g.fillStyle = 'rgb(6,10,34)';
      const k = F.kS, d = F.d, H = this._H, TH = this._TH, P = F.P;
      for (const p of this._pieces) {
        if (p.inner || p.kind === 'rail' || p.kind === 'glass' || p.e.skip || p.z0 > 0.05) continue;
        const e = p.e, a = [e.A[0] + e.u[0] * p.ta + e.n[0] * TH / 2, e.A[1] + e.u[1] * p.ta + e.n[1] * TH / 2], b = [e.A[0] + e.u[0] * p.tb + e.n[0] * TH / 2, e.A[1] + e.u[1] * p.tb + e.n[1] * TH / 2];
        const zt = Math.max(p.z1, .1) * k;
        polyD(g, [P(a[0], a[1]), P(b[0], b[1]), P(b[0] + d[0] * zt, b[1] + d[1] * zt), P(a[0] + d[0] * zt, a[1] + d[1] * zt)]); g.fill();
      }
      for (const r of Object.values(this._rooms)) {
        if (r.outdoor) continue;
        polyD(g, r.P.map(p => P(p[0] + d[0] * H * k, p[1] + d[1] * H * k))); g.fill();
        // il tetto e i muri insieme: riempie lo spazio tra il piede e il bordo del tetto
        for (const e of r.E) { if (e.skip) continue; polyD(g, [P(e.A[0], e.A[1]), P(e.B[0], e.B[1]), P(e.B[0] + d[0] * H * k, e.B[1] + d[1] * H * k), P(e.A[0] + d[0] * H * k, e.A[1] + d[1] * H * k)]); g.fill(); }
      }
      for (const t of this._trees) {
        const hh = t.h * k, b = P(t.x, t.y), q = P(t.x + d[0] * hh, t.y + d[1] * hh), rr = t.r * .7 * F.s;
        g.beginPath(); g.moveTo(b[0] - rr, b[1]); g.lineTo(q[0], q[1]); g.lineTo(b[0] + rr, b[1]); g.closePath(); g.fill();
        g.beginPath(); g.ellipse(b[0], b[1], rr, rr * F.sp, 0, 0, TAU); g.fill();
      }
      const ctx = F.ctx; ctx.save(); polyD(ctx, F.platPath); ctx.clip();
      ctx.globalAlpha = .62 * I; ctx.imageSmoothingEnabled = true; ctx.drawImage(sh, 0, 0, F.W, F.H); ctx.restore();
    }

    // ───────── pavimenti: colore, mattonelle, sole dalle finestre, pozze di luce ─────────
    _rFloors(F) {
      const { ctx, ui, s, sp, K } = F, st = F.st;
      F.roomPath = {};
      for (const r of Object.values(this._rooms)) {
        const pts = r.P.map(p => F.P(p[0], p[1], 0)); F.roomPath[r.id] = pts;
        const day = r.outdoor ? [172, 150, 118] : mixc([84, 98, 138], [150, 162, 192], r.tone);
        let base = mixc([27, 35, 68], day, F.dayF * (r.outdoor ? .7 : .8));
        base = mulc(base, clamp(.62 + F.amb * .4, .55, 1.0)); base = [base[0] * F.tint[0], base[1] * F.tint[1], base[2] * F.tint[2]];
        if (this._config.thermal && st.temp[r.id] != null) base = mixc(base, tempColor(st.temp[r.id]), .3);
        ctx.fillStyle = rgba(base, 1); polyD(ctx, pts); ctx.fill();
        ctx.save(); polyD(ctx, pts); ctx.clip();
        // mattonelle
        ctx.strokeStyle = `rgba(${F.dayF > .5 ? '40,52,90' : '255,255,255'},${(F.dayF > .5 ? .07 : .04).toFixed(3)})`; ctx.lineWidth = ui * .8; ctx.beginPath();
        const q = r.outdoor ? .5 : .7;
        for (let x = Math.floor(r.bb[0] / q) * q; x <= r.bb[2]; x += q) { const a = F.P(x, r.bb[1], 0), b = F.P(x, r.bb[3], 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        if (!r.outdoor) for (let y = Math.floor(r.bb[1] / q) * q; y <= r.bb[3]; y += q) { const a = F.P(r.bb[0], y, 0), b = F.P(r.bb[2], y, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.stroke();
        // pozza di luce della lampada
        const L = this._lit[r.id] || 0;
        if (L > .01) {
          const col = st.rgb[r.id] || [255, 196, 118], c0 = F.P(r.node[0], r.node[1], 0), R = Math.max(Math.sqrt(r.area) * .62, 1.6) * s;
          ctx.globalCompositeOperation = 'lighter';
          halo(ctx, col, c0[0], c0[1], R * 1.05, .62 * L, R * 1.05 * sp); halo(ctx, col, c0[0], c0[1], R * .5, .42 * L, R * .5 * sp);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
      }
      // fasci di sole che entrano dalle finestre
      const k = F.kS, dd = F.d;
      for (const b of F.beams) {
        const o = b.o, pts = F.roomPath[o.room]; if (!pts) continue;
        const zs = o.sill * k, zt = Math.min(o.top, 2.6) * k;
        const q = [[o.a[0] + dd[0] * zs, o.a[1] + dd[1] * zs], [o.b[0] + dd[0] * zs, o.b[1] + dd[1] * zs], [o.b[0] + dd[0] * zt, o.b[1] + dd[1] * zt], [o.a[0] + dd[0] * zt, o.a[1] + dd[1] * zt]].map(p => F.P(p[0], p[1], 0));
        b.q = q;
        ctx.save(); polyD(ctx, pts); ctx.clip(); ctx.globalCompositeOperation = 'screen';
        const m0 = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], m1 = [(q[3][0] + q[2][0]) / 2, (q[3][1] + q[2][1]) / 2];
        const g = ctx.createLinearGradient(m0[0], m0[1], m1[0], m1[1]);
        g.addColorStop(0, rgba(F.sunCol, Math.min(1, .95 * Math.pow(b.inten, .7)))); g.addColorStop(1, rgba(F.sunCol, .5 * Math.pow(b.inten, .7)));
        ctx.shadowColor = rgba(F.sunCol, .85 * b.inten); ctx.shadowBlur = 16 * ui;
        ctx.fillStyle = g; polyD(ctx, q); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(14,22,52,${(.2 * b.inten).toFixed(3)})`; ctx.lineWidth = .05 * s;
        ctx.beginPath(); ctx.moveTo((q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2); ctx.lineTo((q[3][0] + q[2][0]) / 2, (q[3][1] + q[2][1]) / 2); ctx.stroke();
        ctx.restore();
      }
      // contorno e stanza selezionata
      for (const r of Object.values(this._rooms)) {
        const pts = F.roomPath[r.id]; polyD(ctx, pts);
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = ui; ctx.stroke();
        if (this._sel === r.id && F.V.live) {
          ctx.save(); ctx.shadowColor = rgba(K.b3, 1); ctx.shadowBlur = 16 * ui; ctx.strokeStyle = rgba(mixc(K.b3, [255, 255, 255], .3), .95); ctx.lineWidth = 2.4 * ui; ctx.stroke();
          ctx.fillStyle = rgba(K.b3, .12 + .05 * Math.sin(F.rt * 4)); ctx.fill(); ctx.restore();
        }
      }
    }

    // ───────── cavi dell'energia, zone dei radar, scie delle persone ─────────
    _rFloorFx(F) {
      const { ctx, ui, s, rt, K } = F, st = F.st;
      this._rFurnFloor(F);
      // radar LD2450: cono di vista che scansiona
      this._radars.forEach((r, i) => {
        if (r.type !== 'ld2450') return;
        const pts = F.roomPath[r.room]; if (!pts) return;
        const on = st.radars[i] && (st.radars[i].on || st.radars[i].t.some(Boolean)), Rm = r.range / 1000 * Math.min(1, 6000 / r.range);
        const A = (r.angle || 0) * RAD, half = r.fov / 2 * RAD, c0 = F.P(r.atm[0], r.atm[1], .05), col = on ? [34, 211, 238] : [139, 124, 248];
        ctx.save(); polyD(ctx, pts); ctx.clip();
        const seg = []; seg.push(c0); for (let a = -half; a <= half + .001; a += half / 8) seg.push(F.P(r.atm[0] + Math.cos(A + a) * Rm, r.atm[1] + Math.sin(A + a) * Rm, .05));
        const g = ctx.createRadialGradient(c0[0], c0[1], 0, c0[0], c0[1], Rm * s); g.addColorStop(0, rgba(col, on ? .3 : .13)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; polyD(ctx, seg); ctx.fill();
        const sw = A + Math.sin(rt * 1.1) * half, e = F.P(r.atm[0] + Math.cos(sw) * Rm, r.atm[1] + Math.sin(sw) * Rm, .05);
        ctx.strokeStyle = rgba(col, on ? .6 : .25); ctx.lineWidth = ui * 1.2; ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
        ctx.restore();
      });
      // cavi: dal quadro agli apparecchi, con impulsi che corrono
      if (this._panel && F.V.energy !== false && this._config.layers?.energy !== false) {
        this._devices.forEach((d, i) => {
          if (d.P < 8) return;
          const route = this._route('panel', 'dev' + i); if (!route) return;
          const col = d.P < 300 ? mixc([34, 211, 238], [255, 196, 110], d.P / 300) : mixc([255, 196, 110], [255, 92, 110], clamp((d.P - 300) / 2200, 0, 1));
          const pp = route.map(p => F.P(p[0], p[1], .03));
          ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = .1 * s; ctx.beginPath(); pp.forEach((p, j) => j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = rgba(col, .35); ctx.lineWidth = .05 * s; ctx.stroke();
          ctx.setLineDash([.18 * s, .62 * s]); ctx.lineDashOffset = -rt * (.6 + Math.min(d.P, 2500) / 900) * s; ctx.strokeStyle = rgba(mixc(col, [255, 255, 255], .5), .95); ctx.lineWidth = .1 * s;
          ctx.shadowColor = rgba(col, 1); ctx.shadowBlur = 9 * ui; ctx.stroke();
          ctx.restore();
        });
      }
      // scie
      for (const p of this._ppl.values()) {
        if (p.trail.length < 2) continue;
        ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
        for (let j = 1; j < p.trail.length; j++) {
          const a = F.P(p.trail[j - 1][0], p.trail[j - 1][1], .03), b = F.P(p.trail[j][0], p.trail[j][1], .03), k = j / p.trail.length;
          ctx.strokeStyle = rgba(p.col, .5 * k * p.a); ctx.lineWidth = (.04 + .13 * k) * s; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
        ctx.restore();
      }
    }

    // ───────── oggetti in 3D, ordinati dal fondo verso chi guarda ─────────
    _rItems(F) {
      const { ctx, ui, s, sp, K } = F, st = F.st, items = [], L = this._L;
      const H = this._H, cut = this._cutH, Hin = this._Hin;
      F.pills = [];
      for (const r of Object.values(this._rooms)) for (const e of r.E) e.kh = 1 - sstep(-.05, .42, e.n[0] * F.sy + e.n[1] * F.cy);
      for (const p of this._pieces) {
        const e = p.e; if (e.skip) continue;
        const top = p.kind === 'rail' ? lerp(.35, .95, e.kh) : cut + ((p.inner ? Hin : H) - cut) * e.kh;
        const zb = p.z0, zt = Math.min(p.z1, top); if (zt - zb < .015) continue;
        items.push({ d: F.D(p.cx, p.cy, (zb + zt) / 2), f: () => this._wall(F, p, zb, zt) });
      }
      // fasci di luce con il pulviscolo
      for (const b of F.beams) if (b.q) items.push({ d: F.D(b.o.mid[0] + F.d[0] * 1.5, b.o.mid[1] + F.d[1] * 1.5, .6), f: () => this._beam(F, b) });
      // porta d'ingresso
      const D = this._door;
      if (D) items.push({ d: F.D(D.hinge[0], D.hinge[1], 1), f: () => {
        const base = (D.closed_angle || 0) * RAD, sgn = D.swing === 'ccw' ? -1 : 1, A = D.A * D.ang * RAD, h = D.hinge;
        const e = [h[0] + Math.cos(base + sgn * A) * D.len, h[1] + Math.sin(base + sgn * A) * D.len];
        const q = [F.P(h[0], h[1], 0), F.P(e[0], e[1], 0), F.P(e[0], e[1], 2.05), F.P(h[0], h[1], 2.05)];
        ctx.fillStyle = rgba(F.K.b3, .22 + D.A * .1); polyD(ctx, q); ctx.fill();
        ctx.shadowColor = rgba(F.K.b3, 1); ctx.shadowBlur = (4 + D.A * 12) * ui; ctx.strokeStyle = rgba(mixc(F.K.b3, [255, 255, 255], .35), .95); ctx.lineWidth = 2 * ui; ctx.stroke();
      } });
      // apparecchi: colonne di luce alte quanto i watt
      this._devices.forEach(d => items.push({ d: F.D(d.at[0], d.at[1], .6), f: () => this._column(F, d) }));
      if (this._panel) items.push({ d: F.D(this._panel.at[0], this._panel.at[1], .5), f: () => this._panelBox(F) });
      // lampade con cono di luce
      for (const r of Object.values(this._rooms)) {
        const Lt = this._lit[r.id] || 0; if (Lt < .02) continue;
        items.push({ d: F.D(r.node[0], r.node[1], 2.3), f: () => this._lamp(F, r, Lt) });
      }
      for (const p of this._ppl.values()) items.push({ d: F.D(p.x, p.y, .8), f: () => this._person(F, p) });
      for (const t of this._trees) items.push({ d: F.D(t.x, t.y, t.h / 2), f: () => this._tree(F, t) });
      if (this._furn && this._furn.length && this._config.layers?.furniture !== false) for (const f of this._furn) {
        const flat = !!FURN[f.type].flat;
        if (!flat) for (const p of f.parts) items.push({ d: F.D(p.cx, p.cy, (p.z0 + p.z1) / 2), f: () => this._furnPart(F, f, p) });
        if (this._edit) {
          // contorno sullo schermo per scegliere e trascinare il mobile
          const pts = []; for (const p of f.parts) for (const q of p.poly) { pts.push(F.P(q[0], q[1], p.z0)); pts.push(F.P(q[0], q[1], p.z1)); }
          f._hull = hull(pts); f._d = flat ? -9e3 : F.D(f.m[0], f.m[1], f.height / 2);
        }
      }
      items.sort((a, b) => a.d - b.d);
      for (const it of items) { ctx.save(); it.f(); ctx.restore(); }
      if (this._edit && this._furnSel && this._furnSel._hull && F.V.live) {
        ctx.save(); ctx.shadowColor = rgba(K.b3, 1); ctx.shadowBlur = 14 * ui; ctx.strokeStyle = rgba(mixc(K.b3, [255, 255, 255], .4), .95); ctx.lineWidth = 2 * ui; ctx.setLineDash([6 * ui, 4 * ui]);
        polyD(ctx, this._furnSel._hull); ctx.stroke(); ctx.restore();
      }
      this._rLabels(F);
      this._placePills(F);
      for (const pl of F.pills) this._pill(F, pl.x, pl.y, pl.t, pl.sub, pl.col, pl.dot);
    }

    // sposta le etichette che si coprirebbero a vicenda (prima quelle delle stanze, poi quelle degli apparecchi)
    _placePills(F) {
      const { ctx, ui } = F, fs = 12 * ui * F.lk; ctx.save();
      const h = 22 * ui * F.lk, placed = [], order = F.pills.map((p, i) => i).sort((a, b) => (F.pills[a].pri ?? 1) - (F.pills[b].pri ?? 1));
      for (const i of order) {
        const pl = F.pills[i];
        ctx.font = `600 ${fs}px Manrope, system-ui, sans-serif`; let w = ctx.measureText(pl.t).width + 16 * ui + (pl.dot ? 14 * ui : 0);
        if (pl.sub) { ctx.font = `500 ${fs}px Manrope, system-ui, sans-serif`; w += ctx.measureText(pl.sub).width + 7 * ui; }
        let best = 0;
        for (const off of [0, -1, 1, -2, 2, -3, 3]) {
          const y = pl.y + off * (h + 3 * ui), hit = placed.some(b => Math.abs(b.x - pl.x) < (b.w + w) / 2 + 2 * ui && Math.abs(b.y - y) < h + 2 * ui);
          if (!hit) { best = off; break; }
        }
        pl.y += best * (h + 3 * ui); placed.push({ x: pl.x, y: pl.y, w });
      }
      ctx.restore();
    }

    _pill(F, x, y, text, sub, col, dot) {
      const { ctx, ui } = F, fs = 12 * ui * F.lk; ctx.save();
      ctx.font = `600 ${fs}px Manrope, system-ui, sans-serif`;
      const tw = ctx.measureText(text).width, sw = sub ? (ctx.font = `500 ${fs}px Manrope, system-ui, sans-serif`, ctx.measureText(sub).width + 7 * ui) : 0;
      const w = tw + sw + (dot ? 14 : 0) * ui + 16 * ui, h = 22 * ui * F.lk, x0 = x - w / 2, y0 = y - h / 2;
      ctx.fillStyle = 'rgba(6,9,18,.62)'; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = ui;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, y0, w, h, h / 2); else ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke();
      let cx = x0 + 8 * ui;
      if (dot) { ctx.fillStyle = rgba(col || [255, 196, 110], 1); ctx.shadowColor = rgba(col || [255, 196, 110], 1); ctx.shadowBlur = 6 * ui; ctx.beginPath(); ctx.arc(cx + 3 * ui, y, 3.4 * ui, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; cx += 14 * ui; }
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.font = `600 ${fs}px Manrope, system-ui, sans-serif`; ctx.fillStyle = '#EEF2FF'; ctx.fillText(text, cx, y + .5 * ui);
      if (sub) { ctx.font = `500 ${fs}px Manrope, system-ui, sans-serif`; ctx.fillStyle = col ? rgba(mixc(col, [255, 255, 255], .35), 1) : '#A3AECB'; ctx.fillText(sub, cx + tw + 7 * ui, y + .5 * ui); }
      ctx.restore();
    }

    _rLabels(F) {
      const st = F.st, L = this._L;
      for (const r of Object.values(this._rooms)) {
        const p = F.P(r.label[0], r.label[1], .06), name = this._narrow && r.short ? r.short : r.name, T = st.temp[r.id];
        const sub = T != null && !this._narrow ? T.toLocaleString(L.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '°' : '';
        F.pills.push({ x: p[0], y: p[1], t: name, sub, col: this._config.thermal && T != null ? tempColor(T) : null, dot: !!(this._lit[r.id] > .5), pri: 0 });
      }
    }

    // un pezzo di muro: faccia visibile, cima e (per le finestre) vetro
    _wall(F, p, zb, zt) {
      const { ctx, ui, K } = F, e = p.e, TH = this._TH, n = e.n, u = e.u, rooms = this._rooms;
      const ext = p.last ? TH : 0;
      const ax = e.A[0] + u[0] * (p.ta - .012), ay = e.A[1] + u[1] * (p.ta - .012), bx = e.A[0] + u[0] * (p.tb + ext + .012), by = e.A[1] + u[1] * (p.tb + ext + .012);
      const aox = ax + n[0] * TH, aoy = ay + n[1] * TH, box = bx + n[0] * TH, boy = by + n[1] * TH;
      const nr = n[0] * F.sy + n[1] * F.cy, outer = nr > 0;
      const f0 = outer ? [aox, aoy] : [ax, ay], f1 = outer ? [box, boy] : [bx, by];
      const q = [F.P(f0[0], f0[1], zb), F.P(f1[0], f1[1], zb), F.P(f1[0], f1[1], zt), F.P(f0[0], f0[1], zt)];
      const turn = .78 + .22 * Math.min(1, Math.abs(nr) * 1.6);
      if (p.kind === 'glass') {
        const o = this._openings[p.oi], open = o ? o.open : 0, lit = this._lit[p.room] || 0, vis = 1 - open * .85;
        const g = ctx.createLinearGradient(0, q[3][1], 0, q[0][1]);
        g.addColorStop(0, rgba(mixc(K.s2, [255, 255, 255], .4), (.36 + .12 * F.dayF) * vis)); g.addColorStop(1, rgba(K.s3, .2 * vis));
        ctx.fillStyle = g; polyD(ctx, q); ctx.fill();
        if (lit > .02) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(F.st.rgb[p.room] ? F.st.rgb[p.room] : K.win, (.38 + .3 * K.nt) * lit * (1 - open * .5)); polyD(ctx, q); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
        const b = o && F.beams.find(x => x.o === o);
        if (b && outer) { const gg = ctx.createLinearGradient(q[3][0], q[3][1], q[1][0], q[1][1]); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(.45, `rgba(255,255,255,${(.34 * b.inten).toFixed(3)})`); gg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gg; polyD(ctx, q); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.3 * ui; polyD(ctx, q); ctx.stroke();
        ctx.beginPath(); ctx.moveTo((q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2); ctx.lineTo((q[3][0] + q[2][0]) / 2, (q[3][1] + q[2][1]) / 2); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
        return;
      }
      let col;
      if (p.kind === 'rail') col = mixc(F.wallExt(n[0], n[1]), K.b3, .35);
      else if (outer) col = p.nb && !rooms[p.nb].outdoor ? F.wallIn(p.nb) : F.wallExt(n[0], n[1]);
      else col = F.wallIn(p.room);
      col = mulc(col, turn);
      const alpha = p.kind === 'rail' ? .5 : .95;
      if (q[0][1] - q[3][1] > 5 * ui) {
        const g = ctx.createLinearGradient(0, q[3][1], 0, q[0][1]); g.addColorStop(0, rgba(mulc(col, 1.07), alpha)); g.addColorStop(1, rgba(mulc(col, .78), alpha)); ctx.fillStyle = g;
      } else ctx.fillStyle = rgba(col, alpha);
      polyD(ctx, q); ctx.fill();
      const tq = [F.P(ax, ay, zt), F.P(bx, by, zt), F.P(box, boy, zt), F.P(aox, aoy, zt)];
      ctx.fillStyle = rgba(F.top(), p.kind === 'rail' ? .6 : .97); polyD(ctx, tq); ctx.fill();
      if (!p.inner && e.kh < .85) { ctx.strokeStyle = rgba(mixc(K.b3, [255, 255, 255], .3), (1 - e.kh) * .85); ctx.lineWidth = 1.3 * ui; ctx.stroke(); }
    }

    // fascio di sole dalla finestra al pavimento
    _beam(F, b) {
      const { ctx, ui, rt } = F, o = b.o, q = b.q; if (!q) return;
      const zs = o.sill, zt = Math.min(o.top, 2.6);
      const pts = [F.P(o.a[0], o.a[1], zs), F.P(o.b[0], o.b[1], zs), F.P(o.a[0], o.a[1], zt), F.P(o.b[0], o.b[1], zt), ...q];
      const hl = hull(pts); if (hl.length < 3) return;
      const w0 = [(pts[2][0] + pts[3][0]) / 2, (pts[2][1] + pts[3][1]) / 2], f0 = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createLinearGradient(w0[0], w0[1], f0[0], f0[1]); g.addColorStop(0, rgba(F.sunCol, .26 * b.inten)); g.addColorStop(1, rgba(F.sunCol, .03 * b.inten));
      ctx.fillStyle = g; polyD(ctx, hl); ctx.fill();
      // pulviscolo che sale nel fascio
      ctx.fillStyle = rgba([255, 244, 224], 1);
      for (let i = 0; i < 12; i++) {
        const m = this._motes[Math.abs(i * 7 + (o.mid[0] * 13 | 0)) % this._motes.length], k = ((m.v + rt * .02 * m.s) % 1), a = .45 * b.inten * (.5 + .5 * Math.sin(rt * 1.4 + m.p));
        const x = lerp(lerp(pts[0][0], pts[1][0], m.u), lerp(q[0][0], q[1][0], m.u), k) + Math.sin(rt * .8 + m.p) * 5 * ui, y = lerp(lerp(pts[0][1], pts[1][1], m.u), lerp(q[0][1], q[1][1], m.u), k) - k * 12 * ui;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, (1 + m.s) * ui, 0, TAU); ctx.fill();
      }
    }

    _lamp(F, r, Lt) {
      const { ctx, s, sp } = F, rgb = F.st.rgb[r.id] || [255, 200, 128], zl = r.outdoor ? 2.7 : Math.min(this._H - .3, 2.4);
      const lp = F.P(r.node[0], r.node[1], zl), fp = F.P(r.node[0], r.node[1], 0), Rr = clamp(Math.sqrt(r.area) * .36, .8, 2.3);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(lp[0], lp[1], fp[0], fp[1]); g.addColorStop(0, rgba(rgb, .3 * Lt)); g.addColorStop(1, rgba(rgb, .02));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lp[0], lp[1]); ctx.lineTo(fp[0] - Rr * s, fp[1]); ctx.ellipse(fp[0], fp[1], Rr * s, Rr * s * sp, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
      halo(ctx, rgb, lp[0], lp[1], .62 * s, .9 * Lt); halo(ctx, [255, 255, 255], lp[0], lp[1], .2 * s, Lt);
    }

    _person(F, p) {
      const { ctx, s, sp, ui } = F, col = p.col, a = clamp(p.a, 0, 1); if (a < .02) return;
      const bob = Math.sin(F.rt * 6 + p.ph) * .025, f = F.P(p.x, p.y, 0), c = F.P(p.x, p.y, 1.0 + bob), hd = F.P(p.x, p.y, p.h + .02 + bob), tp = F.P(p.x, p.y, 2.5);
      ctx.globalCompositeOperation = 'lighter';
      // anello a terra e colonna di luce
      halo(ctx, col, f[0], f[1], .62 * s, .6 * a, .62 * s * sp);
      ctx.strokeStyle = rgba(col, .7 * a); ctx.lineWidth = 1.5 * ui; ctx.beginPath(); ctx.ellipse(f[0], f[1], .34 * s * (1 + .1 * Math.sin(F.rt * 3 + p.ph)), .34 * s * sp * (1 + .1 * Math.sin(F.rt * 3 + p.ph)), 0, 0, TAU); ctx.stroke();
      const gl = ctx.createLinearGradient(0, f[1], 0, tp[1]); gl.addColorStop(0, rgba(col, .16 * a)); gl.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gl; ctx.fillRect(f[0] - .3 * s, tp[1], .6 * s, f[1] - tp[1]);
      // corpo
      const gb = ctx.createLinearGradient(0, f[1], 0, hd[1]); gb.addColorStop(0, rgba(col, 0)); gb.addColorStop(.35, rgba(col, .55 * a)); gb.addColorStop(1, rgba(mixc(col, [255, 255, 255], .5), .85 * a));
      ctx.lineCap = 'round'; ctx.strokeStyle = gb; ctx.lineWidth = .36 * s; ctx.beginPath(); ctx.moveTo(f[0], f[1] - .05 * s); ctx.lineTo(c[0], c[1] - .12 * s); ctx.stroke();
      ctx.lineWidth = .2 * s; ctx.strokeStyle = rgba(mixc(col, [255, 255, 255], .7), .5 * a); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0], c[1] - .18 * s); ctx.stroke();
      // testa
      halo(ctx, col, hd[0], hd[1], .36 * s, .75 * a);
      ctx.fillStyle = rgba([255, 255, 255], .95 * a); ctx.beginPath(); ctx.arc(hd[0], hd[1], .125 * s, 0, TAU); ctx.fill();
    }

    _column(F, d) {
      const { ctx, s, sp, ui } = F, x = d.at[0], y = d.at[1], f = F.P(x, y, 0);
      if (d.P < 5) { ctx.strokeStyle = 'rgba(139,124,248,.4)'; ctx.lineWidth = 1.2 * ui; ctx.beginPath(); ctx.ellipse(f[0], f[1], .2 * s, .2 * s * sp, 0, 0, TAU); ctx.stroke(); return; }
      const hc = .22 + 1.9 * (1 - Math.exp(-d.P / 900)), hw = .15;
      const col = d.P < 300 ? mixc([34, 211, 238], [255, 196, 110], d.P / 300) : mixc([255, 196, 110], [255, 92, 110], clamp((d.P - 300) / 2200, 0, 1));
      const cs = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]], N = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      ctx.globalCompositeOperation = 'lighter';
      halo(ctx, col, f[0], f[1], .9 * s, (.35 + .15 * Math.sin(F.rt * 3)) , .9 * s * sp);
      for (let i = 0; i < 4; i++) {
        const nr = N[i][0] * F.sy + N[i][1] * F.cy; if (nr <= -.05) continue;
        const a = cs[i], b = cs[(i + 1) % 4], q = [F.P(x + a[0], y + a[1], 0), F.P(x + b[0], y + b[1], 0), F.P(x + b[0], y + b[1], hc), F.P(x + a[0], y + a[1], hc)];
        const g = ctx.createLinearGradient(0, q[0][1], 0, q[3][1]); g.addColorStop(0, rgba(col, .62)); g.addColorStop(1, rgba(col, .16));
        ctx.fillStyle = g; polyD(ctx, q); ctx.fill(); ctx.strokeStyle = rgba(mixc(col, [255, 255, 255], .45), .7); ctx.lineWidth = ui; ctx.stroke();
      }
      const tq = cs.map(c => F.P(x + c[0], y + c[1], hc)); ctx.fillStyle = rgba(mixc(col, [255, 255, 255], .5), .9); polyD(ctx, tq); ctx.fill();
      const tp = F.P(x, y, hc); halo(ctx, col, tp[0], tp[1], .5 * s, .8);
      F.pills.push({ x: tp[0], y: tp[1] - 20 * ui, t: d.name || d.entity, sub: d.P >= 1000 ? (d.P / 1000).toLocaleString(this._L.locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' kW' : Math.round(d.P) + ' W', col });
    }

    _panelBox(F) {
      const { ctx, s, sp, ui } = F, x = this._panel.at[0], y = this._panel.at[1], f = F.P(x, y, 0), hw = .22, hc = 1.05, col = [167, 139, 250];
      const cs = [[-hw, -hw * .5], [hw, -hw * .5], [hw, hw * .5], [-hw, hw * .5]], N = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      halo(ctx, col, f[0], f[1], .8 * s, .4, .8 * s * sp);
      for (let i = 0; i < 4; i++) {
        const nr = N[i][0] * F.sy + N[i][1] * F.cy; if (nr <= -.05) continue;
        const a = cs[i], b = cs[(i + 1) % 4], q = [F.P(x + a[0], y + a[1], 0), F.P(x + b[0], y + b[1], 0), F.P(x + b[0], y + b[1], hc), F.P(x + a[0], y + a[1], hc)];
        const g = ctx.createLinearGradient(0, q[0][1], 0, q[3][1]); g.addColorStop(0, 'rgba(70,64,120,.95)'); g.addColorStop(1, 'rgba(120,108,200,.95)');
        ctx.fillStyle = g; polyD(ctx, q); ctx.fill(); ctx.strokeStyle = 'rgba(210,200,255,.55)'; ctx.lineWidth = ui; ctx.stroke();
      }
      const tq = cs.map(c => F.P(x + c[0], y + c[1], hc)); ctx.fillStyle = 'rgba(200,190,255,.95)'; polyD(ctx, tq); ctx.fill();
      const kw = (F.st.total || 0) / 1000, tp = F.P(x, y, hc);
      F.pills.push({ x: tp[0], y: tp[1] - 20 * ui, t: this._config.panel_name || (this._L === TXT.en ? 'Panel' : 'Quadro'), sub: kw.toLocaleString(this._L.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kW', col });
    }

    _tree(F, t) {
      const { ctx, s, sp, ui } = F, b = F.P(t.x, t.y, 0), sway = Math.sin(F.rt * 1.2 + t.ph) * (.01 + F.w.wind * .0035) * s;
      const night = F.dayF, c1 = mixc([14, 36, 44], mixc([52, 130, 96], [92, 170, 112], t.tone), night), c2 = mulc(c1, .68);
      const u = [-F.d[0], -F.d[1]], litRight = (u[0] * F.cy - u[1] * F.sy) > 0;
      const trunk = F.P(t.x, t.y, t.h * .35);
      ctx.strokeStyle = rgba(mixc([40, 30, 40], [96, 72, 54], night), 1); ctx.lineWidth = .1 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(trunk[0], trunk[1]); ctx.stroke();
      for (let j = 0; j < 3; j++) {
        const zb = t.h * (.18 + .22 * j), zt = t.h * (.62 + .22 * j) , r = t.r * (1 - .2 * j) * s;
        const cb = F.P(t.x, t.y, zb), ap = F.P(t.x, t.y, zt); ap[0] += sway * (1 + j * .4);
        const L = litRight ? c2 : c1, R = litRight ? c1 : c2;
        ctx.fillStyle = rgba(mulc(L, .55 + F.amb * .6), 1); ctx.beginPath(); ctx.moveTo(ap[0], ap[1]); ctx.lineTo(cb[0] - r, cb[1]); ctx.quadraticCurveTo(cb[0], cb[1] + r * sp * 1.3, cb[0], cb[1] + r * sp * .7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(mulc(R, .55 + F.amb * .6 + F.sunI * .12), 1); ctx.beginPath(); ctx.moveTo(ap[0], ap[1]); ctx.lineTo(cb[0] + r, cb[1]); ctx.quadraticCurveTo(cb[0], cb[1] + r * sp * 1.3, cb[0], cb[1] + r * sp * .7); ctx.closePath(); ctx.fill();
      }
    }

    // ───────── pioggia, neve, nebbia ─────────
    _rWeather(F) {
      const { ctx, ui, w, rt } = F, pl = this._plat;
      const wind = clamp(w.wind / 12, 0, 1);
      if (w.rain > 0) {
        const n = Math.round(this._drops.length * w.rain), H = this._H;
        ctx.strokeStyle = 'rgba(205,224,255,.44)'; ctx.lineWidth = .9 * ui; ctx.lineCap = 'round'; ctx.beginPath();
        const rings = [];
        for (let i = 0; i < n; i++) {
          const d = this._drops[i];
          if (d.ih === undefined) { const x = lerp(pl[0][0], pl[2][0], d.x), y = lerp(pl[0][1], pl[2][1], d.y); d.ih = Object.values(this._rooms).some(r => !r.outdoor && inPoly(r.P, x, y)); }
          const zz = (1 - ((rt * 0.85 * d.v + d.z) % 1)) * 9; if (d.ih && zz < H) continue;
          const x = lerp(pl[0][0], pl[2][0], d.x) + zz * (.05 + wind * .25), y = lerp(pl[0][1], pl[2][1], d.y);
          const a = F.P(x, y, zz), b = F.P(x + .05 + wind * .12, y, zz + .6);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
          if (zz < .22 && !d.ih) rings.push([x - zz * (.05 + wind * .25), y, zz]);
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(205,224,255,.35)'; ctx.lineWidth = ui * .8;
        for (const r of rings) { const p = F.P(r[0], r[1], 0), k = (.22 - r[2]) / .22; ctx.beginPath(); ctx.ellipse(p[0], p[1], (.1 + .35 * k) * F.s, (.1 + .35 * k) * F.s * F.sp, 0, 0, TAU); ctx.stroke(); }
      }
      if (w.snow > 0) {
        const n = Math.round(this._drops.length * .8 * w.snow); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const d = this._drops[i], zz = (1 - ((rt * .13 * d.v + d.z) % 1)) * 9;
          const x = lerp(pl[0][0], pl[2][0], d.x) + Math.sin(rt * 1.3 + d.k * 40) * .35, y = lerp(pl[0][1], pl[2][1], d.y) + Math.cos(rt * 1.1 + d.k * 30) * .25;
          const p = F.P(x, y, zz); ctx.moveTo(p[0] + 1.7 * ui, p[1]); ctx.arc(p[0], p[1], (1.1 + d.k * 1.2) * ui, 0, TAU);
        }
        ctx.fill();
      }
      if (w.cond === 'fog') { const g = ctx.createLinearGradient(0, 0, 0, F.H); g.addColorStop(0, 'rgba(210,220,236,.18)'); g.addColorStop(1, 'rgba(210,220,236,.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, F.W, F.H); }
    }

    _rFinish(F) {
      const { ctx, W, H } = F;
      const g = ctx.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .35, W / 2, H * .5, Math.max(W, H) * .78); g.addColorStop(0, 'rgba(3,5,12,0)'); g.addColorStop(1, 'rgba(3,5,12,.5)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (this._flash > .02 && F.V.live !== false) { ctx.fillStyle = `rgba(215,228,255,${(this._flash * .38).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    }

    // ───────── foto e Short ─────────
    _stamp() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`; }
    _save(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 120000); }
    _photo() {
      this._draw();
      this._el.cv.toBlob(b => { if (b) this._save(b, `aurora-casa-3d-${this._stamp()}.png`); }, 'image/png');
    }
    _caption(F) {
      const L = this._L, st = F.st, join = l => l.length > 1 ? l.slice(0, -1).join(', ') + ' ' + L.and + ' ' + l[l.length - 1] : l[0];
      const rooms = [...new Set(F.beams.filter(b => b.inten > .08).map(b => this._rooms[b.o.room]?.name).filter(Boolean))];
      const lit = Object.values(this._rooms).filter(r => st.lights[r.id]).map(r => r.name);
      if (F.w.rain > .2) return L.cap_rain;
      if (rooms.length) return `${L.cap_sun} ${join(rooms.slice(0, 3))}`;
      if (lit.length && F.el < 4) return `${L.cap_lights} ${join(lit.slice(0, 3))}`;
      if (F.el > -6 && F.el < 6) return F.sun.az < 180 ? L.cap_dawn : L.cap_dusk;
      return F.el > 0 ? (L.cond[F.w.cond] || L.clear) : L.cap_night;
    }
    async _recordShort() {
      if (this._rec) return;
      const L = this._L;
      if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { alert(L.noRec); return; }
      const c = this._config.short || {}, W = 1080, H = 1920, secs = c.seconds || 14;
      const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
      const type = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const rec = new MediaRecorder(out.captureStream(30), { mimeType: type, videoBitsPerSecond: 14e6 });
      const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(res => { rec.onstop = res; });
      this._rec = true; const btn = this._el.short; btn.classList.add('rec'); btn.textContent = L.rec;
      const yaw0 = this._cam.yaw, base = new Date(this._sim ?? Date.now()), fromH = c.from_hour ?? 5.5, toH = c.to_hour ?? 21.5, sweep = c.sweep !== false;
      const T0 = new Date(base).setHours(Math.floor(fromH), (fromH % 1) * 60, 0, 0), T1 = new Date(base).setHours(Math.floor(toH), (toH % 1) * 60, 0, 0);
      const title = c.title || L.title, subtitle = c.subtitle || L.subtitle, brand = c.brand || '';
      rec.start(500);
      const t0 = performance.now(); let last = t0;
      await new Promise(resolve => {
        const frame = () => {
          const now = performance.now(), p = clamp((now - t0) / (secs * 1000), 0, 1), e = p * p * (3 - 2 * p);
          this._tick(Math.min(.1, (now - last) / 1000)); last = now;
          const T = sweep ? lerp(T0, T1, e) : base.getTime();
          const V = { yaw: yaw0 + p * 300, pitch: lerp(66, 40, e), zoom: lerp(1.0, 1.26, e), T, ui: 2.5, rt: this._rt, live: false, shiftY: -.035 };
          const F = this._render(o, W, H, V);
          // titolo e barra in basso
          const gt = o.createLinearGradient(0, 0, 0, 330); gt.addColorStop(0, 'rgba(5,8,15,.82)'); gt.addColorStop(1, 'rgba(5,8,15,0)'); o.fillStyle = gt; o.fillRect(0, 0, W, 330);
          const gb = o.createLinearGradient(0, H - 560, 0, H); gb.addColorStop(0, 'rgba(5,8,15,0)'); gb.addColorStop(.5, 'rgba(5,8,15,.8)'); gb.addColorStop(1, 'rgba(5,8,15,.92)'); o.fillStyle = gb; o.fillRect(0, H - 560, W, 560);
          o.textAlign = 'center'; o.textBaseline = 'alphabetic';
          o.fillStyle = '#E8ECF8'; o.font = '700 66px Sora, Manrope, sans-serif'; o.fillText(title, W / 2, 165);
          o.fillStyle = '#A3AECB'; o.font = '500 34px Manrope, sans-serif'; o.fillText(subtitle, W / 2, 220);
          o.fillStyle = '#FFFFFF'; o.font = '600 150px Sora, Manrope, sans-serif'; o.fillText(hhmm(T), W / 2, H - 330);
          o.fillStyle = F.el > 0 ? '#FFD9A0' : '#C9D1E8'; o.font = '600 42px Manrope, sans-serif'; o.fillText(this._caption(F), W / 2, H - 262);
          const bx = 110, bw = W - 220, by = H - 205, bh = 22;
          o.fillStyle = 'rgba(255,255,255,.14)'; o.beginPath(); o.roundRect ? o.roundRect(bx, by, bw, bh, 11) : o.rect(bx, by, bw, bh); o.fill();
          o.fillStyle = '#22D3EE'; o.beginPath(); o.roundRect ? o.roundRect(bx, by, Math.max(22, bw * p), bh, 11) : o.rect(bx, by, bw * p, bh); o.fill();
          o.fillStyle = '#fff'; o.shadowColor = '#22D3EE'; o.shadowBlur = 18; o.beginPath(); o.arc(bx + bw * p, by + bh / 2, 15, 0, TAU); o.fill(); o.shadowBlur = 0;
          if (brand) { o.fillStyle = '#A3AECB'; o.font = '600 32px Manrope, sans-serif'; o.fillText(brand, W / 2, H - 120); }
          if (p < 1) requestAnimationFrame(frame); else resolve();
        };
        frame();
      });
      rec.stop(); await done;
      this._rec = false; btn.classList.remove('rec'); btn.textContent = L.short;
      const blob = new Blob(chunks, { type: type || 'video/webm' });
      this._lastShort = blob;
      if (c.download !== false) this._save(blob, `aurora-casa-3d-short-${this._stamp()}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
    }
  }

  customElements.define('aurora-casa-3d', AuroraCasa3D);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'aurora-casa-3d', name: 'Aurora Casa 3D', description: 'La tua casa in 3D: sole e ombre vere, luci, persone, energia e meteo', preview: false });
  console.info('%c AURORA CASA 3D %c ' + AC3_VERSION + ' ', 'background:#7C5CFF;color:#fff;font-weight:700;border-radius:4px 0 0 4px', 'background:#22D3EE;color:#05080f;border-radius:0 4px 4px 0');
})();
