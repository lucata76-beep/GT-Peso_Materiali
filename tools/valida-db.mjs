#!/usr/bin/env node
// Validatore del database dei materiali (blocco JSON dentro index.html).
// Uso:  node tools/valida-db.mjs [percorso/index.html]
// Esce con codice 1 se trova errori. Non legge i documenti dei produttori: controlla struttura,
// coerenza interna e le regole sulle fonti (densità, composizione, designazioni, nome commerciale).

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CAMPI_FONTE = ['densita', 'composizione', 'designazioni', 'nome_commerciale', 'tag', 'alias'];
const CHIAVI_DESIGNAZIONI = ['EN', 'WNr', 'UNI', 'AISI_SAE', 'DIN'];
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_ID = /^[a-z0-9][a-z0-9.\-]*$/;
const RE_HASH = /^[0-9a-f]{16}$/;
// Ruoli ammessi per i dati (densità, composizione, designazioni, nome commerciale, tag)
const RE_RUOLO = /^(produttore|fornitore|riferimento scientifico)/;
// Ruoli ammessi SOLO per gli alias (mai per i dati numerici): distributori, fornitori di lavorazioni, tesi e articoli tecnici
const RE_RUOLO_ALIAS = /^(distributore|fornitore di lavorazioni|tesi o articolo tecnico)/;
// Aggregatori e copie: mai fonte, nemmeno per gli alias
const AGGREGATORI = ['wikipedia.org', 'scribd.com', 'matweb.com', 'makeitfrom.com', 'totalmateria.com', 'xometry.com', 'xometry.pro', 'xometry.eu',
  'xometry.asia', 'mfgrobots.com', 'compraco.com.br', 'alloyfyi.com', 'steelestores.com', 'appluslaboratories.com', 'globalfastener.com',
  'slideshare.net', 'academia.edu', 'studocu.com', 'pdfcoffee.com', 'vdocuments.mx'];
const hostDi = (url) => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } };
const eAggregatore = (url) => { const h = hostDi(url); return AGGREGATORI.some((a) => h === a || h.endsWith('.' + a)); };

/** Estrae e interpreta il blocco DB:INIZIO … DB:FINE da un testo HTML. */
export function estraiDb(html) {
  const m = html.match(/<!-- DB:INIZIO[\s\S]*?-->\s*<script type="application\/json" id="db-materiali">([\s\S]*?)<\/script>\s*<!-- DB:FINE -->/);
  if (!m) throw new Error('Blocco DB non trovato: servono i commenti DB:INIZIO / DB:FINE e lo script id="db-materiali".');
  const testo = m[1];
  if (/<\/script/i.test(testo) || /<!--/.test(testo)) {
    throw new Error('Il JSON contiene "</script" o "<!--": romperebbe la pagina.');
  }
  return JSON.parse(testo);
}

const eNum = (x) => typeof x === 'number' && Number.isFinite(x);
const eStr = (x) => typeof x === 'string';
const r3 = (x) => Math.round(x * 1000) / 1000;

/** Valida un oggetto DB. Restituisce { errori: string[], avvisi: string[] }. */
export function validaDb(db) {
  const errori = [];
  const avvisi = [];
  const err = (id, msg) => errori.push(`[${id}] ${msg}`);

  if (!db || typeof db !== 'object') return { errori: ['DB non è un oggetto'], avvisi };
  const meta = db.meta ?? {};
  if (meta.schema !== 1) err('meta', 'schema deve essere 1');
  if (!eStr(meta.versione) || !meta.versione) err('meta', 'versione mancante');
  if (!RE_DATA.test(meta.data ?? '')) err('meta', 'data non in formato AAAA-MM-GG');
  if (!Array.isArray(meta.famiglie) || meta.famiglie.length === 0) err('meta', 'famiglie mancanti');
  if (!Array.isArray(meta.tag) || meta.tag.length === 0 || meta.tag.some((t) => !eStr(t) || !t.trim()) || new Set(meta.tag).size !== meta.tag.length) {
    err('meta', 'tag: vocabolario mancante, con voci vuote o duplicate');
  }
  const vocabolario = new Set(Array.isArray(meta.tag) ? meta.tag : []);
  if (!Array.isArray(db.materiali)) {
    err('db', 'materiali non è un array');
    return { errori, avvisi };
  }

  const ids = new Set();
  const hashPerUrl = new Map();
  for (const v of db.materiali) {
    const id = v?.id ?? '(senza id)';
    if (!eStr(v?.id) || !RE_ID.test(v.id)) err(id, 'id mancante o non valido (minuscole, cifre, . e -)');
    if (ids.has(v.id)) err(id, 'id duplicato');
    ids.add(v.id);
    if (!eStr(v.nome) || !v.nome) err(id, 'nome mancante');
    if (!meta.famiglie?.includes(v.famiglia)) err(id, `famiglia «${v.famiglia}» non prevista`);

    // designazioni
    const d = v.designazioni;
    let haDesignazioni = false;
    if (!d || typeof d !== 'object') {
      err(id, 'designazioni mancanti');
    } else {
      for (const k of CHIAVI_DESIGNAZIONI) {
        if (!eStr(d[k])) err(id, `designazioni.${k} deve essere una stringa (anche vuota)`);
        else if (d[k] !== '') haDesignazioni = true;
      }
      if (!Array.isArray(d.altre) || d.altre.some((x) => !eStr(x) || !x)) err(id, 'designazioni.altre deve essere un array di stringhe non vuote');
      else if (d.altre.length) haDesignazioni = true;
    }
    if (!eStr(v.nome_commerciale)) err(id, 'nome_commerciale deve essere una stringa (anche vuota)');

    // fonti
    const fonti = Array.isArray(v.fonti) ? v.fonti : [];
    if (fonti.length === 0) err(id, 'nessuna fonte: la voce non può entrare senza documento letto');
    const idFonti = new Set();
    const letture = [];
    const coperti = new Set();
    for (const f of fonti) {
      const fid = f?.id ?? '(fonte senza id)';
      if (!eStr(f?.id) || !f.id) err(id, 'fonte senza id');
      if (idFonti.has(f.id)) err(id, `fonte ${fid} duplicata`);
      idFonti.add(f.id);
      for (const k of ['emittente', 'documento', 'riferimento']) if (!eStr(f[k]) || !f[k]) err(id, `fonte ${fid}: ${k} mancante`);
      const ruoloDati = eStr(f.ruolo) && RE_RUOLO.test(f.ruolo);
      const ruoloAlias = eStr(f.ruolo) && RE_RUOLO_ALIAS.test(f.ruolo);
      if (!ruoloDati && !ruoloAlias) err(id, `fonte ${fid}: ruolo non ammesso (per i dati: produttore, fornitore, riferimento scientifico; per i soli alias anche distributore, fornitore di lavorazioni, tesi o articolo tecnico)`);
      if (ruoloAlias && !(Array.isArray(f.campi) && f.campi.length === 1 && f.campi[0] === 'alias')) {
        err(id, `fonte ${fid}: con ruolo «${f.ruolo}» la fonte può servire solo per gli alias, mai per densità, composizione o altri dati`);
      }
      if (eAggregatore(f.url)) err(id, `fonte ${fid}: gli aggregatori e le copie (${hostDi(f.url)}) non sono mai fonte`);
      if (!eStr(f.url) || !/^https:\/\/\S+$/.test(f.url)) err(id, `fonte ${fid}: url https mancante`);
      if (!RE_HASH.test(f.sha256 ?? '')) err(id, `fonte ${fid}: sha256 (16 caratteri esadecimali) mancante`);
      if (!Array.isArray(f.campi) || f.campi.length === 0 || f.campi.some((c) => !CAMPI_FONTE.includes(c))) err(id, `fonte ${fid}: campi non validi`);
      else f.campi.forEach((c) => coperti.add(c));
      if (f.url && f.sha256) {
        const prima = hashPerUrl.get(f.url);
        if (prima && prima !== f.sha256) err(id, `fonte ${fid}: stesso url con hash diverso in un'altra voce`);
        hashPerUrl.set(f.url, f.sha256);
      }
      if (f.densita_letta !== undefined) {
        if (!Array.isArray(f.densita_letta) || f.densita_letta.length === 0) err(id, `fonte ${fid}: densita_letta deve essere un array non vuoto`);
        else for (const x of f.densita_letta) {
          if (!eStr(x.valore) || !eStr(x.unita) || !eNum(x.g_cm3) || x.g_cm3 <= 0) err(id, `fonte ${fid}: densita_letta non valida`);
          else letture.push(x.g_cm3);
        }
        if (!f.campi?.includes('densita')) err(id, `fonte ${fid}: ha densita_letta ma non dichiara il campo «densita»`);
      } else if (f.campi?.includes('densita')) {
        err(id, `fonte ${fid}: dichiara «densita» ma senza densita_letta`);
      }
    }
    if (!coperti.has('densita')) err(id, 'nessuna fonte per la densità');
    if (haDesignazioni && !coperti.has('designazioni')) err(id, 'ci sono designazioni ma nessuna fonte le copre');
    if (v.nome_commerciale && !coperti.has('nome_commerciale')) err(id, 'nome_commerciale senza fonte che lo verifichi (deve restare vuoto)');
    if (!v.nome_commerciale && coperti.has('nome_commerciale')) avvisi.push(`[${id}] una fonte dichiara nome_commerciale ma il campo è vuoto`);

    // tag di trattamento/uso: ogni tag ha prove (documento + pagina + frase) da fonti ammesse per i dati
    const fontePerId = new Map(fonti.map((f) => [f.id, f]));
    if (!Array.isArray(v.tag)) err(id, 'tag deve essere un array (anche vuoto)');
    const tagVoce = new Set();
    const fontiCitateDaTag = new Set();
    for (const t of Array.isArray(v.tag) ? v.tag : []) {
      if (!eStr(t?.tag) || !vocabolario.has(t.tag)) { err(id, `tag «${t?.tag}» fuori dal vocabolario`); continue; }
      if (tagVoce.has(t.tag)) err(id, `tag «${t.tag}» duplicato`);
      tagVoce.add(t.tag);
      if (!Array.isArray(t.prove) || t.prove.length === 0) { err(id, `tag «${t.tag}» senza prove (documento, pagina, frase)`); continue; }
      for (const p of t.prove) {
        const f = fontePerId.get(p?.fonte);
        if (!f) { err(id, `tag «${t.tag}»: la fonte ${p?.fonte} non è tra le fonti della voce`); continue; }
        fontiCitateDaTag.add(f.id);
        if (!f.campi?.includes('tag')) err(id, `tag «${t.tag}»: la fonte ${f.id} non dichiara il campo «tag»`);
        if (!(eStr(f.ruolo) && RE_RUOLO.test(f.ruolo))) err(id, `tag «${t.tag}»: la fonte ${f.id} ha ruolo «${f.ruolo}», non ammesso per i tag`);
        if (!(p.pagina === null || (Number.isInteger(p.pagina) && p.pagina >= 1))) err(id, `tag «${t.tag}»: pagina non valida nella prova di ${f.id}`);
        if (!eStr(p.estratto) || p.estratto.trim().length < 5) err(id, `tag «${t.tag}»: frase (estratto) mancante nella prova di ${f.id}`);
        if (t.tag === 'da tempra' && !/HRC/.test(p.estratto ?? '')) err(id, `tag «da tempra»: ogni prova deve riportare la durezza HRC dopo tempra (${f.id})`);
      }
    }
    for (const f of fonti) if (f.campi?.includes('tag') && !fontiCitateDaTag.has(f.id)) err(id, `fonte ${f.id} dichiara «tag» ma nessun tag la cita`);

    // alias gergali o storici: da produttore, oppure da almeno 2 documenti di emittenti indipendenti («alias non da produttore»)
    if (!Array.isArray(v.alias)) err(id, 'alias deve essere un array (anche vuoto)');
    const fontiCitateDaAlias = new Set();
    const nomiAlias = new Set();
    for (const a of Array.isArray(v.alias) ? v.alias : []) {
      if (!eStr(a?.alias) || !a.alias.trim()) { err(id, 'alias vuoto'); continue; }
      const chiave = a.alias.trim().toLowerCase();
      if (nomiAlias.has(chiave)) err(id, `alias «${a.alias}» duplicato`);
      nomiAlias.add(chiave);
      if (!['produttore', 'non da produttore'].includes(a.origine)) err(id, `alias «${a.alias}»: origine deve essere «produttore» o «non da produttore»`);
      if (a.nota !== undefined && (!eStr(a.nota) || a.nota.trim().length < 10)) err(id, `alias «${a.alias}»: la nota, se presente, deve essere un testo di almeno 10 caratteri`);
      const fa = (Array.isArray(a.fonti) ? a.fonti : []).map((x) => fontePerId.get(x));
      if (fa.length === 0 || fa.some((f) => !f)) { err(id, `alias «${a.alias}»: fonti mancanti o non presenti tra le fonti della voce`); continue; }
      for (const f of fa) {
        fontiCitateDaAlias.add(f.id);
        if (!f.campi?.includes('alias')) err(id, `alias «${a.alias}»: la fonte ${f.id} non dichiara il campo «alias»`);
      }
      const daProduttore = fa.filter((f) => /^produttore/.test(f.ruolo ?? ''));
      if (a.origine === 'produttore' && daProduttore.length === 0) err(id, `alias «${a.alias}»: origine «produttore» ma nessuna fonte di produttore`);
      if (a.origine === 'non da produttore') {
        if (daProduttore.length > 0) err(id, `alias «${a.alias}»: c'è un documento di produttore, l'origine deve essere «produttore»`);
        const emittenti = new Set(fa.map((f) => (f.emittente ?? '').trim().toLowerCase()));
        if (fa.length < 2 || emittenti.size < 2) err(id, `alias «${a.alias}»: senza produttore servono almeno 2 documenti di emittenti indipendenti`);
      }
      if (!Array.isArray(a.prove) || a.prove.length === 0) { err(id, `alias «${a.alias}» senza prove (documento, pagina, frase)`); continue; }
      const citate = new Set();
      for (const p of a.prove) {
        if (!a.fonti.includes(p?.fonte)) err(id, `alias «${a.alias}»: prova con fonte ${p?.fonte} non elencata tra le fonti dell'alias`);
        else citate.add(p.fonte);
        if (!(p.pagina === null || (Number.isInteger(p.pagina) && p.pagina >= 1))) err(id, `alias «${a.alias}»: pagina non valida`);
        if (!eStr(p.estratto) || p.estratto.trim().length < 5) err(id, `alias «${a.alias}»: frase (estratto) mancante`);
      }
      for (const fid of a.fonti) if (!citate.has(fid)) err(id, `alias «${a.alias}»: la fonte ${fid} non ha prove`);
    }
    for (const f of fonti) if (f.campi?.includes('alias') && !fontiCitateDaAlias.has(f.id)) err(id, `fonte ${f.id} dichiara «alias» ma nessun alias la cita`);

    // densità
    if (!eNum(v.densita_g_cm3) || v.densita_g_cm3 <= 0 || v.densita_g_cm3 > 25) err(id, 'densita_g_cm3 deve essere un numero > 0 (e ≤ 25)');
    if (letture.length && eNum(v.densita_g_cm3)) {
      const lo = Math.min(...letture), hi = Math.max(...letture);
      const iv = v.densita_intervallo_g_cm3;
      if (lo === hi) {
        if (iv !== null) err(id, 'letture concordi: densita_intervallo_g_cm3 deve essere null');
        if (v.nota_intervallo) err(id, 'letture concordi: nota_intervallo deve essere vuota');
        if (v.densita_g_cm3 !== lo) err(id, `densità ${v.densita_g_cm3} diversa dalla lettura concorde ${lo}`);
      } else {
        if (!Array.isArray(iv) || iv.length !== 2 || !iv.every(eNum)) err(id, 'letture discordi: serve densita_intervallo_g_cm3 = [min, max]');
        else {
          if (iv[0] !== lo || iv[1] !== hi) err(id, `intervallo [${iv}] diverso dalle letture [${lo}, ${hi}]`);
          if (!(iv[0] < iv[1])) err(id, 'intervallo: min deve essere < max');
          if (v.densita_g_cm3 < iv[0] || v.densita_g_cm3 > iv[1]) err(id, 'densità nominale fuori dall\'intervallo');
        }
        if (!eStr(v.nota_intervallo) || !v.nota_intervallo) err(id, 'letture discordi: nota_intervallo obbligatoria');
        if (Math.abs(v.densita_g_cm3 - r3((lo + hi) / 2)) > 1e-9) err(id, `densità nominale ${v.densita_g_cm3} diversa dal punto medio ${r3((lo + hi) / 2)}`);
      }
    }

    // composizione
    const c = v.composizione;
    if (!c || typeof c !== 'object') {
      err(id, 'composizione mancante');
    } else if (c.tipo === 'elemento') {
      if (!eStr(c.simbolo) || !/^[A-Z][a-z]?$/.test(c.simbolo)) err(id, 'composizione.simbolo non valido');
    } else if (c.tipo === 'lega') {
      if (!eStr(c.riferimento) || !c.riferimento) err(id, 'composizione.riferimento mancante');
      if (c.parziale !== undefined && typeof c.parziale !== 'boolean') err(id, 'composizione.parziale deve essere vero/falso');
      if (!coperti.has('composizione')) err(id, 'composizione da lega senza fonte che la copra');
      const el = c.elementi;
      if (!el || typeof el !== 'object' || Object.keys(el).length === 0) err(id, 'composizione.elementi mancanti');
      else {
        let resto = 0;
        for (const [k, x] of Object.entries(el)) {
          if (x === 'resto') { resto++; continue; }
          if (!x || typeof x !== 'object') { err(id, `elemento ${k}: valore non valido`); continue; }
          const { min, max } = x;
          if (min === undefined && max === undefined) err(id, `elemento ${k}: serve min o max`);
          for (const [nome, val] of [['min', min], ['max', max]]) {
            if (val !== undefined && (!eNum(val) || val < 0 || val > 100)) err(id, `elemento ${k}: ${nome} fuori da 0-100`);
          }
          if (eNum(min) && eNum(max) && min > max) err(id, `elemento ${k}: min > max`);
        }
        const haBase = Object.values(el).some((x) => x && typeof x === 'object' && eNum(x.min) && x.min >= 50);
        if (resto > 1) err(id, `più di un elemento «resto» (${resto})`);
        if (resto === 0 && !haBase) err(id, 'manca l\'elemento base: serve un elemento «resto» oppure un elemento con min ≥ 50');
      }
    } else {
      err(id, 'composizione.tipo deve essere «lega» o «elemento»');
    }
    if (!RE_DATA.test(v.data_verifica ?? '')) err(id, 'data_verifica non in formato AAAA-MM-GG');
    else if (RE_DATA.test(meta.data ?? '') && v.data_verifica > meta.data) err(id, 'data_verifica successiva alla data del DB');
  }
  return { errori, avvisi };
}

// ---- esecuzione da riga di comando
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? fileURLToPath(new URL('../index.html', import.meta.url));
  let db;
  try {
    db = estraiDb(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('ERRORE:', e.message);
    process.exit(1);
  }
  const { errori, avvisi } = validaDb(db);
  avvisi.forEach((a) => console.warn('avviso:', a));
  if (errori.length) {
    errori.forEach((e) => console.error('ERRORE', e));
    console.error(`\n${errori.length} errori in ${db.materiali.length} voci.`);
    process.exit(1);
  }
  const perFamiglia = {};
  for (const v of db.materiali) perFamiglia[v.famiglia] = (perFamiglia[v.famiglia] ?? 0) + 1;
  const nFonti = db.materiali.reduce((s, v) => s + v.fonti.length, 0);
  const nTag = db.materiali.reduce((s, v) => s + v.tag.length, 0);
  const nAlias = db.materiali.reduce((s, v) => s + v.alias.length, 0);
  console.log(`DB OK: versione ${db.meta.versione} del ${db.meta.data}, ${db.materiali.length} voci, ${nFonti} riferimenti a fonti, ${nTag} tag, ${nAlias} alias.`);
  for (const f of db.meta.famiglie) if (perFamiglia[f]) console.log(`  ${f}: ${perFamiglia[f]}`);
}
