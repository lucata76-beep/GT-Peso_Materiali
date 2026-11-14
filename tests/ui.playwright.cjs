// Collaudo dell'interfaccia con Playwright: iPhone emulato (390×844) e desktop (1440×900), tema chiaro e scuro.
// Non usa Safari: è un browser Chromium con viewport e tocco emulati.
// Uso:  node tests/ui.playwright.cjs [cartella-per-gli-screenshot]
// Richiede Playwright installato globalmente (non è una dipendenza del progetto).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = process.argv[2] || null;
if (OUT) fs.mkdirSync(OUT, { recursive: true });

const CASI = [
  { nome: 'iphone-chiaro', viewport: { width: 390, height: 844 }, schema: 'light', mobile: true },
  { nome: 'iphone-scuro', viewport: { width: 390, height: 844 }, schema: 'dark', mobile: true },
  { nome: 'desktop-chiaro', viewport: { width: 1440, height: 900 }, schema: 'light', mobile: false },
  { nome: 'desktop-scuro', viewport: { width: 1440, height: 900 }, schema: 'dark', mobile: false },
];

let falliti = 0;
let totali = 0;
function verifica(cond, msg) {
  totali++;
  if (!cond) { falliti++; console.log('   FALLITO:', msg); }
}
const numero = (t) => Number(String(t).replace(/ /g, '').replace(',', '.'));
// il numero grande mostra 5 cifre significative: errore relativo massimo 5e-5
const vicino = (a, b) => Math.abs(a - b) <= 6e-5 * Math.abs(b);

// contrasto WCAG tra due colori [r, g, b]
function lum([r, g, b]) {
  const [x, y, z] = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * x + 0.7152 * y + 0.0722 * z;
}
const contrasto = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const daHex = (h) => { h = h.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };

// Colore del testo e sfondi effettivi di un elemento: sovrappone le trasparenze (tinte) e, se c'è una sfumatura,
// restituisce uno sfondo per ogni tratto della sfumatura. Per il testo con la sfumatura (fill trasparente)
// restituisce i tratti della sfumatura dal tema (--tg1, --tg2) al posto del colore.
async function misura(page, selettore, pseudo) {
  return page.evaluate(([sel, ps]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rgb = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    const sopra = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
    const strati = [];
    let base = null;
    const tf = getComputedStyle(el, ps || null).webkitTextFillColor;
    const testoASfumatura = tf === 'rgba(0, 0, 0, 0)' || tf === 'transparent';
    for (let n = testoASfumatura ? el.parentElement : el; n && !base; n = n.parentElement) { // la sfumatura del testo non è lo sfondo
      const cs = getComputedStyle(n);
      if (cs.backgroundImage.includes('gradient(')) { base = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(rgb); break; }
      const c = rgb(cs.backgroundColor);
      if (c.a >= 1) base = [c]; else if (c.a > 0) strati.push(c);
    }
    if (!base) base = [{ r: 255, g: 255, b: 255, a: 1 }];
    const sfondi = base.map((b) => strati.reduceRight((acc, t) => sopra(t, acc), b)).map((c) => [c.r, c.g, c.b]);
    const cs = getComputedStyle(el, ps || null);
    const radice = getComputedStyle(document.documentElement);
    const gradiente = testoASfumatura;
    const aHex = (v) => v.trim();
    return {
      fg: gradiente ? null : rgb(cs.color), gradiente: gradiente ? [aHex(radice.getPropertyValue('--tg1')), aHex(radice.getPropertyValue('--tg2'))] : null,
      fallback: rgb(cs.color), sfondi, bordo: rgb(cs.borderTopColor), bordoSx: rgb(cs.borderLeftColor),
      trasformazione: cs.transform, contenuto: cs.content, larghezzaBordoSx: cs.borderLeftWidth, lista: cs.listStyleType, display: cs.display
    };
  }, [selettore, pseudo || null]);
}
const pixel = (c) => [c.r, c.g, c.b];
// il testo (anche a sfumatura) deve passare `minimo` su ogni sfondo; restituisce il contrasto peggiore
function peggiore(m) {
  const testi = m.gradiente ? m.gradiente.map(daHex).concat([pixel(m.fallback)]) : [pixel(m.fg)];
  let min = Infinity;
  for (const t of testi) for (const b of m.sfondi) min = Math.min(min, contrasto(t, b));
  return min;
}
async function contrastoDi(page, sel, nome, minimo = 7) {
  const m = await misura(page, sel);
  if (!m) { verifica(false, `contrasto ${nome}: elemento ${sel} non trovato`); return null; }
  const cr = peggiore(m);
  verifica(cr >= minimo, `contrasto ${nome}: ${cr.toFixed(2)}:1 (minimo ${minimo}:1)`);
  return cr;
}

async function scegliPerNome(page, nome) {
  await page.fill('#q', '');
  await page.fill('#q', nome);
  await page.waitForSelector('#elenco:not([hidden])');
  const i = await page.$$eval('#elenco .voce', (els, n) => els.findIndex((e) => e.querySelector('b').textContent === n), nome);
  if (i < 0) return false;
  await page.click(`#o-${i}`);
  return true;
}
const leggiDB = (page) => page.evaluate(() => JSON.parse(document.getElementById('db-materiali').textContent));
const pngDimensioni = (file) => { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const SORGENTE = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

async function scrivi(page, sel, testo) {
  await page.fill(sel, '');
  await page.type(sel, testo);
}
async function cerca(page, testo) {
  await page.fill('#q', '');
  await page.fill('#q', testo);
  await page.waitForSelector('#elenco:not([hidden])');
  return page.$$eval('#elenco .voce b', (els) => els.map((e) => e.textContent));
}

async function caso(browser, c) {
  console.log(`\n== ${c.nome} (${c.viewport.width}×${c.viewport.height}, ${c.schema})`);
  const ctx = await browser.newContext({ viewport: c.viewport, colorScheme: c.schema, deviceScaleFactor: 2, isMobile: c.mobile, hasTouch: c.mobile });
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', (e) => errori.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()); });
  await page.goto(URL);

  // --- struttura di base
  verifica((await page.textContent('#footer')).startsWith('Database v'), 'footer con versione del database');
  const largh = await page.evaluate(() => { const m = document.querySelector('main').getBoundingClientRect(); return { w: m.width, l: m.left, scroll: document.documentElement.scrollWidth > window.innerWidth }; });
  verifica(!largh.scroll, 'nessuno scroll orizzontale');
  verifica(largh.w <= 480.5, `colonna unica larga al massimo 480 px (${largh.w})`);
  if (!c.mobile) verifica(Math.abs(largh.l - (c.viewport.width - largh.w) / 2) < 1.5, 'colonna centrata su desktop');
  verifica((await page.locator('.forma').count()) === 8, '8 forme');
  verifica((await page.locator('.interp').count()) >= 3, 'riga del valore interpretato sotto ogni campo');

  // --- intestazione: logo, nome, versione (una costante sola), una riga a 390 px
  verifica((await page.locator('h1').count()) === 1, 'un solo h1 (il nome dell\'app nell\'intestazione)');
  const ord = await page.evaluate(() => {
    const riga = document.querySelector('.testata-riga');
    const figli = [...riga.children].map((e) => e.className);
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { figli, logo: r('.logo'), nome: r('.nome'), ver: r('#versione'), riga: riga.getBoundingClientRect(), testo: document.querySelector('.nome').textContent,
      vers: document.querySelector('#versione').textContent, sc: riga.scrollWidth > riga.clientWidth, nomeAlt: getComputedStyle(document.querySelector('.nome')).lineHeight,
      nomeH: document.querySelector('.nome').getBoundingClientRect().height, sx: window.innerWidth };
  });
  verifica(ord.figli.join(',') === 'logo,nome,versione', `intestazione: logo, nome, versione in quest'ordine (${ord.figli})`);
  verifica(ord.testo === 'GT-Peso_Materiali', `nome dell'app «${ord.testo}»`);
  verifica(ord.logo.right <= ord.nome.left + 0.5 && ord.nome.right <= ord.ver.left + 0.5, 'da sinistra: logo, poi nome, poi versione');
  verifica(ord.logo.left < 40 && ord.logo.top < 24, `logo in alto a sinistra della pagina (x = ${Math.round(ord.logo.left)} px, y = ${Math.round(ord.logo.top)} px)`);
  verifica(ord.logo.width >= 40 && ord.logo.height >= 40, `logo mostrato almeno 40 px (${ord.logo.width}×${ord.logo.height})`);
  const centri = [ord.logo, ord.nome, ord.ver].map((x) => x.top + x.height / 2);
  verifica(Math.max(...centri) - Math.min(...centri) < 8, 'logo, nome e versione sulla stessa riga');
  verifica(ord.nomeH < parseFloat(ord.nomeAlt) * 1.5, `nome su una sola riga (altezza ${Math.round(ord.nomeH)} px)`);
  verifica(ord.riga.height < 72 && !ord.sc, `riga dell'intestazione compatta e senza taglio (${Math.round(ord.riga.height)} px)`);
  const logoInfo = await page.evaluate(() => { const i = document.querySelector('.logo'); return { nw: i.naturalWidth, nh: i.naturalHeight, ok: i.complete, alt: i.getAttribute('alt'), src: i.getAttribute('src') }; });
  verifica(logoInfo.ok && logoInfo.nw >= 120 && logoInfo.nh >= 120, `logo esportato almeno 120×120 (${logoInfo.nw}×${logoInfo.nh})`);
  verifica(logoInfo.alt && logoInfo.alt.length > 10, `logo con testo alternativo («${logoInfo.alt}»)`);
  verifica(logoInfo.src === 'assets/logo-gt.png', `logo nella cartella assets (${logoInfo.src})`);
  const nelFile = pngDimensioni(path.resolve(__dirname, '..', 'assets', 'logo-gt.png'));
  verifica(nelFile.w >= 120 && nelFile.h >= 120 && fs.statSync(path.resolve(__dirname, '..', 'assets', 'logo-gt.png')).size < 50 * 1024, `file del logo ${nelFile.w}×${nelFile.h}, sotto i 50 KB`);
  const touch = await page.evaluate(() => { const l = document.querySelector('link[rel="apple-touch-icon"]'); return l && l.getAttribute('href'); });
  const tFile = touch && path.resolve(__dirname, '..', touch);
  verifica(touch === 'apple-touch-icon.png' && fs.existsSync(tFile) && pngDimensioni(tFile).w === 180 && pngDimensioni(tFile).h === 180, 'apple-touch-icon 180×180 collegata');
  // versione: una sola costante nel codice, mostrata tale e quale
  const defs = SORGENTE.match(/const APP_VERSIONE = '([^']+)';/g) || [];
  verifica(defs.length === 1, `una sola definizione di APP_VERSIONE (${defs.length})`);
  const ver = defs.length ? defs[0].match(/'([^']+)'/)[1] : '';
  verifica(/^0\.\d+\.\d+$/.test(ver), `schema 0.<fase>.<revisione> (${ver})`);
  verifica(SORGENTE.split(`'${ver}'`).length === 2 && !SORGENTE.includes(`v${ver}`), 'la versione non è scritta a mano in nessun altro punto');
  verifica(ord.vers === 'v' + ver, `la versione in intestazione è quella della costante (${ord.vers})`);
  if (c.nome === 'iphone-chiaro') {
    for (const w of [320, 360, 390, 430]) {
      await page.setViewportSize({ width: w, height: 844 });
      const q = await page.evaluate(() => {
        const n = document.querySelector('.nome'); const v = document.querySelector('#versione').getBoundingClientRect();
        const riga = document.querySelector('.testata-riga');
        return { h: n.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(n).lineHeight), sc: document.documentElement.scrollWidth > window.innerWidth, vr: v.right, rw: riga.clientWidth, vh: v.height };
      });
      verifica(q.h < q.lh * 1.5 && !q.sc && q.vr <= w && q.vh < 32, `intestazione senza andare a capo a ${w} px (nome ${Math.round(q.h)} px, versione ${Math.round(q.vh)} px)`);
    }
    await page.setViewportSize(c.viewport);
  }

  // --- font-size ≥ 16 px su tutti i campi di testo e i select, per ogni forma (sotto i 16 px Safari su iPhone zooma da solo)
  const nomiForme = await page.$$eval('input[name="forma"]', (els) => els.map((e) => e.value));
  const sotto16 = [];
  let controlliFont = 0;
  for (const fo of nomiForme) {
    await page.check(`input[value="${fo}"]`, { force: true });
    const px = await page.$$eval('input, select, textarea', (els) => els
      .filter((e) => !['radio', 'checkbox', 'button', 'submit', 'hidden'].includes(e.type))
      .map((e) => ({ id: e.id, px: parseFloat(getComputedStyle(e).fontSize) })));
    controlliFont += px.length;
    px.filter((x) => x.px < 16).forEach((x) => sotto16.push(`${fo}:#${x.id}=${x.px}px`));
  }
  await page.check('input[value="tonda"]', { force: true });
  verifica(nomiForme.length === 8 && controlliFont >= 8 * 5, `font-size controllato su ${controlliFont} campi in ${nomiForme.length} forme`);
  verifica(sotto16.length === 0, `font-size ≥ 16 px su tutti i campi di testo e i select (sotto soglia: ${sotto16.join(', ')})`);

  // --- famiglie vuote nascoste
  await page.focus('#q');
  await page.waitForSelector('#elenco:not([hidden])');
  const fam = await page.$$eval('#elenco .fam', (els) => els.map((e) => e.textContent));
  verifica(fam.length === 10, `10 famiglie con voci (trovate ${fam.length})`);
  for (const nascosta of ['Acciai speciali', 'Ghise', 'Ferro']) verifica(!fam.includes(nascosta), `famiglia vuota «${nascosta}» nascosta`);
  verifica((await page.locator('#elenco .voce').count()) === 27, '27 voci nell\'elenco completo');

  // --- bersagli touch con l'elenco aperto
  const piccoli = await page.evaluate(() => [...document.querySelectorAll('#elenco .voce')].filter((e) => e.getBoundingClientRect().height < 44).length);
  verifica(piccoli === 0, 'voci dell\'elenco alte almeno 44 px');
  if (OUT && c.nome.startsWith('iphone-chiaro')) await page.screenshot({ path: path.join(OUT, `${c.nome}-elenco.png`) });

  // --- ricerca per designazione
  let r = await cerca(page, 'C45'); verifica(JSON.stringify(r.slice(0, 2).sort()) === JSON.stringify(['C45 (1.0503)', 'C45E']), `C45 → C45 (1.0503) e C45E in testa, designazione esatta (${r.slice(0, 2)})`);
  r = await cerca(page, '1.4301'); verifica(r.length === 1 && /304/.test(r[0]), `1.4301 → Inox 304 (${r})`);
  r = await cerca(page, '304'); verifica(/304/.test(r[0]), `304 → Inox 304 (${r[0]})`);
  r = await cerca(page, '7075'); verifica(r.length === 1 && /7075/.test(r[0]), `7075 (${r})`);
  r = await cerca(page, 'Ti-6Al-4V'); verifica(r.length === 1 && /Ti-6Al-4V/.test(r[0]), `Ti-6Al-4V (${r})`);
  r = await cerca(page, 'ti6al4v'); verifica(r.length === 1, `ti6al4v senza trattini (${r})`);
  r = await cerca(page, 'inox 316'); verifica(r.length === 1 && /316/.test(r[0]), `inox 316 (${r})`);
  r = await cerca(page, '316 inox'); verifica(r.length === 1 && /316/.test(r[0]), `316 inox, ordine inverso (${r})`);
  r = await cerca(page, 'boehler'); verifica(r.length === 3, `boehler → 1.2343, 1.2344 e 1.2379 (${r})`);
  r = await cerca(page, 'Durapur'); verifica(r.length === 1 && /100Cr6/.test(r[0]), `nome commerciale Durapur (${r})`);
  r = await cerca(page, 'H13'); verifica(r.length === 1 && /1\.2344/.test(r[0]), `H13 (${r})`);
  r = await cerca(page, 'CW614N'); verifica(r.length === 1 && /CuZn39Pb3/.test(r[0]), `CW614N (${r})`);
  r = await cerca(page, 'Sn'); verifica(r.some((x) => /Stagno/.test(x)), `Sn trova lo stagno (${r})`);
  r = await cerca(page, '1.0503');
  verifica(r.length === 1 && r[0] === 'C45 (1.0503)', `1.0503 → C45 (1.0503), non C45E (${r})`);
  r = await cerca(page, 'zzzzz');
  verifica(r.length === 0 && /Nessun materiale/.test(await page.textContent('#elenco')), 'testo senza corrispondenze: messaggio «Nessun materiale»');

  // --- ricerca intelligente: tag verificati, nomi neutri delle famiglie, «trovato per»
  const db = await leggiDB(page);
  const righe = async (q) => {
    await page.fill('#q', '');
    await page.fill('#q', q);
    await page.waitForSelector('#elenco:not([hidden])');
    return page.$$eval('#elenco .voce', (els) => els.map((e) => ({ nome: e.querySelector('b').textContent, trovato: e.querySelector('.trovato') ? e.querySelector('.trovato').textContent : '' })));
  };
  const nomiConTag = (t) => db.materiali.filter((v) => v.tag.some((x) => x.tag === t)).map((v) => v.nome).sort();
  const nomi = (rr) => rr.map((x) => x.nome).sort();
  for (const [q, tag] of [['bonificato', 'da bonifica'], ['BONIFICATA', 'da bonifica'], ['Bonifica', 'da bonifica'], ['acciaio da bonifica', 'da bonifica'],
    ['temprato', 'da tempra'], ['tempra', 'da tempra'], ['cementato', 'da cementazione'], ['cuscinetti', 'per cuscinetti'], ['automatico', 'automatico'],
    ['utensili a caldo', 'per utensili a caldo'], ['utensili a freddo', 'per utensili a freddo'], ['austenitico', 'austenitico'], ['precipitazione', 'indurente per precipitazione']]) {
    const rr = await righe(q);
    const attesi = nomiConTag(tag);
    verifica(attesi.length > 0 && JSON.stringify(nomi(rr)) === JSON.stringify(attesi), `«${q}» trova solo le voci con il tag «${tag}» (${nomi(rr).join(', ')} / attese ${attesi.join(', ')})`);
    verifica(rr.every((x) => (/\s/.test(q) ? x.trovato.includes(`tag «${tag}»` ) : x.trovato.startsWith(`trovato per: tag «${tag}»`))), `«${q}»: ogni riga dice «trovato per: tag «${tag}»» (${rr.map((x) => x.trovato).join(' | ')})`);
  }
  const bon = await righe('bonificato');
  verifica(!nomi(bon).some((n) => nomiConTag('da tempra').includes(n)), '«bonificato» non trova le voci «da tempra»');
  const tem = await righe('temprato');
  verifica(!nomi(tem).some((n) => nomiConTag('da bonifica').includes(n)), '«temprato» non trova le voci «da bonifica»');
  verifica(JSON.stringify(await page.$$eval('#elenco .fam', (els) => els.map((e) => e.textContent))) === JSON.stringify(['Acciai legati', 'Acciai per utensili']), 'temprato: solo le famiglie con risultati, a pari priorità nell\'ordine del DB (legati, utensili)');
  for (const q of ['bonificatoo', 'xyzzy', 'temprat0', 'cementat']) { const rr = await righe(q); verifica(rr.length === 0, `«${q}»: nessun risultato (${nomi(rr)})`); }
  const FAM = 'trovato per: famiglia (classificazione dell\'app)';
  const acc = await righe('acciaio');
  const nAcc = db.materiali.filter((v) => /^Acciai/.test(v.famiglia)).length;
  verifica(acc.length === nAcc, `«acciaio» trova tutti gli ${nAcc} acciai (${acc.length})`);
  verifica(acc.find((x) => x.nome === 'C45E').trovato === FAM, '«acciaio»: C45E «trovato per: famiglia (classificazione dell\'app)»');
  verifica(/^trovato per: nome/.test(acc.find((x) => /^Acciaio per utensili 1\.2344/.test(x.nome)).trovato), '«acciaio»: la voce con «Acciaio» nel nome è trovata per nome');
  const iFam = acc.findIndex((x) => x.trovato === FAM), iNome = acc.map((x) => x.trovato).lastIndexOf(acc.find((x) => /^trovato per: nome/.test(x.trovato)).trovato);
  verifica(iFam > iNome, '«acciaio»: le voci per famiglia vengono dopo quelle per nome (priorità bassa)');
  const ott = await righe('ottone');
  verifica(ott.length === 2 && /CuZn39Pb3/.test(ott[0].nome) && /^trovato per: nome/.test(ott[0].trovato) && /Cu-ETP/.test(ott[1].nome) && ott[1].trovato === FAM, `«ottone»: CuZn39Pb3 per nome, poi Cu-ETP per famiglia (${JSON.stringify(ott)})`);
  const rame = await righe('rame');
  verifica(rame.length === 2 && /Cu-ETP/.test(rame[0].nome) && rame[1].trovato === FAM, '«rame»: Cu-ETP per nome, l\'ottone per famiglia');
  const nFam = (f) => db.materiali.filter((v) => v.famiglia === f).length;
  for (const [q, n] of [['alluminio', nFam('Alluminio e leghe')], ['titanio', nFam('Titanio')], ['inox', nFam('Acciai inox')], ['stagno', nFam('Stagno')]]) { const rr = await righe(q); verifica(rr.length === n, `«${q}» trova ${n} voci (${rr.length})`); }
  verifica((await righe('alluminio')).every((x) => /^trovato per: (nome|famiglia)/.test(x.trovato)), '«alluminio»: motivo mostrato su ogni riga');
  const bohler = ['BÖHLER', 'Böhler', 'bohler', 'BOEHLER'];
  for (const q of bohler) verifica((await righe(q)).length === 3, `«${q}» trova 1.2343, 1.2344 e 1.2379 (W300, W302, K110)`);
  verifica((await righe('')).every((x) => true) && !/\b(EN EN|UNI UNI|DIN DIN)\b/.test(await page.innerText('#elenco')), 'elenco completo: nessuna etichetta ripetuta (es. «EN EN»)');
  const c45 = await righe('C45');
  verifica(['C45E', 'C45 (1.0503)'].includes(c45[0].nome) && ['C45E', 'C45 (1.0503)'].includes(c45[1].nome) && /^trovato per: designazione/.test(c45[0].trovato) && /^trovato per: designazione/.test(c45[1].trovato), `«C45»: le due designazioni esatte per prime, con il motivo (${c45[0].trovato} | ${c45[1].trovato})`);
  await page.fill('#q', '');
  await page.waitForSelector('#elenco:not([hidden])');
  verifica((await page.locator('#elenco .trovato').count()) === 0, 'elenco completo: nessun «trovato per»');
  verifica((await page.locator('.elenco .nulla, #elenco .nulla').count()) === 0, 'nessun messaggio «nessun materiale» con l\'elenco completo');
  await page.fill('#q', 'ergal');
  verifica((await page.locator('#elenco .voce').count()) === db.materiali.filter((v) => v.alias.some((a) => /ergal/i.test(a.alias))).length, '«ergal» trova solo le voci che hanno quell\'alias nel DB');
  for (const q of ['ergal', 'ERGAL', 'Ergal 7075']) {
    const rr = await righe(q);
    const motivoAlias = 'trovato per: alias «Ergal» (alias non da produttore)';
    verifica(rr.length === 1 && rr[0].nome === 'Alluminio 7075' && (q === 'Ergal 7075' ? rr[0].trovato.startsWith(motivoAlias + ' · altra designazione') : rr[0].trovato === motivoAlias), `«${q}»: Alluminio 7075 per alias (${JSON.stringify(rr)})`);
  }

  // --- Fase 2c: alias con una sola fonte, sinonimi dell'app, numero abbreviato, corrispondenze indicative
  {
    const ALIAS1 = (a) => `trovato per: alias «${a}» (alias non da produttore, una sola fonte)`;
    for (const [q, nome, alias] of [['korv', 'Acciaio per utensili 1.2379 (D2)', 'KORV'], ['KORV', 'Acciaio per utensili 1.2379 (D2)', 'KORV'], ['ncm2', '39NiCrMo3', 'NCM2'], ['NCM2', '39NiCrMo3', 'NCM2']]) {
      const rr = await righe(q);
      verifica(rr.length === 1 && rr[0].nome === nome && rr[0].trovato === ALIAS1(alias), `«${q}» → ${nome}, «${rr[0] ? rr[0].trovato : '-'}»`);
    }
    for (const q of ['ferro', 'acciaio dolce']) {
      const rr = await righe(q);
      verifica(rr.length === 1 && rr[0].nome === 'S235JR' && rr[0].trovato === 'trovato per: sinonimo dell\'app', `«${q}» → S235JR «trovato per: sinonimo dell'app» (${JSON.stringify(rr)})`);
    }
    verifica((await page.$$eval('#elenco .fam', (els) => els.map((e) => e.textContent))).join() === 'Acciai al carbonio', '«ferro»: S235JR sotto «Acciai al carbonio» (la famiglia «Ferro» resta nascosta)');
    for (const [q, nome] of [['2343', 'Acciaio per utensili 1.2343 (H11)'], ['2311', 'Acciaio per utensili 1.2311 (P20)'], ['2379', 'Acciaio per utensili 1.2379 (D2)'], ['4462', 'Inox duplex 1.4462 (F51)'], ['0038', 'S235JR']]) {
      const rr = await righe(q);
      verifica(rr.length === 1 && rr[0].nome === nome && rr[0].trovato === 'trovato per: numero abbreviato (regola dell\'app)', `«${q}» → ${nome}, numero abbreviato (${JSON.stringify(rr)})`);
    }
    verifica((await righe('6511')).length === 0, '«6511» (corrispondenza indicativa) non trova il 39NiCrMo3');
    const bon = nomi(await righe('bonificato'));
    verifica(['39NiCrMo3', 'Acciaio per utensili 1.2311 (P20)', 'C45 (1.0503)', 'C45E', '42CrMo4'].every((n) => bon.includes(n)), `«bonificato» trova 39NiCrMo3, 1.2311, C45, C45E, 42CrMo4 (${bon})`);
    const tem = await righe('temprato');
    verifica(tem.some((x) => x.nome === 'Acciaio per utensili 1.2343 (H11)' && /^trovato per: tag «da tempra»/.test(x.trovato)), '«temprato» trova il 1.2343 dal tag «da tempra»');
    verifica(JSON.stringify(nomi(await righe('duplex'))) === JSON.stringify(['Inox duplex 1.4462 (F51)']), '«duplex» trova l\'inox duplex 1.4462');
    // segnaposto: ogni esempio trova qualcosa
    const ph = await page.getAttribute('#q', 'placeholder');
    const esempi = ph.split(',').map((x) => x.replace('…', '').trim()).filter(Boolean);
    for (const q of esempi) verifica((await righe(q)).length > 0, `esempio del segnaposto «${q}» trova qualcosa`);
    verifica(esempi.length >= 4, `segnaposto con ${esempi.length} esempi («${ph}»)`);
  }

  // --- tastiera: frecce + Invio
  await cerca(page, 'alluminio');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  verifica(/Alluminio/.test(await page.inputValue('#q')), 'selezione con tastiera');
  verifica(await page.isHidden('#elenco'), 'elenco chiuso dopo la scelta');

  // --- calcolo: Inox 304, D100 × L100, mm → kg
  await cerca(page, 'inox 304');
  await page.click('#elenco .voce');
  verifica(await page.isVisible('#scheda'), 'scheda del materiale visibile');
  await scrivi(page, '#c-D', '100');
  await scrivi(page, '#c-L', '100');
  const atteso = Math.PI / 4 * 100 * 100 * 100 / 1000 * 7.9 / 1000; // kg
  const letto = numero(await page.textContent('#peso-grande'));
  verifica(vicino(letto, atteso), `peso 304 D100×L100 = ${atteso.toFixed(5)} kg (letto ${letto})`);
  verifica(await page.isVisible('#barra'), 'barra del peso visibile');
  const hBarra = await page.evaluate(() => document.querySelector('#barra').getBoundingClientRect().height);
  verifica(hBarra < 60, `barra del peso su una riga (altezza ${Math.round(hBarra)} px)`);
  // --- l'intestazione scorre via, resta fissa solo la barra del peso
  await page.evaluate(() => window.scrollTo(0, 0));
  const ps0 = await page.evaluate(() => ({ t: document.querySelector('.testata').getBoundingClientRect(), b: document.querySelector('#barra').getBoundingClientRect() }));
  verifica(ps0.t.top === 0 && Math.abs(ps0.b.top - ps0.t.bottom) <= 1, 'in cima: intestazione e sotto la barra del peso');
  const margine = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  verifica(margine > ps0.t.height + 10, `pagina abbastanza lunga per scorrere (${Math.round(margine)} px)`);
  await page.evaluate(() => window.scrollTo(0, Math.min(900, document.documentElement.scrollHeight)));
  const ps1 = await page.evaluate(() => ({ t: document.querySelector('.testata').getBoundingClientRect().bottom, b: document.querySelector('#barra').getBoundingClientRect().top,
    pb: getComputedStyle(document.querySelector('#barra')).position, pt: getComputedStyle(document.querySelector('.testata')).position }));
  verifica(ps1.t <= 0, `scorrendo, l'intestazione esce dallo schermo (fondo a ${Math.round(ps1.t)} px)`);
  verifica(ps1.pb === 'sticky' && Math.abs(ps1.b) <= 1, `la barra del peso resta in alto (top ${Math.round(ps1.b)} px)`);
  verifica(ps1.pt !== 'sticky' && ps1.pt !== 'fixed', `l'intestazione non è fissa (${ps1.pt})`);
  await page.evaluate(() => window.scrollTo(0, 0));
  const dett = await page.textContent('#dettagli');
  for (const parte of ['Densità usata', 'Formula e passaggi', 'Volume', 'Peso unitario', 'Peso totale', 'Lucefin Group', 'produttore e distributore', 'Swiss Steel', 'Apri il documento'])
    verifica(dett.includes(parte), `dettagli contengono «${parte}»`);
  verifica(!/\)\)/.test(await page.textContent('#dettagli')), 'nessuna parentesi doppia nelle fonti');
  verifica(!/NaN|undefined|Infinity/.test(await page.evaluate(() => document.body.innerText)), 'nessun NaN/undefined a schermo (testo visibile)');
  verifica((await page.textContent('.dicitura')).includes('senza tolleranze né raggi'), 'dicitura fissa presente');

  // --- aggiornamento mentre si scrive (nessun pulsante «Calcola»)
  await scrivi(page, '#c-L', '200');
  const letto2 = numero(await page.textContent('#peso-grande'));
  verifica(vicino(letto2, 2 * atteso), 'il risultato si aggiorna mentre si scrive');
  verifica((await page.locator('button', { hasText: /calcol/i }).count()) === 0, 'nessun pulsante Calcola (il peso si aggiorna mentre si scrive)');

  // --- valore interpretato e separatori
  await scrivi(page, '#c-D', '1,5');
  verifica((await page.textContent('#i-D')).trim() === '= 1,5 mm', `«1,5» → = 1,5 mm (${await page.textContent('#i-D')})`);
  await scrivi(page, '#c-D', '1.5');
  verifica((await page.textContent('#i-D')).trim() === '= 1,5 mm', `«1.5» → = 1,5 mm`);
  await scrivi(page, '#c-D', '1.000,5');
  verifica(/un solo separatore/.test(await page.textContent('#i-D')), 'separatori ambigui: errore mirato');
  verifica((await page.getAttribute('#c-D', 'aria-invalid')) === 'true', 'aria-invalid sul campo errato');
  verifica((await page.textContent('#peso-grande')) === '–', 'nessun risultato con un campo errato');
  await scrivi(page, '#c-D', 'abc');
  verifica(/Scrivi un numero/.test(await page.textContent('#i-D')), 'testo non numerico: errore');
  await scrivi(page, '#c-D', '0');
  verifica(/maggiore di zero/.test(await page.textContent('#i-D')), 'zero: errore');

  // --- unità di lunghezza e di peso
  await scrivi(page, '#c-D', '1');
  await scrivi(page, '#c-L', '10');
  await page.selectOption('#unita-lung', 'in');
  verifica((await page.textContent('label[for="c-D"]')).includes('(in)'), 'etichetta in pollici');
  verifica((await page.textContent('#i-D')).trim() === '= 1 in', `interpretato in pollici (${await page.textContent('#i-D')})`);
  const kgIn = numero(await page.textContent('#peso-grande'));
  const attesoIn = Math.PI / 4 * 25.4 * 25.4 * 254 / 1000 * 7.9 / 1000;
  verifica(vicino(kgIn, attesoIn), `pollici: ${attesoIn.toFixed(5)} kg (letto ${kgIn})`);
  await page.selectOption('#unita-peso', 'lb');
  const lb = numero(await page.textContent('#peso-grande'));
  verifica(vicino(lb, attesoIn / 0.45359237), 'peso in libbre');
  await page.selectOption('#unita-peso', 'kg');
  await page.selectOption('#unita-lung', 'mm');

  // --- pezzi
  await scrivi(page, '#c-D', '100');
  await scrivi(page, '#c-L', '100');
  await scrivi(page, '#pezzi', '3');
  verifica((await page.textContent('#peso-etichetta')).includes('3 pezzi'), 'etichetta «Peso totale (3 pezzi)»');
  verifica((await page.textContent('#peso-stato')).includes('Peso unitario'), 'peso unitario mostrato');
  const tot = numero(await page.textContent('#peso-grande'));
  verifica(vicino(tot, 3 * atteso), 'totale = 3 × unitario');
  await scrivi(page, '#pezzi', '1,5');
  verifica(/numero intero/.test(await page.textContent('#i-pezzi')), 'pezzi non interi: errore');
  await scrivi(page, '#pezzi', '1');

  // --- tubo: spessore troppo grande
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.check('input[value="tubo"]', { force: true });
  await scrivi(page, '#c-De', '20');
  await scrivi(page, '#c-s', '10');
  await scrivi(page, '#c-L', '100');
  verifica(/2·s/.test(await page.textContent('#i-s')), 'tubo: errore 2s < De sotto lo spessore');
  verifica((await page.textContent('#peso-grande')) === '–', 'tubo errato: nessun risultato');
  verifica(/Correggi/.test(await page.textContent('#peso-stato')), 'messaggio «correggi i campi»');
  await scrivi(page, '#c-s', '2');
  verifica((await page.textContent('#peso-grande')) !== '–', 'tubo corretto: risultato');

  // --- tubo quadro/rettangolare: avviso spigoli vivi
  await page.check('input[value="tuboq"]', { force: true });
  verifica(await page.isVisible('#avviso-forma') && /spigoli vivi/.test(await page.textContent('#avviso-forma')), 'avviso spigoli vivi');
  await page.check('input[value="sfera"]', { force: true });
  verifica(await page.isHidden('#avviso-forma'), 'avviso nascosto per le altre forme');

  // --- volume noto
  await page.check('input[value="volume"]', { force: true });
  verifica((await page.textContent('label[for="c-V"]')).includes('(mm³)'), 'volume in mm³');
  await page.selectOption('#unita-lung', 'cm');
  verifica((await page.textContent('label[for="c-V"]')).includes('(cm³)'), 'volume in cm³');
  await scrivi(page, '#c-V', '100');
  const volKg = numero(await page.textContent('#peso-grande'));
  verifica(vicino(volKg, 100 * 7.9 / 1000), 'volume noto 100 cm³ × 7,9');
  await page.selectOption('#unita-lung', 'mm');
  await page.check('input[value="tonda"]', { force: true });

  // --- densità con intervallo: 1.2344
  await cerca(page, '1.2344');
  await page.click('#elenco .voce');
  await scrivi(page, '#c-D', '100');
  await scrivi(page, '#c-L', '100');
  verifica(await page.isVisible('#peso-intervallo') && /va da/.test(await page.textContent('#peso-intervallo')), 'intervallo di peso visibile sotto il numero grande');
  const d2 = await page.textContent('#dettagli');
  for (const parte of ['Intervallo delle letture', '7,74–7,8', 'valore nominale: punto medio', 'BÖHLER', 'Lucefin']) verifica(d2.includes(parte), `intervallo e fonti: «${parte}»`);
  verifica((await page.textContent('#scheda')).includes('letture dei documenti'), 'scheda: intervallo accanto alla densità nominale');

  // --- fonte singola e composizione parziale
  await cerca(page, '42CrMo4'); await page.click('#elenco .voce');
  verifica((await page.textContent('#dettagli')).includes('Una sola fonte di densità'), 'fonte singola segnalata (42CrMo4)');
  for (const q of ['CW614N', 'Ti-6Al-4V', 'Cu-ETP', 'titanio grado 2']) {
    await cerca(page, q); await page.click('#elenco .voce');
    verifica((await page.textContent('#scheda')).includes('solo gli elementi riportati dal documento'), `composizione parziale dichiarata (${q})`);
  }
  verifica(!(await page.textContent('#dettagli')).includes('Composizione parziale'), 'dicitura di parzialità non ripetuta nei dettagli del risultato');
  await cerca(page, '1.4301'); await page.click('#elenco .voce');
  verifica(!(await page.textContent('#scheda')).includes('Composizione parziale'), 'nessuna dicitura di parzialità su una composizione completa (304)');
  verifica((await page.textContent('#scheda')).includes('EN 10088-3:2014'), 'composizione: norma citata sulla scheda');
  verifica(await page.evaluate(() => document.querySelector('#det-comp').open) && await page.isVisible('#det-comp table.comp'), 'composizione aperta e visibile senza toccare nulla');
  verifica(!(await page.evaluate(() => document.querySelector('#det-fonti').open)), 'fonti chiuse in modo predefinito');

  // --- frecce delle sezioni apribili: visibili, con stato aperto/chiuso
  await scegliPerNome(page, 'Inconel 718');
  let ac = await misura(page, '#det-comp > summary', '::before');
  let af = await misura(page, '#det-fonti > summary', '::before');
  const ruotata = (t) => { if (t === 'none') return false; const n = t.match(/-?[\d.e-]+/g).map(Number); return Math.abs(n[0]) < 1e-6 && Math.abs(n[1] - 1) < 1e-6; };
  for (const [nome, a] of [['composizione', ac], ['fonti', af]]) {
    verifica(a.contenuto === '""' && a.larghezzaBordoSx === '12px' && a.display === 'block', `freccia «${nome}» presente (contenuto ${a.contenuto}, bordo ${a.larghezzaBordoSx})`);
    verifica(contrasto(pixel(a.bordoSx), a.sfondi[0]) >= 3, `freccia «${nome}»: contrasto ${contrasto(pixel(a.bordoSx), a.sfondi[0]).toFixed(2)}:1 (minimo 3:1 per elementi grafici)`);
  }
  verifica((await misura(page, '#det-comp > summary')).lista === 'none', 'nessun marcatore nativo accanto alla freccia');
  verifica(ruotata(ac.trasformazione) && !ruotata(af.trasformazione), `freccia: composizione aperta (giù), fonti chiusa (destra) — ${ac.trasformazione} / ${af.trasformazione}`);
  await page.click('#det-fonti > summary');
  await page.waitForTimeout(300);
  af = await misura(page, '#det-fonti > summary', '::before');
  verifica(await page.evaluate(() => document.querySelector('#det-fonti').open) && ruotata(af.trasformazione), 'cliccando, le fonti si aprono e la freccia ruota');
  await page.click('#det-comp > summary');
  await page.waitForTimeout(300);
  ac = await misura(page, '#det-comp > summary', '::before');
  verifica(!(await page.evaluate(() => document.querySelector('#det-comp').open)) && !ruotata(ac.trasformazione), 'cliccando, la composizione si chiude e la freccia torna a destra');
  await page.click('#det-comp > summary');
  verifica(await page.evaluate(() => document.querySelector('#det-comp').open), 'la composizione si riapre');

  // --- per ogni voce: composizione davvero visibile (righe = elementi del DB), tag e relative prove
  let controlliVoci = 0;
  for (const m of db.materiali) {
    verifica(await scegliPerNome(page, m.nome), `scegli «${m.nome}»`);
    verifica(await page.evaluate(() => document.querySelector('#det-comp').open), `${m.nome}: composizione aperta`);
    if (m.composizione.tipo === 'elemento') {
      verifica((await page.innerText('#det-comp')).includes(m.composizione.simbolo), `${m.nome}: elemento puro ${m.composizione.simbolo} visibile`);
    } else {
      const attesi = Object.keys(m.composizione.elementi).map((k) => (k === 'Altri_ciascuno' ? 'Altri (ciascuno)' : k === 'Altri_totale' ? 'Altri (totale)' : k));
      const visti = await page.$$eval('#det-comp table.comp tbody tr td:first-child', (tds) => tds.filter((t) => t.getBoundingClientRect().height > 0).map((t) => t.textContent));
      verifica(JSON.stringify(visti) === JSON.stringify(attesi), `${m.nome}: ${attesi.length} elementi visibili in composizione (${visti.length})`);
    }
    verifica(!/\b(EN EN|UNI UNI|DIN DIN)\b/.test(await page.innerText('#scheda')), `${m.nome}: nessuna etichetta di designazione ripetuta (es. «EN EN»)`);
    const chip = await page.$$eval('#scheda ul.tag li', (els) => els.map((e) => e.textContent));
    verifica(JSON.stringify(chip) === JSON.stringify(m.tag.map((t) => t.tag)), `${m.nome}: tag mostrati ${JSON.stringify(chip)}`);
    await page.click('#det-fonti > summary');
    const fonti = await page.innerText('#det-fonti');
    verifica((await page.locator('#det-fonti ul.fonti > li').count()) === m.fonti.length, `${m.nome}: ${m.fonti.length} fonti elencate`);
    for (const t of m.tag) {
      verifica(fonti.includes(t.tag), `${m.nome}: tag «${t.tag}» con le prove tra le fonti`);
      for (const pr of t.prove) {
        const fo = m.fonti.find((x) => x.id === pr.fonte);
        verifica(fonti.includes(`pag. ${pr.pagina}`) && fonti.includes(pr.estratto) && fonti.includes(fo.emittente), `${m.nome}/${t.tag}: ${fo.emittente}, pag. ${pr.pagina}, frase`);
      }
    }
    verifica(m.tag.length === 0 || fonti.includes('Tag: dove sono documentati'), `${m.nome}: sezione delle prove dei tag`);
    for (const al of m.alias) {
      const scheda = await page.innerText('#scheda');
      const dicitura = al.origine === 'produttore' ? 'alias da produttore' : (al.una_sola_fonte ? 'alias non da produttore, una sola fonte' : 'alias non da produttore');
      verifica(scheda.includes(`Alias: ${al.alias} (${dicitura})`), `${m.nome}: alias «${al.alias}» sulla scheda con la dicitura «${dicitura}»`);
      verifica(!al.nota || scheda.includes(al.nota), `${m.nome}: nota sull'alias «${al.alias}» sulla scheda`);
      verifica(fonti.includes('Alias: dove sono documentati'), `${m.nome}: sezione delle prove degli alias`);
      for (const pr of al.prove) {
        const fo = m.fonti.find((x) => x.id === pr.fonte);
        verifica(fonti.includes(`pag. ${pr.pagina}`) && fonti.includes(pr.estratto) && fonti.includes(fo.emittente), `${m.nome}/${al.alias}: ${fo.emittente}, pag. ${pr.pagina}, frase`);
      }
      verifica(fonti.includes(dicitura), `${m.nome}: «${dicitura}» anche tra le fonti`);
    }
    await page.click('#det-fonti > summary');
    controlliVoci++;
  }
  verifica(controlliVoci === db.materiali.length && db.materiali.length === 27, `${controlliVoci} voci controllate`);
  // --- documenti forniti da Luca: nessun link, solo la dicitura; corrispondenze indicative; fonti indipendenti per ogni voce
  await scegliPerNome(page, '39NiCrMo3');
  const sch = await page.innerText('#scheda');
  verifica(sch.includes('Alias: NCM2 (alias non da produttore, una sola fonte)') && sch.includes('Nota su «NCM2»: Colonna SIAU, catalogo IMS (UNI 7845).'), 'scheda 39NiCrMo3: alias NCM2 con «una sola fonte» e nota');
  verifica(sch.includes('Corrispondenze indicative (non sono identità): 36CrNiMo4 · 1.6511'), 'scheda 39NiCrMo3: corrispondenze indicative dichiarate come tali');
  verifica(!/DIN 36CrNiMo4/.test(sch), '36CrNiMo4 non compare come designazione DIN della voce');
  await page.click('#det-fonti > summary');
  const ftIms = await page.innerText('#det-fonti');
  const liIms = await page.$$eval('#det-fonti ul.fonti > li', (els) => els.map((e) => ({ t: e.textContent, link: !!e.querySelector('a') })));
  const ims = liIms.find((x) => /IMS S\.p\.A\./.test(x.t));
  verifica(ims && !ims.link && /Copia fornita da Luca: nessun link pubblico/.test(ims.t) && /catalogo commerciale/.test(ims.t), 'documento IMS: senza link, «Copia fornita da Luca», ruolo «catalogo commerciale»');
  verifica(ftIms.includes('pag. 1') && ftIms.includes('colonna SIAU, cella «NCM2»'), 'prova dell\'alias NCM2: pagina e cella');
  await page.click('#det-fonti > summary');
  await scegliPerNome(page, 'Acciaio per utensili 1.2379 (D2)');
  const sk = await page.innerText('#scheda');
  verifica(sk.includes('Alias: KORV (alias non da produttore, una sola fonte)') && sk.includes('Nota su «KORV»: Cella senza etichetta di colonna; scheda con dati indicativi.'), 'scheda 1.2379: alias KORV con «una sola fonte» e nota');
  await page.click('#det-fonti > summary');
  const liMor = await page.$$eval('#det-fonti ul.fonti > li', (els) => els.map((e) => ({ t: e.textContent, link: !!e.querySelector('a') })));
  const mor = liMor.find((x) => /Moretti Acciai/.test(x.t));
  verifica(mor && !mor.link && /distributore/.test(mor.t) && /Copia fornita da Luca/.test(mor.t), 'documento Moretti: senza link, ruolo «distributore»');
  await page.click('#det-fonti > summary');
  await page.check('input[value="tonda"]', { force: true });
  const ente = (e) => String(e).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  let unaFonte = 0;
  for (const m of db.materiali) {
    await scegliPerNome(page, m.nome);
    await scrivi(page, '#c-D', '100'); await scrivi(page, '#c-L', '100');
    const K = new Set(m.fonti.filter((f) => f.densita_letta).map((f) => ente(f.emittente))).size;
    const det = await page.innerText('#dettagli');
    verifica(det.includes(`Fonti indipendenti per la densità: ${K}`), `${m.nome}: fonti indipendenti per la densità = ${K}`);
    verifica(det.includes('Una sola fonte di densità') === (K === 1), `${m.nome}: «Una sola fonte di densità» ${K === 1 ? 'mostrata' : 'assente'} (K = ${K})`);
    if (K === 1) unaFonte++;
  }
  verifica(unaFonte >= 11, `${unaFonte} voci con una sola fonte indipendente di densità`);
  for (const id of ['39nicrmo3', '1.2311', 's235jr', 'c45']) {
    const m = db.materiali.find((v) => v.id === id);
    await scegliPerNome(page, m.nome);
    await scrivi(page, '#c-D', '100'); await scrivi(page, '#c-L', '100');
    verifica((await page.innerText('#dettagli')).includes('Una sola fonte di densità'), `${m.nome}: «Una sola fonte di densità»`);
  }
  const inc = db.materiali.find((v) => v.id === 'inconel718');
  await scegliPerNome(page, 'Inconel 718');
  verifica(Object.keys(inc.composizione.elementi).length >= 10 && (await page.locator('#det-comp table.comp tbody tr').count()) === Object.keys(inc.composizione.elementi).length, `Inconel 718: composizione con ${Object.keys(inc.composizione.elementi).length} righe visibili`);
  verifica(/Ni/.test(await page.innerText('#det-comp')) && /Cr/.test(await page.innerText('#det-comp')) && /Nb/.test(await page.innerText('#det-comp')), 'Inconel 718: Ni, Cr, Nb in composizione');
  await scegliPerNome(page, 'Inox 304 (1.4301)');

  // --- bersagli touch ≥ 44 px su tutti i controlli visibili
  await page.evaluate(() => window.scrollTo(0, 0));
  const piccoliCtrl = await page.evaluate(() => {
    const sel = 'input[type="text"], select, textarea, .btn, .forma, summary, ul.fonti a';
    return [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null).map((e) => {
      const r = e.getBoundingClientRect();
      return { t: (e.id || e.className || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter((x) => x.h < 44 || x.w < 44);
  });
  verifica(piccoliCtrl.length === 0, `bersagli touch ≥ 44 px (sotto soglia: ${JSON.stringify(piccoliCtrl)})`);
  const gran = await page.evaluate(() => getComputedStyle(document.querySelector('#peso-grande')).fontSize);
  verifica(parseFloat(gran) >= 40, `numero grande (${gran})`);
  verifica((await page.evaluate(() => getComputedStyle(document.body).fontVariantNumeric)).includes('tabular-nums'), 'cifre tabulari');
  verifica(await page.evaluate(() => document.querySelector('#c-D').getAttribute('inputmode')) === 'decimal', 'tastiera decimale');

  // --- contrasti (testo ≥ 7:1, bordi dei controlli e frecce ≥ 3:1), anche su tinte e sfumature
  await page.evaluate(() => window.scrollTo(0, 0));
  const MIS = [];
  const ct = async (sel, nome, min = 7) => { const cr = await contrastoDi(page, sel, nome, min); if (cr !== null) MIS.push(`${nome} ${cr.toFixed(1)}`); };
  await page.click('#det-fonti > summary');
  for (const [sel, nome] of [['body', 'testo'], ['.piccolo', 'testo secondario'], ['.nome', 'nome dell\'app'], ['#versione', 'versione'], ['h2', 'titoli'], ['ul.tag li', 'tag'],
    ['#det-comp > summary', 'titolo sezione'], ['table.comp td', 'tabella composizione'], ['ul.fonti li', 'fonti'], ['ul.fonti a', 'link'], ['ul.prove li', 'prove dei tag'],
    ['.stato', 'stato'], ['.dicitura', 'dicitura'], ['#peso-grande', 'numero grande'], ['.dettagli dd', 'dettagli'], ['.forma.attiva', 'forma attiva (su sfumatura)'],
    ['.forma:not(.attiva)', 'forma non attiva'], ['.interp', 'valore interpretato'], ['#barra-peso', 'barra del peso']]) await ct(sel, nome);
  await page.click('#det-fonti > summary');
  await page.check('input[value="tuboq"]', { force: true });
  await ct('#avviso-forma', 'avviso (su tinta)');
  await page.check('input[value="tonda"]', { force: true });
  const acs = await misura(page, '#det-comp > summary', '::before');
  const crFreccia = contrasto(pixel(acs.bordoSx), acs.sfondi[0]);
  verifica(crFreccia >= 3, `contrasto freccia: ${crFreccia.toFixed(2)}:1`);
  const fuori = (await misura(page, '#forme')).sfondi[0];
  for (const [sel, nome] of [['#unita-lung', 'bordo select'], ['#q', 'bordo campo di ricerca'], ['#c-D', 'bordo campo'], ['.forma:not(.attiva)', 'bordo forma'], ['.forma.attiva', 'bordo forma attiva'], ['#versione', 'bordo versione']]) {
    const m = await misura(page, sel);
    const cr = contrasto(pixel(m.bordo), fuori);
    verifica(cr >= 3, `contrasto ${nome}: ${cr.toFixed(2)}:1 (minimo 3:1)`);
    MIS.push(`${nome} ${cr.toFixed(1)}`);
  }
  // nel tema chiaro nessuna tinta del logo regge come testo: il colore d'accento è pieno, senza sfumatura
  const g = await page.evaluate(() => ({ a: getComputedStyle(document.documentElement).getPropertyValue('--tg1').trim(), b: getComputedStyle(document.documentElement).getPropertyValue('--tg2').trim() }));
  if (c.schema === 'light') verifica(g.a === g.b, `tema chiaro: testo d'accento a tinta unita (${g.a})`);
  else verifica(g.a !== g.b, `tema scuro: testo d'accento con la sfumatura giallo → arancio chiaro (${g.a} → ${g.b})`);
  await scrivi(page, '#c-D', 'x');
  await ct('.interp.errore', 'messaggio d\'errore');
  await scrivi(page, '#c-D', '100');
  // elenco aperto: intestazioni di famiglia, riga selezionata (tinta), «trovato per»
  await page.fill('#q', '');
  await page.fill('#q', 'acciaio');
  await page.waitForSelector('#elenco:not([hidden])');
  await page.keyboard.press('ArrowDown');
  await ct('#elenco .fam', 'intestazione famiglia');
  await ct('#elenco .voce[aria-selected="true"] b', 'riga selezionata (su tinta)');
  await ct('#elenco .voce[aria-selected="true"] small', 'riga selezionata, testo secondario (su tinta)');
  await ct('#elenco .voce:not([aria-selected="true"]) .trovato', '«trovato per»');
  await ct('#elenco', 'elenco');
  if (c.mobile) console.log('   contrasti misurati (' + c.schema + '): ' + MIS.join('; '));
  await page.fill('#q', '');

  // --- schermate di controllo
  if (OUT) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(OUT, `${c.nome}-completo.png`), fullPage: true });
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.screenshot({ path: path.join(OUT, `${c.nome}-barra.png`) });
  }

  // --- alias: nel DB reale non ce n'è ancora; la visualizzazione si prova su una copia con un alias inventato per il collaudo
  {
    const dbA = JSON.parse(JSON.stringify(db));
    const v = dbA.materiali.find((x) => x.id === '7075');
    v.fonti.push({ id: 'PROVA-A1', emittente: 'Fornitore di prova', ruolo: 'fornitore di lavorazioni', documento: 'Documento di prova uno', riferimento: 'alias p. 3', url: 'https://esempio.it/a1.pdf', sha256: '00', campi: ['alias'] });
    v.fonti.push({ id: 'PROVA-A2', emittente: 'Università di prova', ruolo: 'tesi o articolo tecnico', documento: 'Documento di prova due', riferimento: 'alias p. 7', url: 'https://esempio.it/a2.pdf', sha256: '00', campi: ['alias'] });
    v.alias = [{ alias: 'Provalias', origine: 'non da produttore', fonti: ['PROVA-A1', 'PROVA-A2'], prove: [{ fonte: 'PROVA-A1', pagina: 3, estratto: '7075 detto Provalias' }, { fonte: 'PROVA-A2', pagina: 7, estratto: 'Provalias (7075)' }] }];
    const htmlA = SORGENTE.replace(/(<script type="application\/json" id="db-materiali">)[\s\S]*?(<\/script>)/, (_, a, b) => a + JSON.stringify(dbA).replace(/</g, '\\u003c') + b);
    const pa = await ctx.newPage();
    await pa.setContent(htmlA);
    await pa.fill('#q', 'PROVALIAS');
    await pa.waitForSelector('#elenco:not([hidden])');
    const rr = await pa.$$eval('#elenco .voce', (els) => els.map((e) => ({ nome: e.querySelector('b').textContent, t: e.querySelector('.trovato').textContent })));
    verifica(rr.length === 1 && rr[0].nome === 'Alluminio 7075' && rr[0].t === 'trovato per: alias «Provalias» (alias non da produttore)', `alias: «PROVALIAS» → ${JSON.stringify(rr)}`);
    await pa.fill('#q', 'prova');
    verifica((await pa.locator('#elenco .voce').count()) === 1, 'alias: trovato anche con l\'inizio della parola');
    await pa.click('#elenco .voce');
    verifica((await pa.innerText('#scheda')).includes('Alias: Provalias (alias non da produttore)'), 'alias: indicato sulla scheda con la dicitura «alias non da produttore»');
    await pa.click('#det-fonti > summary');
    const ft = await pa.innerText('#det-fonti');
    verifica(ft.includes('Alias: dove sono documentati') && ft.includes('pag. 3') && ft.includes('pag. 7') && ft.includes('Fornitore di prova') && ft.includes('Università di prova'), 'alias: documenti e pagine tra le fonti');
    await pa.close();
  }

  // --- schede personali: inserimento, modifica, duplicazione, eliminazione, memoria del browser, esportazione e importazione
  {
    const CHIAVE = 'gtpm.schede-personali.v1';
    // l'archivio nella memoria del browser; se manca dà un archivio vuoto (così un salvataggio mancato è una verifica fallita, non un'interruzione)
    const memoria = async () => { const g = await page.evaluate((k) => localStorage.getItem(k), CHIAVE); return g ? JSON.parse(g) : { versione: null, schede: [] }; };
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    verifica(await page.isHidden('#editor') && await page.isVisible('#btn-nuova') && await page.isVisible('#btn-esporta') && await page.isVisible('label[for="file-importa"]'), 'schede personali: pulsanti visibili, modulo nascosto');
    const avvertenza = 'Le schede restano solo su questo dispositivo e in questa app (Safari oppure icona Home). Esporta ogni tanto per avere una copia.';
    verifica((await page.textContent('#nota-schede')).trim() === avvertenza && await page.isVisible('#nota-schede'), 'avvertenza sul dispositivo e sull\'app, scritta come richiesto');
    // su schermo largo i pulsanti vanno a capo (Importa sulla seconda riga): l'avvertenza deve stare sotto entrambi, a meno di 40 px dal più basso
    verifica(await page.evaluate(() => { const e = document.querySelector('#btn-esporta').getBoundingClientRect(); const i = document.querySelector('label[for="file-importa"]').getBoundingClientRect(); const n = document.querySelector('#nota-schede').getBoundingClientRect(); const fondo = Math.max(e.bottom, i.bottom); return n.top >= e.bottom - 1 && n.top >= i.bottom - 1 && n.top - fondo < 40 && n.width > 150; }), 'l\'avvertenza sta subito sotto i pulsanti «Esporta schede» e «Importa schede»');
    verifica(await page.evaluate(() => { const a = document.querySelector('.azioni-schede'); return a.nextElementSibling && a.nextElementSibling.id === 'nota-schede'; }), 'l\'avvertenza segue i pulsanti nel documento (anche per chi usa un lettore di schermo)');
    verifica(!/scheda personale|schede personali/.test(await page.textContent('#footer')), 'senza schede personali il piè di pagina non le nomina');
    await page.focus('#q'); await page.waitForSelector('#elenco:not([hidden])');
    verifica(!(await page.$$eval('#elenco .fam', (e) => e.map((x) => x.textContent))).includes('Schede personali'), 'senza schede il gruppo «Schede personali» non compare');
    const dbV = await leggiDB(page);
    const nBonificato = (await righe('bonificato')).length;

    // modulo e controlli
    await page.click('#btn-nuova');
    verifica(await page.isVisible('#editor') && (await page.textContent('#editor-titolo')) === 'Nuova scheda personale' && (await page.locator('.riga-comp').count()) === 2, 'modulo di inserimento aperto con 2 righe di composizione');
    verifica(await page.evaluate(() => document.activeElement.id) === 'e-nome', 'il cursore va sul nome');
    await page.click('#btn-salva');
    verifica(/Scrivi il nome/.test(await page.textContent('#e-nome-i')) && /Scrivi la densità/.test(await page.textContent('#e-dens-i')), 'salvando vuoto: errori su nome e densità');
    verifica((await page.getAttribute('#e-nome', 'aria-invalid')) === 'true' && (await page.getAttribute('#e-dens', 'aria-invalid')) === 'true', 'campi errati segnalati con aria-invalid');
    verifica(await page.isVisible('#editor') && (await page.evaluate((k) => localStorage.getItem(k), CHIAVE)) === null, 'con errori il modulo resta aperto e nulla viene salvato');
    await page.fill('#e-dens', '7850'); await page.selectOption('#e-dens-un', 'kg/m³');
    verifica((await page.textContent('#e-dens-i')).trim() === '= 7,85 g/cm³', `densità 7850 kg/m³ → = 7,85 g/cm³ (${await page.textContent('#e-dens-i')})`);
    await page.fill('#e-dens', '30'); await page.selectOption('#e-dens-un', 'g/cm³');
    verifica(/supera 25 g\/cm³/.test(await page.textContent('#e-dens-i')), 'densità oltre 25 g/cm³: errore');
    await page.fill('#e-dens', '7,6');
    await page.fill('#e-el-1', 'C'); await page.fill('#e-va-1', '0,35-0,43');
    verifica((await page.textContent('#e-ri-1')).trim() === '= da 0,35 a 0,43 %', 'riga di composizione: valore interpretato');
    await page.fill('#e-va-1', '0,5-0,35');
    verifica(/minimo supera il massimo/.test(await page.textContent('#e-ri-1')) && (await page.getAttribute('#e-va-1', 'aria-invalid')) === 'true', 'riga con minimo > massimo: errore');
    await page.fill('#e-va-1', '0,35-0,43');
    await page.fill('#e-el-2', 'cr'); await page.fill('#e-va-2', 'max 1');
    verifica(/Simbolo non valido/.test(await page.textContent('#e-ri-2')), 'simbolo «cr»: errore');
    await page.fill('#e-el-2', 'C');
    verifica(/già inserito/.test(await page.textContent('#e-ri-2')), 'elemento ripetuto: errore');
    await page.fill('#e-el-2', 'Cr');
    await page.click('#btn-riga');
    verifica((await page.locator('.riga-comp').count()) === 3, 'aggiungi elemento: 3 righe');
    const n3 = await page.locator('.riga-comp').nth(2).getAttribute('data-riga');
    await page.fill(`#e-el-${n3}`, 'Fe'); await page.fill(`#e-va-${n3}`, 'resto');
    await page.click('#btn-riga');
    await page.click('#e-righe .riga-comp:last-child [data-togli]');
    verifica((await page.locator('.riga-comp').count()) === 3, 'togli riga: torna a 3 righe');
    await page.fill('#e-nome', 'Lega di prova <b>x</b>');
    await page.fill('#e-des', 'ZETA-7; Sigla Y'); await page.fill('#e-nc', 'Zetalloy');
    await page.fill('#e-fonte', 'catalogo del fornitore, pag. 3'); await page.fill('#e-note', 'riga uno\nriga due');
    await page.click('#btn-salva');
    verifica(await page.isHidden('#editor') && await page.isVisible('#scheda'), 'scheda salvata: modulo chiuso e scheda mostrata');
    const sp = await page.innerText('#scheda');
    verifica(sp.includes('Lega di prova <b>x</b>') && (await page.locator('#scheda b').count()) === 0, 'il nome con codice HTML è mostrato come testo, non interpretato');
    for (const parte of ['Schede personali', 'Scheda personale · inserita da te, non verificata su documenti', 'Designazioni: ZETA-7 · Sigla Y', 'Nome commerciale: Zetalloy', 'Densità: 7,6 g/cm³', 'Fonte indicata da te: catalogo del fornitore, pag. 3', 'Note: riga uno riga due'])
      verifica(sp.includes(parte), `scheda personale mostra «${parte}»`);
    const righeComp = await page.$$eval('#det-comp table.comp tbody tr', (trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent)));
    verifica(JSON.stringify(righeComp) === JSON.stringify([['C', '0,35–0,43 %'], ['Cr', 'max 1 %'], ['Fe', 'resto']]), `composizione della scheda personale (${JSON.stringify(righeComp)})`);
    verifica(!(await page.locator('#scheda ul.tag, #scheda #det-fonti').count()), 'nessun tag né fonti sulla scheda personale');
    verifica(/salvata\. I dati sono tuoi e non sono verificati su documenti/.test(await page.textContent('#msg-schede')), 'messaggio di salvataggio');
    verifica(/ · 1 scheda personale$/.test(await page.textContent('#footer')), 'il piè di pagina conta le schede personali');
    // calcolo con la densità inserita
    await page.check('input[value="tonda"]', { force: true });
    await scrivi(page, '#c-D', '100'); await scrivi(page, '#c-L', '100');
    const kgP = numero(await page.textContent('#peso-grande'));
    verifica(vicino(kgP, Math.PI / 4 * 100 * 100 * 100 / 1000 * 7.6 / 1000), `peso con la densità personale 7,6: ${kgP} kg`);
    const dp = await page.innerText('#dettagli');
    verifica(dp.includes('7,6 g/cm³ — inserita da te') && dp.includes('Scheda personale: la densità e gli altri dati sono scritti da te e non sono verificati su documenti'), 'dettagli: densità «inserita da te» e dicitura non verificata');
    verifica(!/Fonti indipendenti|Una sola fonte|Apri il documento/.test(dp), 'dettagli: nessun conteggio di fonti per una scheda personale');
    verifica((await page.textContent('#barra-testo')).includes('Lega di prova'), 'barra del peso con il nome della scheda personale');
    // ricerca
    for (const [q, motivo] of [['zeta', /^trovato per: altra designazione «ZETA-7»$/], ['Lega di prova', /^trovato per: nome/], ['zeta-7', /^trovato per: altra designazione «ZETA-7»$/], ['sigla y', /^trovato per: altra designazione «Sigla Y»$/], ['zetalloy', /^trovato per: nome commerciale/]]) {
      const rr = await righe(q);
      verifica(rr.length === 1 && /^Lega di prova/.test(rr[0].nome) && motivo.test(rr[0].trovato), `ricerca «${q}» trova la scheda personale (${JSON.stringify(rr)})`);
    }
    verifica(JSON.stringify(await page.$$eval('#elenco .fam', (e) => e.map((x) => x.textContent))) === JSON.stringify(['Schede personali']), 'la scheda personale sta nel gruppo «Schede personali»');
    verifica((await page.textContent('#elenco .voce small')).startsWith('Scheda personale · 7,6 g/cm³'), 'riga dell\'elenco: «Scheda personale · densità»');
    verifica((await righe('bonificato')).length === nBonificato && (await righe('2343')).length === 1, 'le schede personali non cambiano i risultati del database verificato');
    await page.fill('#q', ''); await page.waitForSelector('#elenco:not([hidden])');
    verifica((await page.$$eval('#elenco .fam', (e) => e.map((x) => x.textContent))).slice(-1)[0] === 'Schede personali' && (await page.locator('#elenco .voce').count()) === dbV.materiali.length + 1, 'elenco completo: i materiali del database più la scheda personale in fondo');
    // memoria del browser: sopravvive alla ricarica
    const memo = (await memoria());
    verifica(memo.versione === 1 && memo.schede.length === 1 && /^p-/.test(memo.schede[0].id) && memo.schede[0].densita_g_cm3 === 7.6, 'archivio nella memoria del browser: versione 1, una scheda');
    await page.reload();
    verifica((await righe('zetalloy')).length === 1 && /1 scheda personale$/.test(await page.textContent('#footer')), 'dopo la ricarica la scheda personale c\'è ancora');

    // modifica: riapre il modulo con i valori scritti
    await page.click('#elenco .voce'); await page.click('#btn-modifica');
    verifica((await page.textContent('#editor-titolo')) === 'Modifica scheda personale' && (await page.inputValue('#e-nome')) === 'Lega di prova <b>x</b>' && (await page.inputValue('#e-dens')) === '7,6' && (await page.inputValue('#e-des')) === 'ZETA-7; Sigla Y', 'modifica: il modulo si riapre con i valori');
    const righeModulo = await page.$$eval('.riga-comp', (rs) => rs.map((r) => [r.querySelector('[data-comp="elemento"]').value, r.querySelector('[data-comp="valore"]').value]));
    verifica(JSON.stringify(righeModulo) === JSON.stringify([['C', '0,35-0,43'], ['Cr', 'max 1'], ['Fe', 'resto']]), `modifica: righe di composizione (${JSON.stringify(righeModulo)})`);
    await page.fill('#e-dens', '8000'); await page.selectOption('#e-dens-un', 'kg/m³'); await page.click('#btn-salva');
    await scrivi(page, '#c-D', '100'); await scrivi(page, '#c-L', '100');   // la ricarica ha azzerato le dimensioni
    verifica((await page.innerText('#scheda')).includes('Densità: 8 g/cm³ (inserita come 8000 kg/m³)'), 'modifica: densità 8000 kg/m³ = 8 g/cm³, con l\'unità inserita');
    verifica(vicino(numero(await page.textContent('#peso-grande')), Math.PI / 4 * 100 * 100 * 100 / 1000 * 8 / 1000), 'modifica: il peso si aggiorna con la nuova densità');
    verifica((await memoria()).schede.length === 1, 'modifica: la scheda resta una sola');
    // duplicazione e nomi doppi
    await page.click('#btn-duplica');
    verifica((await page.inputValue('#e-nome')) === 'Copia di Lega di prova <b>x</b>' && (await page.textContent('#editor-titolo')) === 'Nuova scheda personale', 'duplica: nuova scheda con «Copia di …»');
    await page.fill('#e-nome', 'lega DI prova <b>x</b>'); await page.click('#btn-salva');
    verifica(/Esiste già un materiale con questo nome/.test(await page.textContent('#e-nome-i')) && await page.isVisible('#editor'), 'nome già usato da un\'altra scheda personale: rifiutato');
    await page.fill('#e-nome', dbV.materiali[0].nome); await page.click('#btn-salva');
    verifica(/Esiste già/.test(await page.textContent('#e-nome-i')), 'nome di una voce del database: rifiutato');
    await page.fill('#e-nome', 'Seconda lega'); await page.click('#btn-salva');
    verifica((await memoria()).schede.length === 2 && (await page.textContent('#footer')).endsWith('2 schede personali'), 'duplica: due schede personali');
    // esportazione
    const [scarico] = await Promise.all([page.waitForEvent('download'), page.click('#btn-esporta')]);
    verifica(/^schede-personali-\d{4}-\d{2}-\d{2}\.json$/.test(scarico.suggestedFilename()), `file esportato: ${scarico.suggestedFilename()}`);
    const esportato = JSON.parse(fs.readFileSync(await scarico.path(), 'utf8'));
    verifica(esportato.versione === 1 && esportato.schede.length === 2 && esportato.schede.some((x) => x.nome === 'Seconda lega'), 'il file esportato contiene le 2 schede');
    verifica(/Esportate 2 schede/.test(await page.textContent('#msg-schede')), 'messaggio di esportazione');
    // eliminazione con conferma
    await page.click('#btn-elimina');
    verifica(/Eliminare definitivamente «Seconda lega»\?/.test(await page.innerText('#scheda')), 'elimina: chiede conferma');
    await page.click('#btn-elimina-no');
    verifica(await page.isVisible('#btn-elimina') && (await memoria()).schede.length === 2, 'annulla: la scheda resta');
    await page.click('#btn-elimina');
    await scegliPerNome(page, 'Lega di prova <b>x</b>');
    verifica(await page.isVisible('#btn-elimina') && (await page.locator('#btn-elimina-ok').count()) === 0, 'la richiesta di conferma non passa a un\'altra scheda');
    await scegliPerNome(page, 'Seconda lega');
    await page.click('#btn-elimina'); await page.click('#btn-elimina-ok');
    verifica(await page.isHidden('#scheda') && (await page.inputValue('#q')) === '' && (await memoria()).schede.length === 1 && (await page.textContent('#footer')).endsWith('1 scheda personale'), 'elimina definitivamente: scheda tolta dall\'archivio e dal piè di pagina');
    verifica((await page.textContent('#barra-peso')) === '' || await page.isHidden('#barra'), 'dopo l\'eliminazione la barra del peso scompare');
    // importazione: valide, doppie e non valide
    const buona = (nome, id) => ({ id, nome, densita_g_cm3: 5, densita_immessa: { testo: '5', unita: 'g/cm³' }, composizione: [{ elemento: 'Cu', tipo: 'resto' }], designazioni: ['IMP-1'], nome_commerciale: '', fonte: '', note: '', creata: '2026-01-01', modificata: '2026-01-01' });
    const archivio = { versione: 1, schede: [buona('Importata uno', 'p-imp1'), buona('LEGA DI PROVA <b>X</b>', 'p-imp2'), { ...buona('Rotta', 'p-imp3'), densita_g_cm3: 99 }, buona(dbV.materiali[1].nome, 'p-imp4')] };
    await page.setInputFiles('#file-importa', { name: 'schede.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(archivio)) });
    await page.waitForFunction(() => /Importate/.test(document.getElementById('msg-schede').textContent));
    const mi = await page.textContent('#msg-schede');
    verifica(/Importate 1 scheda; 3 non importate/.test(mi) && /nome già presente/.test(mi) && /nome uguale a una scheda del database/.test(mi) && /densità non valida/.test(mi), `importazione: ${mi}`);
    verifica((await righe('imp-1')).length === 1 && (await memoria()).schede.length === 2, 'importazione: la scheda valida entra e si trova per designazione');
    await page.setInputFiles('#file-importa', { name: 'rotto.json', mimeType: 'application/json', buffer: Buffer.from('non è json') });
    await page.waitForFunction(() => /non è un archivio/.test(document.getElementById('msg-schede').textContent));
    await page.setInputFiles('#file-importa', { name: 'v9.json', mimeType: 'application/json', buffer: Buffer.from('{"versione":9,"schede":[]}') });
    await page.waitForFunction(() => /non supportata/.test(document.getElementById('msg-schede').textContent));
    verifica((await memoria()).schede.length === 2, 'file non valido o di versione ignota: le schede restano 2');
    // pulsanti e campi del modulo: bersagli e testo grandi come il resto dell'app; contrasti
    await page.click('#btn-nuova');
    const piccoliBtn = await page.evaluate(() => [...document.querySelectorAll('.btn, #editor input[type="text"], #editor select, #editor textarea')].filter((e) => e.offsetParent !== null).map((e) => ({ t: e.id || e.textContent.trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height), px: parseFloat(getComputedStyle(e).fontSize) })).filter((x) => x.h < 44 || x.px < 16));
    verifica(piccoliBtn.length === 0, `pulsanti e campi del modulo: altezza ≥ 44 px e testo ≥ 16 px (sotto soglia: ${JSON.stringify(piccoliBtn)})`);
    verifica(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'il modulo non crea scroll orizzontale');
    await ct('.btn:not(.primario)', 'pulsante');
    await ct('.btn.primario', 'pulsante principale (su sfumatura)');
    await ct('#nota-schede', 'avvertenza accanto a «Esporta schede»');
    await ct('#editor label', 'etichetta del modulo');
    await ct('#editor .piccolo', 'testo di aiuto del modulo');
    const bordoBtn = await misura(page, '.btn:not(.primario)'); const sfondoBtn = (await misura(page, '#editor')).sfondi[0];
    verifica(contrasto(pixel(bordoBtn.bordo), sfondoBtn) >= 3, `bordo dei pulsanti: ${contrasto(pixel(bordoBtn.bordo), sfondoBtn).toFixed(2)}:1`);
    await page.click('#btn-salva');
    await ct('#editor .interp.errore', 'errore nel modulo');
    await page.click('#btn-annulla');
    verifica(await page.isHidden('#editor'), 'annulla chiude il modulo senza salvare');
    await page.fill('#q', 'Importata'); await page.waitForSelector('#elenco:not([hidden])'); await page.click('#elenco .voce');
    await ct('.badge-personale', 'dicitura «scheda personale»');
    const bPers = await misura(page, '.badge-personale'); verifica(contrasto(pixel(bPers.bordo), (await misura(page, '#scheda')).sfondi[0]) >= 3, 'bordo della dicitura «scheda personale» ≥ 3:1');
    // memoria illeggibile: viene messa da parte, l'app funziona
    await page.evaluate((k) => localStorage.setItem(k, '{rotto'), CHIAVE);
    await page.reload();
    verifica(/non erano leggibili e sono state messe da parte/.test(await page.textContent('#msg-schede')) && (await page.evaluate((k) => localStorage.getItem(k + '.illeggibile'), CHIAVE)) === '{rotto', 'archivio illeggibile: messaggio e copia messa da parte');
    verifica((await righe('bonificato')).length === nBonificato, 'archivio illeggibile: il database verificato funziona');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  }

  verifica(errori.length === 0, `nessun errore in console (${errori.join(' | ')})`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const solo = process.env.CASI ? process.env.CASI.split(',') : null; // per i controlli rapidi: CASI=iphone-chiaro,iphone-scuro
  for (const c of CASI) if (!solo || solo.includes(c.nome)) await caso(browser, c);
  await browser.close();
  console.log(`\n${totali - falliti}/${totali} verifiche riuscite${OUT ? ' — screenshot in ' + OUT : ''}.`);
  process.exit(falliti ? 1 : 0);
})();
