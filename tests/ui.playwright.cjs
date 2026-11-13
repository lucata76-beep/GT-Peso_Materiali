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

// contrasto WCAG tra due colori "rgb(r, g, b)" / "rgba(...)"
function lum(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrasto = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

async function coloriEffettivi(page, selettore) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    let bg = null;
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (!/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(c)) { bg = c; break; }
    }
    return { fg: cs.color, bg: bg || 'rgb(255, 255, 255)', bordo: cs.borderTopColor };
  }, selettore);
}

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
  verifica((await page.textContent('#footer')).startsWith('DB v'), 'footer con versione del DB');
  const largh = await page.evaluate(() => { const m = document.querySelector('main').getBoundingClientRect(); return { w: m.width, l: m.left, scroll: document.documentElement.scrollWidth > window.innerWidth }; });
  verifica(!largh.scroll, 'nessuno scroll orizzontale');
  verifica(largh.w <= 480.5, `colonna unica larga al massimo 480 px (${largh.w})`);
  if (!c.mobile) verifica(Math.abs(largh.l - (c.viewport.width - largh.w) / 2) < 1.5, 'colonna centrata su desktop');
  verifica((await page.locator('.forma').count()) === 8, '8 forme');
  verifica((await page.locator('.interp').count()) >= 3, 'riga del valore interpretato sotto ogni campo');

  // --- famiglie vuote nascoste
  await page.focus('#q');
  await page.waitForSelector('#elenco:not([hidden])');
  const fam = await page.$$eval('#elenco .fam', (els) => els.map((e) => e.textContent));
  verifica(fam.length === 10, `10 famiglie con voci (trovate ${fam.length})`);
  for (const nascosta of ['Acciai speciali', 'Ghise', 'Ferro']) verifica(!fam.includes(nascosta), `famiglia vuota «${nascosta}» nascosta`);
  verifica((await page.locator('#elenco .voce').count()) === 21, '21 voci nell\'elenco completo');

  // --- bersagli touch con l'elenco aperto
  const piccoli = await page.evaluate(() => [...document.querySelectorAll('#elenco .voce')].filter((e) => e.getBoundingClientRect().height < 44).length);
  verifica(piccoli === 0, 'voci dell\'elenco alte almeno 44 px');
  if (OUT && c.nome.startsWith('iphone-chiaro')) await page.screenshot({ path: path.join(OUT, `${c.nome}-elenco.png`) });

  // --- ricerca per designazione
  let r = await cerca(page, 'C45'); verifica(r[0] === 'C45E', `C45 → C45E per primo (${r[0]})`);
  r = await cerca(page, '1.4301'); verifica(r.length === 1 && /304/.test(r[0]), `1.4301 → Inox 304 (${r})`);
  r = await cerca(page, '304'); verifica(/304/.test(r[0]), `304 → Inox 304 (${r[0]})`);
  r = await cerca(page, '7075'); verifica(r.length === 1 && /7075/.test(r[0]), `7075 (${r})`);
  r = await cerca(page, 'Ti-6Al-4V'); verifica(r.length === 1 && /Ti-6Al-4V/.test(r[0]), `Ti-6Al-4V (${r})`);
  r = await cerca(page, 'ti6al4v'); verifica(r.length === 1, `ti6al4v senza trattini (${r})`);
  r = await cerca(page, 'inox 316'); verifica(r.length === 1 && /316/.test(r[0]), `inox 316 (${r})`);
  r = await cerca(page, '316 inox'); verifica(r.length === 1 && /316/.test(r[0]), `316 inox, ordine inverso (${r})`);
  r = await cerca(page, 'boehler'); verifica(r.length === 2, `boehler → 1.2344 e 1.2379 (${r})`);
  r = await cerca(page, 'Durapur'); verifica(r.length === 1 && /100Cr6/.test(r[0]), `nome commerciale Durapur (${r})`);
  r = await cerca(page, 'H13'); verifica(r.length === 1 && /1\.2344/.test(r[0]), `H13 (${r})`);
  r = await cerca(page, 'CW614N'); verifica(r.length === 1 && /CuZn39Pb3/.test(r[0]), `CW614N (${r})`);
  r = await cerca(page, 'Sn'); verifica(r.some((x) => /Stagno/.test(x)), `Sn trova lo stagno (${r})`);
  r = await cerca(page, '1.0503');
  verifica(r.length === 0 && /Nessun materiale/.test(await page.textContent('#elenco')), '1.0503: nessun risultato con messaggio (voce esclusa)');

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
  verifica((await page.locator('button').count()) === 0, 'nessun pulsante Calcola (nessun <button>)');

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
  await page.click('#scheda summary');
  verifica((await page.textContent('#scheda')).includes('EN 10088-3:2014'), 'composizione: norma citata sulla scheda');

  // --- bersagli touch ≥ 44 px su tutti i controlli visibili
  await page.evaluate(() => window.scrollTo(0, 0));
  const piccoliCtrl = await page.evaluate(() => {
    const sel = 'input[type="text"], select, .forma, summary, ul.fonti a';
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

  // --- contrasti (testo ≥ 7:1, bordi dei controlli ≥ 3:1)
  for (const [sel, nome] of [['body', 'testo'], ['.piccolo', 'testo secondario'], ['h2', 'titoli (accento)'], ['.interp', 'valore interpretato'], ['.forma.attiva', 'forma attiva'], ['.stato', 'stato'], ['a', 'link'], ['.dicitura', 'dicitura']]) {
    const col = await coloriEffettivi(page, sel);
    if (!col) continue;
    const cr = contrasto(col.fg, col.bg);
    verifica(cr >= 7, `contrasto ${nome}: ${cr.toFixed(2)}:1`);
  }
  await scrivi(page, '#c-D', 'x');
  const err = await coloriEffettivi(page, '.interp.errore');
  verifica(err && contrasto(err.fg, err.bg) >= 7, `contrasto messaggio d'errore: ${err ? contrasto(err.fg, err.bg).toFixed(2) : '?'}:1`);
  const ctrl = await coloriEffettivi(page, '#unita-lung');
  verifica(contrasto(ctrl.bordo, ctrl.bg) >= 3, `contrasto bordo dei controlli: ${contrasto(ctrl.bordo, ctrl.bg).toFixed(2)}:1`);
  await scrivi(page, '#c-D', '100');

  // --- schermate di controllo
  if (OUT) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(OUT, `${c.nome}-completo.png`), fullPage: true });
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.screenshot({ path: path.join(OUT, `${c.nome}-barra.png`) });
  }

  verifica(errori.length === 0, `nessun errore in console (${errori.join(' | ')})`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const c of CASI) await caso(browser, c);
  await browser.close();
  console.log(`\n${totali - falliti}/${totali} verifiche riuscite${OUT ? ' — screenshot in ' + OUT : ''}.`);
  process.exit(falliti ? 1 : 0);
})();
