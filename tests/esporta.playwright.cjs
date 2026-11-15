// Collaudo dell'esportazione della scheda (Markdown) con Playwright: schermo contro file, pulsanti, download e condivisione simulata.
// iPhone emulato (390×844, tocco) e desktop (1440×900), tema chiaro e scuro. Non usa Safari: è Chromium con viewport e tocco emulati; il foglio
// di condivisione di iOS e «Salva su File» non esistono qui, e `navigator.share` è una finta che registra come viene chiamata.
// Uso:  node tests/esporta.playwright.cjs
// Richiede Playwright installato globalmente (non è una dipendenza del progetto).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ATTESI = path.resolve(__dirname, 'esporta-attesi');
const SORGENTE = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

let falliti = 0;
let totali = 0;
function verifica(cond, msg) {
  totali++;
  if (!cond) { falliti++; console.log('   FALLITO:', msg); }
}

const FORME = {
  tonda: { D: '25,4', L: '1000' }, quadro: { a: '20', L: '500' }, esagono: { S: '24', L: '300' }, piatto: { a: '100', b: '10', L: '250' },
  tubo: { De: '48,3', s: '3,2', L: '1000' }, tuboq: { a: '40', b: '20', s: '2', L: '1000' }, sfera: { D: '50' }, volume: { V: '125,5' }
};
const ARCHIVIO = {
  versione: 1, schede: [
    { id: 'p-a1', nome: 'Lega personale <b>A</b>', densita_g_cm3: 7.6, densita_immessa: { testo: '7600', unita: 'kg/m³' },
      composizione: [{ elemento: 'C', tipo: 'intervallo', min: 0.35, max: 0.43 }, { elemento: 'Cr', tipo: 'max', max: 1 }, { elemento: 'Mo', tipo: 'min', min: 0.2 }, { elemento: 'Mn', tipo: 'nominale', nominale: 0.7 }, { elemento: 'Fe', tipo: 'resto' }],
      designazioni: ['ZETA-7', 'Sigla Y'], nome_commerciale: 'Commerciale "Z" & C.', fonte: 'Catalogo interno\nriga due', note: 'Note con * e _ e | e #', creata: '2026-01-02', modificata: '2026-03-04' },
    { id: 'p-b2', nome: 'Solo densità', densita_g_cm3: 2.7, densita_immessa: { testo: '2,7', unita: 'g/cm³' }, composizione: [], designazioni: [], nome_commerciale: '', fonte: '', note: '', creata: '2026-02-02', modificata: '2026-02-02' }
  ]
};
const attesoFile = (nome, versione) => fs.readFileSync(path.join(ATTESI, nome + '.md'), 'utf8').replace('app v0.3.0', 'app v' + versione);
// il Markdown come testo semplice: senza grassetto, citazioni, indirizzi tra parentesi angolari e barre rovesciate
const disescapa = (s) => s.replace(/\\([!-/:-@[-`{-~])/g, '$1');
const piano = (md) => disescapa(md.replace(/\*\*/g, '').replace(/^> /gm, '').replace(/<(https?:\/\/[^\s<>]+)>/g, '$1'));
const numero = (t) => Number(String(t).replace(/[  ]/g, '').replace(',', '.'));
const luminanza = ([r, g, b]) => { const [x, y, z] = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * x + 0.7152 * y + 0.0722 * z; };
const contrasto = (a, b) => { const x = luminanza(a), y = luminanza(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Prepara una pagina: orologio fisso (21:35 a Roma), archivio di schede personali, finta di condivisione, spia sugli indirizzi dei download.
// opz.api: 'si' | 'no'; opz.canShare: vero/falso; opz.esito: 'ok' | 'annulla' | 'rifiuta' | 'lancia'
async function pagina(browser, { mobile, schema = 'light', api = 'no', canShare = true, esito = 'ok' }) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, colorScheme: schema, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile,
    acceptDownloads: true, timezoneId: 'Europe/Rome', locale: 'it-IT'
  });
  await ctx.addInitScript((a) => { try { if (!localStorage.getItem('gtpm.schede-personali.v1')) localStorage.setItem('gtpm.schede-personali.v1', JSON.stringify(a)); } catch (e) { /* senza memoria */ } }, ARCHIVIO);
  await ctx.addInitScript((o) => {
    window.__condivisioni = [];
    window.__verifiche = [];
    window.__url = { creati: [], revocati: [] };
    window.__inClick = false;
    // «dentro il clic»: vero dalla fase di cattura sul documento fino alla fase di risalita sulla finestra (dopo il gestore del pulsante)
    document.addEventListener('click', function () { window.__inClick = true; }, true);
    window.addEventListener('click', function () { window.__inClick = false; });
    const crea = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function (b) { const u = crea(b); window.__url.creati.push(u); return u; };
    const revoca = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = function (u) { window.__url.revocati.push(u); return revoca(u); };
    if (o.api === 'si') {
      navigator.canShare = function (d) {
        window.__verifiche.push({ chiavi: Object.keys(d || {}), nomi: ((d && d.files) || []).map(function (f) { return f.name; }), tipi: ((d && d.files) || []).map(function (f) { return f.type; }) });
        return o.canShare && Boolean(d && d.files && d.files.length);
      };
      navigator.share = function (d) {
        window.__condivisioni.push({ chiavi: Object.keys(d), file: d.files && d.files[0], dentroClic: window.__inClick, attivazione: navigator.userActivation ? navigator.userActivation.isActive : null });
        if (o.esito === 'annulla') return Promise.reject(new DOMException('Share canceled', 'AbortError'));
        if (o.esito === 'rifiuta') return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
        if (o.esito === 'lancia') throw new TypeError('dati non validi');
        if (o.esito === 'lento') return new Promise(function (ok) { setTimeout(ok, 900); });
        return Promise.resolve();
      };
    }
  }, { api, canShare, esito });
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', (e) => errori.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()); });
  await page.clock.setFixedTime(new Date('2026-11-14T20:35:00Z'));   // 21:35 a Roma (CET)
  await page.goto(URL);
  return { ctx, page, errori };
}

async function scegli(page, nome) {
  await page.fill('#q', '');
  await page.fill('#q', nome);
  await page.waitForSelector('#elenco:not([hidden])');
  const i = await page.$$eval('#elenco .voce', (els, n) => els.findIndex((e) => e.querySelector('b').textContent === n), nome);
  if (i < 0) throw new Error('voce non trovata: ' + nome);
  await page.click('#o-' + i);
}
async function imposta(page, forma, campi, unitaL = 'mm', unitaP = 'kg', pezzi = '1') {
  await page.click(`input[name="forma"][value="${forma}"]`, { force: true });
  await page.selectOption('#unita-lung', unitaL);
  await page.selectOption('#unita-peso', unitaP);
  await page.fill('#pezzi', pezzi);
  for (const [k, v] of Object.entries(campi)) await page.fill('#c-' + k, v);
}
async function scarica(page, sel = '#btn-scarica-md') {
  const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
  return { nome: d.suggestedFilename(), testo: fs.readFileSync(await d.path(), 'utf8') };
}
async function nessunDownload(page, ms = 700) {
  try { await page.waitForEvent('download', { timeout: ms }); return false; } catch (e) { return true; }
}

// Le frasi che la schermata mostra e che il file deve riportare tali e quali
function leggiSchermo(page) {
  return page.evaluate(() => {
    const n = (s) => s.replace(/[ \t\r\n]+/g, ' ').trim();   // solo gli spazi normali: lo spazio stretto dei numeri resta
    const out = { titolo: '', famiglia: '', frasi: [], righe: [], fonti: [], liberi: [], intervalloVolume: [], pesi: [], comp: [], fontiGenerali: [], peso: n(document.getElementById('peso-grande').textContent) };
    const scheda = document.getElementById('scheda');
    const p0 = scheda.querySelector('p');
    out.titolo = n(p0.querySelector('strong').textContent);
    out.famiglia = n(p0.querySelector('span').textContent);
    scheda.querySelectorAll(':scope > p.piccolo').forEach((p) => {
      const t = n(p.textContent);
      if (/^(Fonte indicata da te|Note): /.test(t)) out.liberi.push(t);
      else out.frasi.push(t);
    });
    scheda.querySelectorAll('#det-comp > p').forEach((p) => { out.frasi.push(n(p.textContent)); out.comp.push(n(p.textContent)); });
    document.querySelectorAll('#det-fonti ul.fonti li').forEach((li) => out.fontiGenerali.push(n(li.textContent)));
    scheda.querySelectorAll('#det-comp table.comp tr').forEach((tr) => out.righe.push('| ' + [...tr.children].map((td) => n(td.textContent)).join(' | ') + ' |'));
    const det = document.getElementById('dettagli');
    det.querySelectorAll('dl').forEach((dl) => {
      let dt = '';
      [...dl.children].forEach((e) => {
        if (e.tagName === 'DT') dt = n(e.textContent);
        else if (dt) { out.frasi.push(dt + ': ' + n(e.textContent)); out.pesi.push(dt + ': ' + n(e.textContent)); }
        else out.intervalloVolume.push(n(e.textContent));
      });
    });
    det.querySelectorAll(':scope > p').forEach((p) => out.frasi.push(n(p.textContent)));
    out.passi = [];
    det.querySelectorAll('ol.passaggi li').forEach((li) => { out.frasi.push(n(li.textContent)); out.passi.push(n(li.textContent)); });
    det.querySelectorAll('ul.fonti li').forEach((li) => {
      const c = li.cloneNode(true);
      c.querySelectorAll('a, .piccolo').forEach((e) => e.remove());
      out.fonti.push(n(c.textContent));
    });
    return out;
  });
}
const sezione = (md, titolo) => md.split(`## ${titolo}\n\n`)[1].split('\n\n## ')[0];
// Il verso opposto: ciò che il file dice di composizione, pesi, volume e pezzi deve stare anche sullo schermo, riga per riga (e viceversa).
function confrontaFileSchermo(s, md, mat, etichetta) {
  const compMd = sezione(md, 'Composizione chimica').split('\n\n').filter((b) => !/^\|/.test(b)).map(piano);
  verifica(JSON.stringify(compMd) === JSON.stringify(s.comp), `${etichetta}: riferimento, avvisi e nota della composizione uguali a schermo e nel file (${JSON.stringify(compMd).slice(0, 80)} / ${JSON.stringify(s.comp).slice(0, 80)})`);
  const calcolo = piano(sezione(md, 'Calcolo').split('\n\n### Formula e passaggi')[0]).split('\n').map((r) => r.replace(/^- /, ''));
  const attesoPesi = [s.pesi[0], s.pesi[2], `${s.pesi[3]} (${s.intervalloVolume[0]})`];
  verifica(JSON.stringify(calcolo) === JSON.stringify(attesoPesi), `${etichetta}: pesi e volume (anche in mm³) uguali a schermo e nel file (${JSON.stringify(calcolo)} / ${JSON.stringify(attesoPesi)})`);
  verifica(piano(sezione(md, 'Pezzo')).split('\n').pop() === '- ' + s.pesi[1], `${etichetta}: i pezzi uguali a schermo e nel file`);
  const passiMd = piano(sezione(md, 'Calcolo').split('### Formula e passaggi\n\n')[1]).split('\n\n')[0].split('\n').map((r) => r.replace(/^\d+\. /, ''));
  verifica(JSON.stringify(passiMd) === JSON.stringify(s.passi), `${etichetta}: formula e passaggi uguali a schermo e nel file`);
  if (mat && mat.fonti) {
    verifica(s.fontiGenerali.length === mat.fonti.length && mat.fonti.every((x, i) => s.fontiGenerali[i].includes(`Riferimenti: ${x.riferimento}.`)), `${etichetta}: «Fonti dei dati» a schermo con un riferimento per ogni documento (${s.fontiGenerali.length}/${mat.fonti.length})`);
  }
}
function confrontaSchermoFile(s, md, etichetta) {
  const p = piano(md);
  verifica(md.startsWith('# Scheda materiale: ') && p.split('\n')[0] === '# Scheda materiale: ' + s.titolo, `${etichetta}: titolo «${s.titolo}»`);
  verifica(p.includes('\n' + '*' + s.famiglia + '*\n') || p.includes('\n' + s.famiglia + '\n') || md.includes('\n*' + s.famiglia + '*\n'), `${etichetta}: famiglia «${s.famiglia}»`);
  const mancanti = [];
  for (const x of s.frasi.concat(s.fonti, s.intervalloVolume)) if (!p.includes(x)) mancanti.push(x);
  for (const r of s.righe) if (!md.includes(r)) mancanti.push(r);
  verifica(mancanti.length === 0, `${etichetta}: nel file mancano frasi della schermata: ${JSON.stringify(mancanti.slice(0, 3))}`);
  // fonte e note scritte dall'utente (più righe): ogni riga nel file
  for (const t of s.liberi) {
    const corpo = t.replace(/^(Fonte indicata da te|Note): /, '');
    verifica(corpo.split(' ').every((w) => p.includes(w)), `${etichetta}: «${t.slice(0, 30)}…» nel file`);
  }
  // il numero grande è lo stesso numero del file (5 cifre contro 6)
  const m = /- Peso totale: \*\*([^*]+) [A-Za-z]+\*\*/.exec(md);
  verifica(m && Math.abs(numero(m[1]) - numero(s.peso)) <= 6e-5 * Math.abs(numero(m[1])), `${etichetta}: peso a schermo ${s.peso}, nel file ${m && m[1]}`);
  verifica(!/NaN|undefined|\[object|\bnull\b/.test(md), `${etichetta}: niente NaN, undefined, null`);
}

async function casoMobile(browser, schema) {
  console.log(`\n== iPhone emulato, ${schema}, condivisione disponibile`);
  const { ctx, page, errori } = await pagina(browser, { mobile: true, schema, api: 'si' });
  const ver = (await page.textContent('#versione')).replace(/^v/, '');
  const dbF = await page.evaluate(() => JSON.parse(document.getElementById('db-materiali').textContent));

  // --- all'inizio: pulsanti visibili e disattivi, collegati al testo che dice cosa manca
  const ini = await page.evaluate(() => {
    const s = document.getElementById('btn-scarica-md'); const c = document.getElementById('btn-condividi-md');
    const r = (e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), px: parseFloat(getComputedStyle(e).fontSize), vis: e.offsetParent !== null }; };
    return { s: s.disabled, c: c.disabled, sr: r(s), cr: r(c), sd: s.getAttribute('aria-describedby'), cd: c.getAttribute('aria-describedby'), st: s.textContent, ct: c.textContent, tipo: s.type };
  });
  verifica(ini.s && ini.c && ini.sr.vis && ini.cr.vis, 'all\'inizio i due pulsanti sono visibili e disattivi');
  verifica(ini.st === 'Scarica scheda (.md)' && ini.ct === 'Condividi…', `testi dei pulsanti («${ini.st}», «${ini.ct}»)`);
  verifica(ini.sd === 'peso-stato' && ini.cd === 'peso-stato' && ini.tipo === 'button', 'i pulsanti rimandano al testo «cosa manca» e non inviano nulla');
  verifica(ini.sr.h >= 44 && ini.cr.h >= 44 && ini.sr.px >= 16 && ini.cr.px >= 16, `bersagli ≥ 44 px e testo ≥ 16 px (${JSON.stringify([ini.sr, ini.cr])})`);
  const riga = await page.evaluate(() => {
    const s = document.getElementById('btn-scarica-md').getBoundingClientRect(); const c = document.getElementById('btn-condividi-md').getBoundingClientRect();
    return { stessaRiga: Math.abs(s.top - c.top) < 2, destra: Math.max(s.right, c.right), scroll: document.documentElement.scrollWidth > window.innerWidth, w: window.innerWidth };
  });
  verifica(riga.stessaRiga && riga.destra <= riga.w && !riga.scroll, 'i due pulsanti stanno sulla stessa riga, senza scroll orizzontale');
  // contrasto del pulsante disattivo (testo secondario su sfondo della scheda): almeno 7:1, come il resto del testo
  const dis = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('btn-scarica-md')); const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number); return { fg: rgb(cs.color), bg: rgb(cs.backgroundColor), stile: cs.borderTopStyle, bordo: rgb(cs.borderTopColor) }; });
  verifica(contrasto(dis.fg, dis.bg) >= 7, `pulsante disattivo: testo ${contrasto(dis.fg, dis.bg).toFixed(1)}:1 (minimo 7:1)`);
  verifica(dis.stile === 'dashed' && contrasto(dis.bordo, dis.bg) >= 3, `pulsante disattivo: bordo tratteggiato ${contrasto(dis.bordo, dis.bg).toFixed(1)}:1 (minimo 3:1)`);
  // un clic su un pulsante disattivo non fa nulla
  await page.evaluate(() => { document.getElementById('btn-scarica-md').click(); document.getElementById('btn-condividi-md').click(); });
  verifica(await nessunDownload(page, 400) && (await page.evaluate(() => window.__condivisioni.length)) === 0, 'pulsanti disattivi: nessun download e nessuna condivisione');

  // --- si attivano solo con un risultato valido
  await scegli(page, 'C45E');
  verifica(await page.isDisabled('#btn-scarica-md') && await page.isDisabled('#btn-condividi-md'), 'materiale scelto ma niente dimensioni: disattivi');
  await page.fill('#c-D', '100');
  verifica(await page.isDisabled('#btn-scarica-md'), 'manca L: disattivo');
  await page.fill('#c-L', 'abc');
  verifica(await page.isDisabled('#btn-scarica-md'), 'L non valida: disattivo');
  await page.fill('#c-L', '100');
  verifica(await page.isEnabled('#btn-scarica-md') && await page.isEnabled('#btn-condividi-md'), 'risultato valido: attivi');
  await page.fill('#pezzi', '0');
  verifica(await page.isDisabled('#btn-scarica-md'), 'pezzi non validi: disattivo');
  await page.fill('#pezzi', '1');

  // --- download: nome con data e ora, contenuto uguale al testo di riferimento, indirizzo ancora valido dopo il clic
  const d1 = await scarica(page);
  verifica(d1.nome === 'scheda_c45e_2026-11-14_2135.md', `nome del file «${d1.nome}»`);
  verifica(d1.testo === attesoFile('c45e-fonte-unica', ver), 'il file scaricato è identico al testo di riferimento (C45E, D100 × L100, 1 pezzo)');
  verifica(/Scarico avviato: scheda_c45e_2026-11-14_2135\.md\./.test(await page.textContent('#msg-esporta')) && await page.isVisible('#msg-esporta'), 'messaggio dopo il download');
  verifica((await page.evaluate(() => window.__condivisioni.length)) === 0, 'il pulsante «Scarica» non chiama la condivisione');
  await page.waitForTimeout(2600);
  const url = await page.evaluate(async () => {
    const u = window.__url;
    const ultimo = u.creati[u.creati.length - 1];
    let leggibile = false; let testo = '';
    try { const r = await fetch(ultimo); testo = await r.text(); leggibile = r.ok; } catch (e) { leggibile = false; }
    return { creati: u.creati.length, revocati: u.revocati.length, blob: /^blob:/.test(ultimo), leggibile, testo };
  });
  verifica(url.creati === 1 && url.blob && url.revocati === 0 && url.leggibile && url.testo === d1.testo, `l'indirizzo del file resta valido oltre 2,5 s (creati ${url.creati}, revocati ${url.revocati}, leggibile ${url.leggibile})`);
  await page.fill('#c-L', '101');
  verifica(await page.isHidden('#msg-esporta'), 'il messaggio sparisce quando i dati cambiano');
  await page.fill('#c-L', '100');

  // --- condivisione: una chiamata, nel clic, con {files:[File .md]}, stesso contenuto del download
  const sc = await page.evaluate(() => window.__verifiche);
  verifica(sc.length >= 1 && sc.every((x) => x.chiavi.join() === 'files' && x.nomi[0] === 'scheda.md' && x.tipi[0] === 'text/markdown'), `canShare è chiamato con un file .md di tipo text/markdown (${JSON.stringify(sc[0])})`);
  await page.click('#btn-condividi-md');
  await page.waitForFunction(() => /Condivisione conclusa/.test(document.getElementById('msg-esporta').textContent));
  const cond = await page.evaluate(async () => {
    const c = window.__condivisioni;
    return { n: c.length, chiavi: c[0].chiavi.join(), nome: c[0].file.name, tipo: c[0].file.type, dim: c[0].file.size, dentro: c[0].dentroClic, att: c[0].attivazione, testo: await c[0].file.text() };
  });
  verifica(cond.n === 1 && cond.chiavi === 'files', `share chiamato una volta con soli «files» (${cond.n}, ${cond.chiavi})`);
  verifica(cond.nome === 'scheda_c45e_2026-11-14_2135.md' && cond.tipo === 'text/markdown' && cond.dim > 500, `file condiviso: ${cond.nome}, ${cond.tipo}, ${cond.dim} byte`);
  verifica(cond.dentro === true, 'share() è chiamato in modo sincrono dentro il clic (nessuna attesa prima)');
  verifica(cond.att !== false, `attivazione dell'utente ancora attiva alla chiamata (${cond.att})`);
  verifica(cond.testo === d1.testo, 'il file condiviso ha lo stesso contenuto del file scaricato');
  verifica(await nessunDownload(page, 500), 'condivisione riuscita: nessun download in più');
  await page.click('#btn-condividi-md');
  await page.waitForFunction(() => window.__condivisioni.length === 2);
  verifica(true, 'si può condividere di nuovo (il pulsante non resta bloccato)');

  // --- schermo contro file: tutte le 27 voci, con forme, unità e pezzi che cambiano; poi le due schede personali
  const nomi = dbF.materiali.map((m) => m.nome).concat(['Lega personale <b>A</b>', 'Solo densità']);
  const giri = [['mm', 'kg', '1'], ['cm', 'g', '12'], ['in', 'lb', '3']];
  const formeIds = Object.keys(FORME);
  for (let i = 0; i < nomi.length; i++) {
    const forma = formeIds[i % formeIds.length];
    const [uL, uP, pz] = giri[i % giri.length];
    await scegli(page, nomi[i]);
    await imposta(page, forma, FORME[forma], uL, uP, pz);
    const s = await leggiSchermo(page);
    const f = await scarica(page);
    confrontaSchermoFile(s, f.testo, `${nomi[i]} / ${forma} / ${uL} ${uP} ×${pz}`);
    confrontaFileSchermo(s, f.testo, dbF.materiali.find((x) => x.nome === nomi[i]), `${nomi[i]} / ${forma}`);
    verifica(/^scheda_[a-z0-9-]+_2026-11-14_2135\.md$/.test(f.nome), `${nomi[i]}: nome file ${f.nome}`);
    verifica(f.testo.includes('app v' + ver + ' · Database v' + dbF.meta.versione + ' del ' + dbF.meta.data), `${nomi[i]}: versioni nel piede`);
    verifica(f.testo.includes(await page.textContent('.dicitura')), `${nomi[i]}: dicitura del file = dicitura a schermo`);
    const pers = i >= dbF.materiali.length;
    verifica(f.testo.includes('SCHEDA PERSONALE: dati inseriti dall\'utente, non verificati su documenti') === pers, `${nomi[i]}: dicitura delle schede personali solo se personale`);
  }
  // le due schede personali con i dati di riferimento: file identici ai testi attesi
  await scegli(page, 'Lega personale <b>A</b>');
  await imposta(page, 'tonda', FORME.tonda, 'mm', 'kg', '1');
  verifica((await scarica(page)).testo === attesoFile('personale-completa', ver), 'scheda personale completa: file identico al testo di riferimento');
  await scegli(page, 'Solo densità');
  await imposta(page, 'quadro', FORME.quadro, 'mm', 'kg', '1000000');
  verifica((await scarica(page)).testo === attesoFile('personale-solo-densita', ver), 'scheda personale con la sola densità: file identico al testo di riferimento');
  // voci con casi particolari, confrontate con i testi di riferimento
  const dettaglio = [['C45 (1.0503)', 'c45-tipico', 'tonda', FORME.tonda, 'mm', 'kg', '1'], ['Stagno (Sn)', 'sn-elemento-puro', 'volume', { V: '125,5' }, 'cm', 'g', '10'],
    ['Titanio grado 2 (CP)', 'ti-gr2-parziale-tubo-quadro', 'tuboq', FORME.tuboq, 'mm', 'kg', '1'], ['Acciaio per utensili 1.2379 (D2)', '1.2379-intervallo-alias-copia', 'piatto', FORME.piatto, 'mm', 'kg', '3'],
    ['Alluminio 7075', '7075-alias-ergal', 'tonda', { D: '2,5', L: '30' }, 'cm', 'lb', '2'], ['Inconel 718', 'inconel718-tipico-intervallo', 'sfera', FORME.sfera, 'mm', 'kg', '1']];
  for (const [nome, file, forma, campi, uL, uP, pz] of dettaglio) {
    await scegli(page, nome);
    await imposta(page, forma, campi, uL, uP, pz);
    verifica((await scarica(page)).testo === attesoFile(file, ver), `${nome}: file identico al testo di riferimento`);
  }

  // --- «Azzera» e risultato che sparisce: i pulsanti tornano disattivi
  await page.click('#btn-azzera');
  verifica(await page.isDisabled('#btn-scarica-md') && await page.isDisabled('#btn-condividi-md') && await page.isHidden('#msg-esporta'), 'dopo «Azzera» i pulsanti sono disattivi e il messaggio è spento');

  // --- il motivo dell'assenza di file è il testo mostrato sotto il peso
  const stati = [
    [null, {}, '1'], ['C45E', {}, '1'], ['C45E', { D: '10' }, '1'], ['C45E', { D: '10', L: '5' }, ''], ['C45E', { D: '10', L: '5' }, '0'], ['C45E', { D: 'abc', L: '5' }, '1'],
    ['C45E', { D: '0,' + '0'.repeat(200) + '1', L: '1' }, '1']   // volume nullo: l'errore del Motore entra nel motivo
  ];
  for (const [nome, campi, pz] of stati) {
    await page.click('#btn-azzera');
    if (nome) await scegli(page, nome);
    await imposta(page, 'tonda', campi, 'mm', 'kg', pz);
    const aSchermo = await page.textContent('#peso-stato');   // senza trim: identico, spazi compresi
    const dalFile = await page.evaluate(([n, c, p]) => {
      const db = JSON.parse(document.getElementById('db-materiali').textContent);
      const m = n ? db.materiali.find((x) => x.nome === n) : null;
      const v = Motore.valuta({ forma: 'tonda', testi: c, unitaLunghezza: 'mm', pezzi: p, densita: m ? m.densita_g_cm3 : null, densitaIntervallo: null, unitaPeso: 'kg' });
      return Esporta.markdown({ materiale: m, valutazione: v, appVersione: '0', db: db.meta, istante: { data: '2026-11-14', ora: '21:35' } });
    }, [nome, campi, pz]);
    verifica(dalFile.ok === false && dalFile.motivo === aSchermo && aSchermo !== '', `senza risultato (${nome || 'nessun materiale'}, ${JSON.stringify(campi)}, pezzi «${pz}»): «${aSchermo}»`);
    verifica(await page.isDisabled('#btn-scarica-md'), `senza risultato: pulsante disattivo («${aSchermo}»)`);
  }
  verifica(errori.length === 0, 'nessun errore di pagina o di console: ' + JSON.stringify(errori));
  await ctx.close();
}

async function casoCondivisione(browser, nome, opz, atteso) {
  console.log(`\n== ${nome}`);
  const { ctx, page, errori } = await pagina(browser, opz);
  await scegli(page, 'C45E');
  await imposta(page, 'tonda', { D: '100', L: '100' });
  const visibile = await page.isVisible('#btn-condividi-md');
  verifica(visibile === atteso.visibile, `«Condividi…» ${atteso.visibile ? 'visibile' : 'nascosto'} (${visibile})`);
  verifica(await page.isVisible('#btn-scarica-md') && await page.isEnabled('#btn-scarica-md'), '«Scarica» sempre disponibile con un risultato');
  if (atteso.visibile) {
    if (atteso.esito === 'lento') {
      // doppio tocco mentre la condivisione è aperta: la seconda chiamata a share() non parte (WebKit la rifiuterebbe con InvalidStateError)
      await page.click('#btn-condividi-md');
      await page.click('#btn-condividi-md');
      verifica((await page.evaluate(() => window.__condivisioni.length)) === 1, 'doppio tocco: una sola chiamata a share()');
      await page.waitForFunction(() => /Condivisione conclusa/.test(document.getElementById('msg-esporta').textContent));
      verifica(await nessunDownload(page, 500), 'doppio tocco: nessun download di ripiego');
      await page.click('#btn-condividi-md');
      verifica((await page.evaluate(() => window.__condivisioni.length)) === 2, 'finita la prima condivisione se ne può fare un\'altra');
    } else if (atteso.esito === 'annulla') {
      await page.click('#btn-condividi-md');
      verifica(await nessunDownload(page, 900), 'condivisione annullata: nessun download');
      verifica(await page.isHidden('#msg-esporta'), 'condivisione annullata: nessun messaggio');
      verifica(await page.isEnabled('#btn-condividi-md') && await page.isEnabled('#btn-scarica-md'), 'condivisione annullata: i pulsanti restano attivi');
      verifica((await page.evaluate(() => window.__condivisioni.length)) === 1, 'condivisione annullata: una sola chiamata');
      await page.click('#btn-condividi-md');
      await page.waitForFunction(() => window.__condivisioni.length === 2);
      verifica(await nessunDownload(page, 600) && await page.isHidden('#msg-esporta'), 'dopo un annullamento si può riprovare, ancora senza download né messaggio');
    } else {
      const [d] = await Promise.all([page.waitForEvent('download'), page.click('#btn-condividi-md')]);
      const testo = fs.readFileSync(await d.path(), 'utf8');
      verifica(d.suggestedFilename() === 'scheda_c45e_2026-11-14_2135.md', `ripiego sul download: ${d.suggestedFilename()}`);
      verifica(testo.startsWith('# Scheda materiale: C45E') && testo.includes('Peso teorico da densità nominale'), 'il file del ripiego è la scheda completa');
      const m = await page.textContent('#msg-esporta');
      verifica(m.includes('Condivisione non riuscita (' + atteso.nomeErrore + ')') && m.includes('provo a scaricare il file'), `messaggio con il nome dell'errore: «${m}»`);
      verifica((await page.evaluate(() => window.__condivisioni.length)) === 1, 'una sola chiamata a share, poi il download');
      const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#btn-condividi-md')]);
      verifica((await page.evaluate(() => window.__condivisioni.length)) === 2 && d2.suggestedFilename() === d.suggestedFilename(), 'dopo un errore di condivisione si può riprovare (il pulsante non resta bloccato)');
    }
  }
  verifica(errori.length === 0, 'nessun errore di pagina o di console (nessuna promessa rifiutata senza gestore): ' + JSON.stringify(errori));
  await ctx.close();
}

async function casoDesktop(browser, schema) {
  console.log(`\n== desktop, ${schema}, con le API di condivisione presenti`);
  const { ctx, page, errori } = await pagina(browser, { mobile: false, schema, api: 'si', canShare: true });
  verifica(await page.isHidden('#btn-condividi-md'), 'su desktop (puntatore preciso) «Condividi…» non compare, anche se canShare è vero');
  verifica(await page.evaluate(() => window.__verifiche.length) === 0, 'su desktop canShare non viene nemmeno interrogato');
  verifica(await page.isVisible('#btn-scarica-md') && await page.isDisabled('#btn-scarica-md'), 'su desktop «Scarica» è visibile e disattivo senza risultato');
  const dis = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('btn-scarica-md')); const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number); return { fg: rgb(cs.color), bg: rgb(cs.backgroundColor) }; });
  verifica(contrasto(dis.fg, dis.bg) >= 7, `pulsante disattivo (${schema}): ${contrasto(dis.fg, dis.bg).toFixed(1)}:1`);
  await scegli(page, 'Inox 304 (1.4301)');
  await imposta(page, 'tubo', FORME.tubo);
  const f = await scarica(page);
  verifica(f.nome === 'scheda_inox-304-1-4301_2026-11-14_2135.md' && f.testo.includes('- Forma: Tubo tondo'), `download su desktop: ${f.nome}`);
  verifica(errori.length === 0, 'nessun errore: ' + JSON.stringify(errori));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  verifica(!SORGENTE.includes("'0.2."), 'la versione è stata alzata (nessuna 0.2.x nel codice)');
  await casoMobile(browser, 'light');
  await casoMobile(browser, 'dark');
  await casoCondivisione(browser, 'iPhone: nessuna API di condivisione', { mobile: true, api: 'no' }, { visibile: false });
  await casoCondivisione(browser, 'iPhone: API presenti ma canShare rifiuta il file', { mobile: true, api: 'si', canShare: false }, { visibile: false });
  await casoCondivisione(browser, 'iPhone: l\'utente annulla la condivisione (AbortError)', { mobile: true, api: 'si', esito: 'annulla' }, { visibile: true, esito: 'annulla' });
  await casoCondivisione(browser, 'iPhone: condivisione rifiutata (NotAllowedError) → download', { mobile: true, api: 'si', esito: 'rifiuta' }, { visibile: true, nomeErrore: 'NotAllowedError' });
  await casoCondivisione(browser, 'iPhone: doppio tocco mentre la condivisione è aperta', { mobile: true, api: 'si', esito: 'lento' }, { visibile: true, esito: 'lento' });
  await casoCondivisione(browser, 'iPhone: share() lancia subito un errore (TypeError) → download', { mobile: true, api: 'si', esito: 'lancia' }, { visibile: true, nomeErrore: 'TypeError' });
  await casoDesktop(browser, 'light');
  await casoDesktop(browser, 'dark');
  await browser.close();
  console.log(`\n${totali - falliti}/${totali} verifiche riuscite.`);
  process.exit(falliti ? 1 : 0);
})();
