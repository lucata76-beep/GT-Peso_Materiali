// Test dell'esportazione della scheda in Markdown. Eseguono esattamente i blocchi ENGINE, RICERCA, SCHEDE ed ESPORTA di index.html (non una copia).
// I testi attesi dei casi di riferimento sono i file di tests/esporta-attesi/: ogni riga è stata letta contro il database e i numeri sono stati
// ricalcolati a parte con formule indipendenti (volume e peso a mano), non copiati dall'uscita del programma.
// Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { estraiDb } from '../tools/valida-db.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blocco = (nome) => { const m = html.match(new RegExp(`// ${nome}:INIZIO\\n([\\s\\S]*?)// ${nome}:FINE`)); assert.ok(m, `blocco ${nome} non trovato`); return m[1]; };
const { Motore, Ricerca, Schede, Esporta } = vm.runInNewContext(
  `${blocco('ENGINE')}\n${blocco('RICERCA')}\n${blocco('SCHEDE')}\n${blocco('ESPORTA')}\n;({ Motore, Ricerca, Schede, Esporta })`, {});
const DB = estraiDb(html);
const plain = (x) => JSON.parse(JSON.stringify(x));
const atteso = (nome) => readFileSync(new URL(`./esporta-attesi/${nome}.md`, import.meta.url), 'utf8');

const ISTANTE = { data: '2026-11-14', ora: '21:35' };
const APP = '0.3.0';

// ---------------------------------------------------------------- schede personali di prova (come le crea il modulo dell'app)
function personale(input, ctx) {
  const r = Schede.valida(input, { nomiEsistenti: [], ...ctx });
  assert.ok(r.ok, JSON.stringify(r.errori));
  return Schede.aMateriale({ ...r.scheda, id: ctx.id });
}
const PERS_A = personale({
  nome: 'Lega personale <b>A</b>', densita: { testo: '7600', unita: 'kg/m³' },
  composizione: [{ elemento: 'C', valore: '0,35-0,43' }, { elemento: 'Cr', valore: 'max 1' }, { elemento: 'Mo', valore: 'min 0,2' }, { elemento: 'Mn', valore: '0,7' }, { elemento: 'Fe', valore: 'resto' }],
  designazioni: 'ZETA-7; Sigla Y', nome_commerciale: 'Commerciale "Z" & C.', fonte: 'Catalogo interno\nriga due', note: 'Note con * e _ e | e #'
}, { oggi: '2026-03-04', id: 'p-a1', creata: '2026-01-02' });
const PERS_B = personale({ nome: 'Solo densità', densita: { testo: '2,7', unita: 'g/cm³' }, composizione: [], designazioni: '', nome_commerciale: '', fonte: '', note: '' },
  { oggi: '2026-02-02', id: 'p-b2', creata: '2026-02-02' });
const PERSONALI = { 'p-a1': PERS_A, 'p-b2': PERS_B };

const trova = (id) => PERSONALI[id] || DB.materiali.find((x) => x.id === id);
const calcola = (m, c) => Motore.valuta({ forma: c.forma, testi: c.testi, unitaLunghezza: c.uL || 'mm', pezzi: c.pezzi || '1', densita: m.densita_g_cm3, densitaIntervallo: m.densita_intervallo_g_cm3, unitaPeso: c.uP || 'kg' });
const esporta = (m, v, extra = {}) => Esporta.markdown({ materiale: m, valutazione: v, appVersione: APP, db: DB.meta, istante: ISTANTE, ...extra });
const FORME = {
  tonda: { D: '25,4', L: '1000' }, quadro: { a: '20', L: '500' }, esagono: { S: '24', L: '300' }, piatto: { a: '100', b: '10', L: '250' },
  tubo: { De: '48,3', s: '3,2', L: '1000' }, tuboq: { a: '40', b: '20', s: '2', L: '1000' }, sfera: { D: '50' }, volume: { V: '125,5' }
};
// «\» davanti a un segno di punteggiatura lo rende letterale (regola di CommonMark): il contrario di mdTesto
const disescapa = (s) => s.replace(/\\([!-/:-@[-`{-~])/g, '$1');
// il Markdown come testo semplice: senza grassetto, barre rovesciate, parentesi angolari degli indirizzi e segno di citazione
const piano = (md) => disescapa(md.replace(/\*\*/g, '').replace(/^> /gm, '').replace(/<(https?:\/\/[^\s<>]+)>/g, '$1'));

// ---------------------------------------------------------------- casi di riferimento (testo esatto)
const CASI = [
  { f: 'c45-tipico', id: 'c45', forma: 'tonda', testi: { D: '25,4', L: '1000' }, uL: 'mm', uP: 'kg', pezzi: '1', nome: 'scheda_c45-1-0503_2026-11-14_2135.md' },
  { f: 'c45e-fonte-unica', id: 'c45e', forma: 'tonda', testi: { D: '100', L: '100' }, uL: 'mm', uP: 'kg', pezzi: '1', nome: 'scheda_c45e_2026-11-14_2135.md' },
  { f: '1.2379-intervallo-alias-copia', id: '1.2379', forma: 'piatto', testi: { a: '100', b: '10', L: '250' }, uL: 'mm', uP: 'kg', pezzi: '3', nome: 'scheda_acciaio-per-utensili-1-2379-d2_2026-11-14_2135.md' },
  { f: '7075-alias-ergal', id: '7075', forma: 'tonda', testi: { D: '2,5', L: '30' }, uL: 'cm', uP: 'lb', pezzi: '2', nome: 'scheda_alluminio-7075_2026-11-14_2135.md' },
  { f: 'sn-elemento-puro', id: 'sn', forma: 'volume', testi: { V: '125,5' }, uL: 'cm', uP: 'g', pezzi: '10', nome: 'scheda_stagno-sn_2026-11-14_2135.md' },
  { f: 'ti-gr2-parziale-tubo-quadro', id: 'ti-gr2', forma: 'tuboq', testi: { a: '40', b: '20', s: '2', L: '1000' }, uL: 'mm', uP: 'kg', pezzi: '1', nome: 'scheda_titanio-grado-2-cp_2026-11-14_2135.md' },
  { f: 'inconel718-tipico-intervallo', id: 'inconel718', forma: 'sfera', testi: { D: '50' }, uL: 'mm', uP: 'kg', pezzi: '1', nome: 'scheda_inconel-718_2026-11-14_2135.md' },
  { f: 'personale-completa', id: 'p-a1', forma: 'tonda', testi: { D: '25,4', L: '1000' }, uL: 'mm', uP: 'kg', pezzi: '1', nome: 'scheda_lega-personale-b-a-b_2026-11-14_2135.md' },
  { f: 'personale-solo-densita', id: 'p-b2', forma: 'quadro', testi: { a: '20', L: '500' }, uL: 'mm', uP: 'kg', pezzi: '1000000', nome: 'scheda_solo-densita_2026-11-14_2135.md' }
];
for (const c of CASI) {
  test(`testo esatto: ${c.f}`, () => {
    const m = trova(c.id);
    const r = esporta(m, calcola(m, c));
    assert.equal(r.ok, true);
    assert.equal(r.testo, atteso(c.f));
    assert.equal(r.nomeFile, c.nome);
    assert.equal(r.tipo, 'text/markdown');
  });
}

test('i casi di riferimento coprono valore tipico, fonte unica, intervallo, alias, copia fornita, elemento puro, composizione parziale, avviso, schede personali', () => {
  const t = (f) => atteso(f);
  assert.match(t('c45-tipico'), /Valore tipico: così è dichiarato nei documenti letti\./);
  assert.match(t('c45-tipico'), /> Una sola fonte di densità\./);
  assert.match(t('1.2379-intervallo-alias-copia'), /Intervallo delle letture: 7,67–7,68 g\/cm³\./);
  assert.match(t('1.2379-intervallo-alias-copia'), /- Alias: KORV \(alias non da produttore, una sola fonte\)/);
  assert.match(t('7075-alias-ergal'), /- Alias: Ergal \(alias non da produttore\)\n- Nota su «Ergal»:/);
  assert.match(t('sn-elemento-puro'), /Elemento puro: \*\*Sn\*\*\./);
  assert.match(t('ti-gr2-parziale-tubo-quadro'), /> Composizione parziale: solo gli elementi riportati dal documento\./);
  assert.match(t('ti-gr2-parziale-tubo-quadro'), /> Calcolo con spigoli vivi: i raggi del tubo reale non sono considerati\./);
  assert.match(t('personale-completa'), /> \*\*SCHEDA PERSONALE: dati inseriti dall'utente, non verificati su documenti\*\*/);
});

// ---------------------------------------------------------------- niente «NaN», «undefined», «null», «[object»; numeri uguali a quelli del Motore
test('27 voci × 8 forme × unità e pezzi diversi: il file si genera, senza NaN, undefined, null, [object, Infinity', () => {
  const varianti = [{ uL: 'mm', uP: 'kg', pezzi: '1' }, { uL: 'in', uP: 'lb', pezzi: '12' }, { uL: 'cm', uP: 'g', pezzi: '1000000' }, { uL: 'm', uP: 't', pezzi: '3' }, { uL: 'mm', uP: 'oz', pezzi: '7' }];
  let n = 0;
  for (const m of DB.materiali.concat([PERS_A, PERS_B])) {
    for (const [forma, testi] of Object.entries(FORME)) {
      for (const va of varianti) {
        const v = calcola(m, { forma, testi: forma === 'volume' ? { V: '1' } : testi, ...va });
        if (!v.risultato) continue;   // es. un tubo che non sta nelle misure di prova in pollici: nessun file
        const r = esporta(m, v);
        assert.equal(r.ok, true, `${m.id} ${forma}`);
        assert.doesNotMatch(r.testo, /NaN|undefined|\[object|\bnull\b|Infinity/, `${m.id} ${forma} ${JSON.stringify(va)}`);
        assert.match(r.testo, /^# Scheda materiale: /);
        assert.ok(r.testo.endsWith('\n') && !r.testo.endsWith('\n\n'), 'finisce con un solo a capo');
        n++;
      }
    }
  }
  assert.ok(n >= 29 * 8 * 4, `file generati: ${n}`);
});

test('ogni numero della sezione «Calcolo» e di «Pezzo» è quello del Motore, nello stesso formato (nessun ricalcolo)', () => {
  const f = Motore.formatta;
  for (const m of DB.materiali.concat([PERS_A, PERS_B])) {
    for (const [forma, testi] of Object.entries(FORME)) {
      for (const va of [{ uL: 'mm', uP: 'kg', pezzi: '1' }, { uL: 'in', uP: 'lb', pezzi: '12' }]) {
        const v = calcola(m, { forma, testi, ...va });
        if (!v.risultato) continue;
        const r = v.risultato;
        const md = esporta(m, v).testo;
        const calcolo = md.split('## Calcolo\n\n')[1].split('\n\n### Formula e passaggi\n\n');
        assert.equal(calcolo[0], [
          `- Peso unitario: **${f(r.peso_unitario, 6)} ${r.unitaPeso}**`,
          `- Peso totale: **${f(r.peso_totale, 6)} ${r.unitaPeso}**`,
          `- Volume (un pezzo): **${f(r.volume_cm3, 6)} cm³** (= ${f(r.volume_mm3, 9, true)} mm³)`].join('\n'), `${m.id} ${forma}`);
        const passi = calcolo[1].split('\n\n## Avvertenza')[0].split('\n\n> ')[0].split('\n');
        assert.deepEqual(passi.map(disescapa), plain(r.passaggi).map((p, i) => `${i + 1}. ${p}`), `passaggi di ${m.id} ${forma}`);
        const pezzo = md.split('## Pezzo\n\n')[1].split('\n\n## Calcolo')[0].split('\n');
        const attesoPezzo = ['- Forma: ' + r.nomeForma]
          .concat(Motore.FORME[forma].campi.map((c) => `- ${c[1]}: ${f(v.campi[c[0]].valore, 7)} ${c[0] === 'V' ? va.uL + '³' : va.uL}`), ['- Pezzi: ' + r.pezzi]);
        assert.deepEqual(pezzo, attesoPezzo, `pezzo di ${m.id} ${forma}`);
      }
    }
  }
});

test('numeri di controllo calcolati a parte con le formule (non con il Motore)', () => {
  // C45E, tondo D100 × L100, ρ = 7,85 g/cm³: V = π/4 · 100² · 100 = 785 398,163 mm³ → 6165,376 g
  const md = atteso('c45e-fonte-unica');
  const V = Math.PI / 4 * 100 * 100 * 100;
  assert.ok(md.includes(`**${(V / 1000).toPrecision(6).replace('.', ',')} cm³**`) && md.includes('**785,398 cm³**'));
  assert.ok(md.includes(`**${(V / 1000 * 7.85 / 1000).toPrecision(6).replace('.', ',')} kg**`));   // 6,16538
  // tubo quadro 40×20, s = 2, L = 1000: (40·20 − 36·16) · 1000 = 224 000 mm³; ρ 4,515 → 1,01136 kg
  const ti = atteso('ti-gr2-parziale-tubo-quadro');
  assert.ok(ti.includes('**224 cm³** (= 224\u202f000 mm³)') && ti.includes(`**${(224 * 4.515 / 1000).toPrecision(6).replace(/0+$/, '').replace('.', ',')} kg**`));
  // intervallo 1.2379 con 3 pezzi da 250 cm³: 750 cm³ × 7,67 = 5752,5 g e × 7,68 = 5760 g
  const iv = atteso('1.2379-intervallo-alias-copia');
  assert.ok(iv.includes('tra 5,7525 e 5,76 kg'));
});

// ---------------------------------------------------------------- struttura del documento
test('ordine delle sezioni e identificazione: stessa struttura per tutte le 27 voci', () => {
  for (const m of DB.materiali) {
    const v = calcola(m, { forma: 'tonda', testi: FORME.tonda });
    const md = esporta(m, v).testo;
    const titoli = md.split('\n').filter((r) => /^## /.test(r));
    assert.deepEqual(titoli, ['## Identificazione', '## Composizione chimica', '## Densità', '## Pezzo', '## Calcolo', '## Avvertenza'], m.id);
    assert.ok(md.indexOf(`# Scheda materiale: ${m.nome}`) === 0, m.id);
    assert.ok(md.includes(`\n*${m.famiglia}*\n`), `famiglia di ${m.id}`);
    assert.ok(md.includes(`Data di verifica: ${m.data_verifica}.`), `data di verifica di ${m.id}`);
    assert.ok(md.includes('Peso teorico da densità nominale, senza tolleranze né raggi.'), m.id);
    assert.ok(md.endsWith(`*Generata il 2026-11-14 alle 21:35 · app v${APP} · Database v${DB.meta.versione} del ${DB.meta.data}*\n`), `piede di ${m.id}`);
    assert.doesNotMatch(md, /SCHEDA PERSONALE/, `${m.id}: una voce del database non è una scheda personale`);
  }
});

test('identificazione: ogni designazione con il suo ente, alias con la provenienza, nome commerciale solo se c\'è, nessun tag', () => {
  for (const m of DB.materiali) {
    const righe = Esporta.identificazione(m);
    const md = esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo;
    const d = m.designazioni;
    for (const [e, x] of [['EN', d.EN], ['W.Nr.', d.WNr], ['UNI', d.UNI], ['AISI/SAE', d.AISI_SAE], ['DIN', d.DIN]]) {
      if (x) assert.ok(righe.some((r) => r.startsWith('Designazioni: ') && r.includes(x)), `${m.id}: ${e} ${x}`);
    }
    assert.equal(righe.some((r) => r.startsWith('Nome commerciale: ')), Boolean(m.nome_commerciale), `nome commerciale di ${m.id}`);
    assert.equal(righe.some((r) => r.startsWith('Alias: ')), m.alias.length > 0, `alias di ${m.id}`);
    assert.equal(righe.some((r) => r.startsWith('Corrispondenze indicative')), Boolean(d.indicative && d.indicative.length), `indicative di ${m.id}`);
    for (const t of m.tag) assert.ok(!piano(md).includes(`tag «${t.tag}»`), `${m.id}: i tag non entrano`);
    assert.doesNotMatch(md, /Tag verificati|Tag: dove sono documentati/);
  }
  // le corrispondenze indicative di 39NiCrMo3 e il nome commerciale di 100Cr6
  const n = DB.materiali.find((x) => x.id === '39nicrmo3');
  assert.ok(Esporta.identificazione(n).some((r) => r.startsWith('Corrispondenze indicative (non sono identità): ')));
  assert.ok(Esporta.identificazione(n).some((r) => r === 'Alias: NCM2 (alias non da produttore, una sola fonte)'));
});

test('etichette degli alias: le stesse di Esporta e della ricerca (due copie private, una sola verità)', () => {
  const casi = [[{ origine: 'produttore' }, 'alias da produttore'], [{ origine: 'non da produttore', una_sola_fonte: true }, 'alias non da produttore, una sola fonte'], [{ origine: 'non da produttore' }, 'alias non da produttore']];
  for (const [a, testo] of casi) assert.equal(Esporta.etichettaAlias(a), testo);
  // la ricerca ha la sua copia privata: il motivo «trovato per» deve dire la stessa cosa
  for (const [a, testo] of casi) {
    const voce = JSON.parse(JSON.stringify(DB.materiali.find((x) => x.id === '1.2379')));
    voce.alias = [{ alias: 'XYZALIAS', ...a, fonti: [], prove: [] }];
    const ric = Ricerca.crea({ meta: { famiglie: DB.meta.famiglie }, materiali: [voce] });
    const trovati = ric.cerca('xyzalias');
    assert.equal(trovati.length, 1);
    assert.deepEqual(plain(trovati[0].motivi), [`alias «XYZALIAS» (${testo})`]);
  }
});

test('fonti della densità: solo quelle che la dichiarano, con valore letto, pagina, riferimento e link (o la dicitura della copia fornita)', () => {
  let conCopia = 0;
  for (const m of DB.materiali) {
    const fonti = Esporta.fontiDensita(m);
    assert.equal(fonti.length, m.fonti.filter((x) => x.densita_letta).length, m.id);
    const md = esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo;
    for (const x of fonti) {
      assert.ok(md.includes(`**${x.ente}**, ${x.ruolo}`.replace(/[\\`*_\[\]<>|#~$]/g, '\\$&')) || piano(md).includes(`${x.ente}, ${x.ruolo} — ${x.documento}.`), `${m.id}: ${x.ente}`);
      assert.ok(piano(md).includes(x.letture), `${m.id}: ${x.letture}`);
      assert.ok(piano(md).includes(`Riferimenti: ${x.riferimento}.`), `${m.id}: riferimento di ${x.ente}`);
      if (x.copiaFornita) { conCopia++; assert.equal(x.url, null); assert.ok(md.includes(Esporta.COPIA_FORNITA)); }
      else { assert.match(x.url, /^https?:\/\/[^\s<>]+$/, `${m.id}: indirizzo ${x.url}`); assert.ok(md.includes(`<${x.url}>`), `${m.id}: link ${x.url}`); }
    }
    assert.equal(md.split(Esporta.COPIA_FORNITA).length - 1, fonti.filter((x) => x.copiaFornita).length, m.id);
  }
  // Nel database le due copie fornite da Luca (1.2379 e 39NiCrMo3) sostengono solo l'alias, non la densità: nelle fonti della densità non compaiono.
  assert.equal(conCopia, 0);
  assert.equal(DB.materiali.flatMap((m) => m.fonti).filter((x) => x.fornito_da_utente).length, 2);
});

test('fonte della densità fornita dall\'utente: nessun link, solo la dicitura (caso costruito: nel database non ce n\'è ancora)', () => {
  const m = JSON.parse(JSON.stringify(DB.materiali[0]));
  m.fonti[0].fornito_da_utente = true;
  for (const url of [null, 'https://example.org/copia-privata.pdf']) {   // la dicitura vince anche se per errore c'è un indirizzo
    m.fonti[0].url = url;
    const md = esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo;
    assert.ok(md.includes(`Riferimenti: ${m.fonti[0].riferimento}. ${Esporta.COPIA_FORNITA}\n`), `url ${url}`);
    assert.doesNotMatch(md, /<https?:|<null>|null|example\.org/);
    assert.equal(plain(Esporta.fontiDensita(m))[0].copiaFornita, true);
    assert.equal(plain(Esporta.fontiDensita(m))[0].url, null);
  }
});

test('i testi fissi che l\'utente legge nel file sono quelli scritti qui (non si confrontano con se stessi)', () => {
  assert.equal(Esporta.COPIA_FORNITA, 'Copia fornita da Luca: nessun link pubblico.');
  assert.equal(Esporta.COMPOSIZIONE_PARZIALE, 'Composizione parziale: solo gli elementi riportati dal documento.');
  assert.equal(Esporta.DICITURA_TEORICO, 'Peso teorico da densità nominale, senza tolleranze né raggi.');
  assert.equal(Esporta.AVVISO_PERSONALE_DENSITA, 'Scheda personale: la densità e gli altri dati sono scritti da te e non sono verificati su documenti.');
  assert.equal(Esporta.TIPO_MARKDOWN, 'text/markdown');
});

test('indirizzi non validi, testo su più righe e famiglia con segni: mai Markdown (percorsi che i dati attuali non raggiungono, ma che il codice deve reggere)', () => {
  const m = JSON.parse(JSON.stringify(DB.materiali[0]));
  m.famiglia = '*Famiglia* _x_ <b>';
  m.nome_commerciale = 'prima\n# titolo\n- voce\n1. uno\n> cita\n---';
  m.fonti[0].url = 'https://a b/*c*';
  const md = esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo;
  const righe = md.split('\n');
  assert.equal(righe[2], '*\\*Famiglia\\* \\_x\\_ \\<b\\>*');
  assert.ok(md.includes('- Nome commerciale: prima\n\\# titolo\n\\- voce\n1\\. uno\n\\> cita\n\\---\n'), 'ogni riga del testo è protetta, non solo la prima');
  assert.ok(md.includes('Riferimenti: densita p. 3; composizione p. 1; designazioni p. 1,3; tag p. 1. https://a b/\\*c\\*\n'), 'un indirizzo non valido non diventa un collegamento e i suoi segni sono protetti');
  assert.doesNotMatch(md, /<https?:\/\/a b/);
  const j = JSON.parse(JSON.stringify(DB.materiali[0]));
  j.fonti[0].url = 'javascript:alert(1)';
  const mj = esporta(j, calcola(j, { forma: 'tonda', testi: FORME.tonda })).testo;
  assert.doesNotMatch(mj, /<javascript:/, 'solo http e https diventano collegamenti');
});

test('«valore tipico», «una sola fonte», fonti indipendenti e intervallo: compaiono solo dove ci sono', () => {
  for (const m of DB.materiali) {
    const md = piano(esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo);
    const nInd = Motore.fontiIndipendenti(m.fonti, 'densita');
    assert.equal(md.includes('Valore tipico: così è dichiarato nei documenti letti.'), Motore.densitaTipica(m.fonti), `tipico ${m.id}`);
    assert.equal(md.includes('Una sola fonte di densità.'), nInd === 1, `una sola fonte ${m.id}`);
    assert.ok(md.includes(`Fonti indipendenti per la densità: ${nInd} (`), `fonti indipendenti ${m.id}`);
    assert.equal(md.includes('Intervallo delle letture: '), Boolean(m.densita_intervallo_g_cm3), `intervallo ${m.id}`);
    assert.equal(md.includes('valore nominale: punto medio delle letture dei documenti.'), Boolean(m.densita_intervallo_g_cm3), `nominale ${m.id}`);
    assert.equal(md.includes('letture dei documenti concordi.'), !m.densita_intervallo_g_cm3, `concordi ${m.id}`);
    assert.equal(md.includes(Esporta.COMPOSIZIONE_PARZIALE), Boolean(m.composizione.parziale), `parziale ${m.id}`);
    assert.equal(md.includes('Elemento puro: '), m.composizione.tipo === 'elemento', `elemento puro ${m.id}`);
  }
  // le quattro voci con «valore tipico» e le tre con una sola fonte tra quelle con intervallo
  const tipiche = DB.materiali.filter((m) => Motore.densitaTipica(m.fonti)).map((m) => m.id).sort();
  assert.deepEqual(tipiche, ['c45', 'inconel718', 's235jr', 's355j2']);
});

test('composizione: per le leghe una riga per elemento (stessi elementi e valori del DB), con la nota; elemento puro con il simbolo', () => {
  for (const m of DB.materiali) {
    const md = esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo;
    const sez = md.split('## Composizione chimica\n\n')[1].split('\n\n## Densità')[0];
    const c = m.composizione;
    if (c.tipo === 'elemento') { assert.ok(sez.startsWith(`Elemento puro: **${c.simbolo}**. `), m.id); continue; }
    const righe = sez.split('\n').filter((r) => /^\| /.test(r)).slice(1);   // senza l'intestazione («|---|---:|» non comincia per «| »)
    assert.equal(righe.length, Object.keys(c.elementi).length, `righe di ${m.id}`);
    Object.keys(c.elementi).forEach((k, i) => {
      assert.equal(righe[i], `| ${Esporta.nomeElemento(k)} | ${Esporta.valoreElemento(c.elementi[k])} |`, `${m.id} ${k}`);
    });
    if (c.nota) assert.ok(piano(sez).endsWith(c.nota), `nota di ${m.id}`);
    assert.ok(piano(sez).startsWith(c.riferimento), `riferimento di ${m.id}`);
  }
  assert.equal(Esporta.valoreElemento('resto'), 'resto');
  assert.equal(Esporta.valoreElemento({ nominale: 18 }), '18 %');
  assert.equal(Esporta.valoreElemento({ min: 0.35, max: 0.43 }), '0,35–0,43 %');
  assert.equal(Esporta.valoreElemento({ max: 0.5 }), 'max 0,5 %');
  assert.equal(Esporta.valoreElemento({ min: 0.2 }), 'min 0,2 %');
  assert.equal(Esporta.valoreElemento({ max: 0.5, nota: 'nota' }), 'max 0,5 % (nota)');
  assert.equal(Esporta.nomeElemento('Altri_ciascuno'), 'Altri (ciascuno)');
  assert.equal(Esporta.nomeElemento('Altri_totale'), 'Altri (totale)');
  assert.equal(Esporta.nomeElemento('Fe'), 'Fe');
  assert.equal(Esporta.composizione(null), null);
});

test('letture di densità e pagina: unità equivalenti senza conversione, le altre con g/cm³, valore tipico, unità non indicata', () => {
  assert.equal(Esporta.lettura({ valore: '7.85', unita: 'kg/dm³', g_cm3: 7.85 }), '7,85 kg/dm³');
  assert.equal(Esporta.lettura({ valore: '2.80', unita: 'Mg/m³', g_cm3: 2.8 }), '2,80 Mg/m³');
  assert.equal(Esporta.lettura({ valore: '7.85', unita: 'g/cm³', g_cm3: 7.85 }), '7,85 g/cm³');
  assert.equal(Esporta.lettura({ valore: '7800', unita: 'kg/m³', g_cm3: 7.8, tipico: true }), '7800 kg/m³ = 7,8 g/cm³ (valore tipico)');
  assert.equal(Esporta.lettura({ valore: '0.296', unita: 'lb/in³', g_cm3: 8.193 }), '0,296 lb/in³ = 8,193 g/cm³');
  assert.equal(Esporta.lettura({ valore: '7.85', unita: 'non indicata nel documento', g_cm3: 7.85 }), '7,85 (unità non indicata nel documento)');
  assert.equal(Esporta.paginaDensita('densita p. 3; composizione p. 1'), ', pag. 3');
  assert.equal(Esporta.paginaDensita('densita (pagina web); designazioni (pagina web)'), ', pagina web');
  assert.equal(Esporta.paginaDensita('composizione p. 2'), '');
  assert.equal(Esporta.conEtichetta('EN', 'AW-7075'), 'EN AW-7075');
  assert.equal(Esporta.conEtichetta('EN', 'EN AW-7075'), 'EN AW-7075');
  assert.equal(Esporta.conEtichetta('UNI', 'uni 5000'), 'uni 5000');
  assert.equal(Esporta.unitaCampo('V', 'cm'), 'cm³');
  assert.equal(Esporta.unitaCampo('D', 'cm'), 'cm');
});

// ---------------------------------------------------------------- schede personali
test('scheda personale: dicitura obbligatoria subito sotto il titolo, nessun conteggio fonti, «valore tipico» né «una sola fonte»; data di creazione e modifica', () => {
  for (const m of [PERS_A, PERS_B]) {
    const md = esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo;
    const righe = md.split('\n');
    assert.equal(righe[0], `# Scheda materiale: ${m === PERS_A ? 'Lega personale \\<b\\>A\\</b\\>' : 'Solo densità'}`);
    assert.equal(righe[4], '> **SCHEDA PERSONALE: dati inseriti dall\'utente, non verificati su documenti**');
    assert.equal(md.split('SCHEDA PERSONALE').length - 1, 1, 'la dicitura compare una volta sola');
    assert.doesNotMatch(md, /Fonti indipendenti|Una sola fonte|Valore tipico|Data di verifica|Riferimenti:|<https?:/);
    assert.match(md, /Creata il \d{4}-\d{2}-\d{2}, modificata il \d{4}-\d{2}-\d{2}\./);
    assert.ok(md.includes('> Scheda personale: la densità e gli altri dati sono scritti da te e non sono verificati su documenti.'));
    assert.ok(md.includes('Densità usata: **' + Motore.formatta(m.densita_g_cm3) + ' g/cm³** — inserita da te.'));
  }
  assert.equal(Esporta.DICITURA_PERSONALE, 'SCHEDA PERSONALE: dati inseriti dall\'utente, non verificati su documenti');
  // il testo originale della densità compare solo se l'unità inserita non è g/cm³
  assert.ok(atteso('personale-completa').includes('Valore scritto da te: 7600 kg/m³.'));
  assert.ok(!atteso('personale-solo-densita').includes('Valore scritto da te'));
  // fonte e note scritte dall'utente, con etichetta, su più righe
  assert.ok(atteso('personale-completa').includes('Fonte indicata da te:\n\n> Catalogo interno  \n> riga due\n'));
  assert.ok(atteso('personale-completa').includes('Note:\n\n> Note con \\* e \\_ e \\| e \\#\n'));
});

test('scheda personale con composizione parziale di tutti i tipi di riga: ogni riga come nella scheda a schermo', () => {
  const md = atteso('personale-completa');
  for (const r of ['| C | 0,35–0,43 % |', '| Cr | max 1 % |', '| Mo | min 0,2 % |', '| Mn | 0,7 % |', '| Fe | resto |']) assert.ok(md.includes(r), r);
  assert.ok(md.includes('Inserita da te: non verificata su documenti'));
  assert.ok(atteso('personale-solo-densita').includes('Composizione non inserita.'));
});

// ---------------------------------------------------------------- Markdown sicuro: il testo non diventa mai Markdown
test('testo scritto dall\'utente: ogni segno del Markdown è reso letterale (nome, designazioni, nome commerciale, fonte, note)', () => {
  const insidia = personale({
    nome: '*Lega* _x_ `y` [a](b) <i>z</i> | # $ ~ &amp; \\', densita: { testo: '8', unita: 'g/cm³' }, composizione: [],
    designazioni: '# titolo; - voce; + piu; = uguale; 1. uno; 2) due; > cita', nome_commerciale: '**forte** e __doppio__ e ~~barrato~~',
    fonte: '---\n===\n    codice\n> cita\n```\n# titolo\n- voce\n1. uno', note: '| a | b |\n|---|---|'
  }, { oggi: '2026-03-04', id: 'p-i1', creata: '2026-03-04' });
  const v = calcola(insidia, { forma: 'tonda', testi: FORME.tonda });
  const md = esporta(insidia, v).testo;
  const righe = md.split('\n');
  assert.equal(righe[0], '# Scheda materiale: \\*Lega\\* \\_x\\_ \\`y\\` \\[a\\](b) \\<i\\>z\\</i\\> \\| \\# \\$ \\~ \\&amp; \\\\');
  // a metà riga «-», «+», «=», «1.» non aprono nulla e restano com'è; a inizio riga, no (ci vuole la barra)
  assert.ok(md.includes('- Designazioni: \\# titolo · - voce · + piu · = uguale · 1. uno · 2) due · \\> cita'));
  assert.ok(md.includes('- Nome commerciale: \\*\\*forte\\*\\* e \\_\\_doppio\\_\\_ e \\~\\~barrato\\~\\~'));
  assert.ok(md.includes('Fonte indicata da te:\n\n> \\---  \n> \\===  \n> codice  \n> \\> cita  \n> \\`\\`\\`  \n> \\# titolo  \n> \\- voce  \n> 1\\. uno\n'));
  assert.ok(md.includes('Note:\n\n> \\| a \\| b \\|  \n> \\|---\\|---\\|\n'));
  // nessuna riga con testo dell'utente comincia con un segno che il Markdown leggerebbe come struttura (dopo il nostro «> » o «- »)
  for (const r of righe) {
    if (/^(#{1,3} |\| |\|---\|---:\|$|---$|\*[^*])/.test(r) || r === '') continue;   // intestazioni, tabella, filetto e sottotitolo scritti da noi
    const contenuto = r.replace(/^(> \*\*|> |- |\d+\. )/, '');
    assert.doesNotMatch(contenuto, /^\s*([-+=>#]|\d+[.)])/, `riga che il Markdown leggerebbe come struttura: «${r}»`);
  }
  // la scheda personale in sé è valida: nome e densità non cambiano
  assert.ok(md.includes('Densità usata: **8 g/cm³** — inserita da te.'));
});

test('mdTesto: per qualunque testo, togliere le barre rovesciate restituisce l\'originale e nessun segno resta attivo (2000 testi casuali)', () => {
  const alfabeto = ['\\', '`', '*', '_', '[', ']', '<', '>', '|', '#', '~', '$', '&', '-', '+', '=', '.', ')', '1', '2', 'a', 'Z', ' ', ' ', ';', ':', '(', '!', 'à', '²', 'amp;', '#39;'];
  let seme = 20261114;
  const casuale = (n) => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme % n; };
  const attivi = new Set('`*_[]<>|#~$');
  const nonEscapati = (s) => { for (let i = 0; i < s.length; i++) { if (s[i] === '\\') { i++; continue; } if (attivi.has(s[i])) return s[i]; if (s[i] === '&' && /^&#?[A-Za-z0-9]+;/.test(s.slice(i))) return '&'; } return null; };
  // mdTesto è interna: la si raggiunge dal Markdown di una scheda personale (nome = testo, titolo di prima riga)
  for (let i = 0; i < 2000; i++) {
    let testo = '';
    for (let k = casuale(12); k > 0; k--) testo += alfabeto[casuale(alfabeto.length)];
    testo = testo.trim();
    if (!testo || !/[A-Za-z0-9]/.test(testo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') || ' ')) continue;
    const m = { ...PERS_B, nome: testo };
    const md = esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo;
    const titolo = md.split('\n')[0].slice('# Scheda materiale: '.length);
    assert.equal(disescapa(titolo), testo, `andata e ritorno di «${testo}»`);
    assert.equal(nonEscapati(titolo), null, `segno attivo in «${titolo}»`);
  }
});

// ---------------------------------------------------------------- nome del file
test('nome del file: scheda_<materiale>_<AAAA-MM-GG>_<HHMM>.md; materiale in minuscolo, senza accenti, solo [a-z0-9-], al massimo 30 caratteri', () => {
  const nome = (x) => Esporta.nomeMateriale(x);
  assert.equal(nome('C45E'), 'c45e');
  assert.equal(nome('Inox 304 (1.4301)'), 'inox-304-1-4301');
  assert.equal(nome('Ottone CuZn39Pb3 (CW614N)'), 'ottone-cuzn39pb3-cw614n');
  assert.equal(nome('Acciaio per utensili 1.2344 (H13)'), 'acciaio-per-utensili-1-2344-h1');   // tagliato a 30 caratteri
  assert.equal(nome('Acciaio per utensili 1.2344 (H13)').length, 30);
  assert.equal(nome('Lega àèéìòù Çaña ÄÖÜ ß'), 'lega-aeeiou-cana-aou');
  assert.equal(nome('  --Titanio--  grado   2  '), 'titanio-grado-2');
  assert.equal(nome('a'.repeat(29) + '-b-c'), 'a'.repeat(29), 'dopo il taglio non resta un trattino finale');
  assert.equal(nome('日本語'), 'materiale', 'nessun carattere ammesso: nome di ripiego');
  assert.equal(nome('Ø20 / M8 × 1,25'), '20-m8-1-25');
  assert.equal(nome('Lega personale <b>A</b>'), 'lega-personale-b-a-b');
  assert.equal(nome('../../etc/passwd'), 'etc-passwd', 'niente barre né punti: il nome non esce dalla cartella dei download');
  for (const m of DB.materiali.concat([PERS_A, PERS_B])) {
    const f = Esporta.nomeBaseFile(m, ISTANTE) + '.md';
    assert.match(f, /^scheda_[a-z0-9]+(?:-[a-z0-9]+)*_\d{4}-\d{2}-\d{2}_\d{4}\.md$/, f);
    assert.ok(Esporta.nomeMateriale(m.nome).length <= 30);
  }
  const nomi = DB.materiali.map((m) => Esporta.nomeBaseFile(m, ISTANTE));
  assert.equal(new Set(nomi).size, nomi.length, 'due voci del database non hanno mai lo stesso nome file');
});

test('data e ora del nome: locali, a due cifre; due schede dello stesso materiale in minuti diversi hanno nomi diversi', () => {
  assert.deepEqual(plain(Esporta.istante(new Date(2026, 0, 5, 3, 7))), { data: '2026-01-05', ora: '03:07' });
  assert.deepEqual(plain(Esporta.istante(new Date(2026, 11, 31, 23, 59))), { data: '2026-12-31', ora: '23:59' });
  assert.deepEqual(plain(Esporta.istante(new Date(2026, 5, 9, 0, 0))), { data: '2026-06-09', ora: '00:00' });
  const m = DB.materiali[0];
  assert.equal(Esporta.nomeBaseFile(m, { data: '2026-01-05', ora: '03:07' }), 'scheda_c45e_2026-01-05_0307');
  assert.equal(Esporta.nomeBaseFile(m, { data: '2026-01-05', ora: '00:00' }), 'scheda_c45e_2026-01-05_0000');
  assert.notEqual(Esporta.nomeBaseFile(m, { data: '2026-01-05', ora: '03:07' }), Esporta.nomeBaseFile(m, { data: '2026-01-05', ora: '03:08' }));
  const v = calcola(m, { forma: 'tonda', testi: FORME.tonda });
  const r = esporta(m, v, { istante: { data: '2026-01-05', ora: '03:07' } });
  assert.equal(r.nomeFile, 'scheda_c45e_2026-01-05_0307.md');
  assert.ok(r.testo.includes('Generata il 2026-01-05 alle 03:07 · app v0.3.0 · Database v4 del 2026-11-14'));
});

// ---------------------------------------------------------------- nessun risultato
test('senza risultato: nessun file, solo il motivo (lo stesso testo che l\'app mostra sotto il peso)', () => {
  const c45e = DB.materiali[0];
  const casi = [
    [null, { forma: 'tonda', testi: {} }, 'Scegli il materiale, inserisci D, L.'],
    [c45e, { forma: 'tonda', testi: {} }, 'Inserisci D, L.'],
    [c45e, { forma: 'tonda', testi: { D: '10' } }, 'Inserisci L.'],
    [c45e, { forma: 'tonda', testi: { D: '10', L: '5' }, pezzi: '' }, 'Inserisci i pezzi.'],
    [c45e, { forma: 'tonda', testi: { D: '10', L: '5' }, pezzi: '0' }, 'Correggi i campi segnalati.'],
    [c45e, { forma: 'tonda', testi: { D: 'abc', L: '5' } }, 'Correggi i campi segnalati.'],
    [c45e, { forma: 'tubo', testi: { De: '10', s: '6', L: '5' } }, 'Correggi i campi segnalati.'],
    [null, { forma: 'tonda', testi: { D: '10', L: '5' } }, 'Scegli il materiale.'],
    [null, { forma: 'tuboq', testi: { a: '4', b: '2' } }, 'Scegli il materiale, inserisci s, L.']
  ];
  for (const [m, c, motivo] of casi) {
    const v = Motore.valuta({ forma: c.forma, testi: c.testi, unitaLunghezza: 'mm', pezzi: c.pezzi === undefined ? '1' : c.pezzi, densita: m ? m.densita_g_cm3 : null, densitaIntervallo: null, unitaPeso: 'kg' });
    assert.equal(v.risultato, null);
    assert.equal(Esporta.motivoAssenza(m, v), motivo);
    const r = plain(esporta(m, v));
    assert.deepEqual(r, { ok: false, motivo }, `motivo per «${motivo}»`);
  }
  // casi degeneri: nessuna valutazione, nessun contesto
  assert.deepEqual(plain(Esporta.markdown({ materiale: c45e, valutazione: null, appVersione: APP, db: DB.meta, istante: ISTANTE })), { ok: false, motivo: Esporta.MOTIVO_GENERICO });
  assert.deepEqual(plain(Esporta.markdown({ materiale: c45e, valutazione: undefined })), { ok: false, motivo: Esporta.MOTIVO_GENERICO });
  assert.deepEqual(plain(Esporta.markdown(undefined)), { ok: false, motivo: Esporta.MOTIVO_GENERICO });
  assert.equal(Esporta.MOTIVO_GENERICO, 'Nessun risultato valido.');
  // materiale mancante anche se esiste un calcolo valido (stato incoerente): niente file, il motivo dice di scegliere il materiale
  const valido = calcola(c45e, { forma: 'tonda', testi: FORME.tonda });
  assert.ok(valido.risultato);
  assert.deepEqual(plain(esporta(null, valido)), { ok: false, motivo: 'Scegli il materiale.' });
  // volume nullo: un numero così piccolo che il quadrato scompare (raggiungibile scrivendo molti zeri); il motivo è quello dell'app, errore compreso
  const piccolo = Motore.valuta({ forma: 'tonda', testi: { D: '0,' + '0'.repeat(200) + '1', L: '1' }, unitaLunghezza: 'mm', pezzi: '1', densita: 7.85, unitaPeso: 'kg' });
  assert.equal(piccolo.risultato, null);
  assert.equal(piccolo.errore, 'Il volume risulta nullo o non calcolabile: controlla le dimensioni.');
  assert.equal(Esporta.motivoAssenza(c45e, piccolo), 'Il volume risulta nullo o non calcolabile: controlla le dimensioni.');
  assert.deepEqual(plain(esporta(c45e, piccolo)), { ok: false, motivo: 'Il volume risulta nullo o non calcolabile: controlla le dimensioni.' });
  // un materiale scelto con il calcolo di un altro stato senza risultato non dà un file, nemmeno parziale
  const vuoto = Motore.valuta({ forma: 'tonda', testi: { D: '10' }, unitaLunghezza: 'mm', pezzi: '1', densita: 7.85, unitaPeso: 'kg' });
  assert.equal(esporta(c45e, vuoto).testo, undefined);
});

// ---------------------------------------------------------------- l'interfaccia usa le stesse funzioni
test('la dicitura del file è quella a schermo (e c\'è una sola copia dei testi comuni, nel blocco ESPORTA)', () => {
  const m = html.match(/<p class="dicitura">([^<]*)<\/p>/);
  assert.ok(m, 'dicitura a schermo non trovata');
  assert.equal(m[1], Esporta.DICITURA_TEORICO);
  const ui = html.slice(html.indexOf('// ESPORTA:FINE'));
  for (const testo of ['function lettura(', 'function valoreElemento(', 'function nomeElemento(', 'function paginaDensita(', 'function etichettaAlias(', 'function conEtichetta(',
    'Una sola fonte di densità.', 'Fonti indipendenti per la densità', 'Copia fornita da Luca', 'Composizione parziale: solo', 'punto medio delle letture', 'scegli il materiale']) {
    assert.ok(!ui.includes(testo), `l'interfaccia non deve ridefinire «${testo}»: sta nel blocco ESPORTA`);
  }
  for (const uso of ['Esporta.motivoAssenza(', 'Esporta.righePesi(', 'Esporta.densitaUsata(', 'Esporta.identificazione(', 'Esporta.composizione(', 'Esporta.fontiDensita(', 'Esporta.markdown(']) {
    assert.ok(ui.includes(uso), `l'interfaccia deve chiamare ${uso}`);
  }
});

test('pulsanti nell\'HTML: disattivi già prima che parta lo script, «Condividi…» nascosto', () => {
  const scarica = html.match(/<button[^>]*id="btn-scarica-md"[^>]*>/);
  const condividi = html.match(/<button[^>]*id="btn-condividi-md"[^>]*>/);
  assert.ok(scarica && condividi);
  assert.match(scarica[0], /\sdisabled(\s|>)/);
  assert.match(condividi[0], /\sdisabled(\s|>)/);
  assert.match(condividi[0], /\shidden(\s|>)/);
  assert.match(scarica[0], /type="button"/);
  assert.match(scarica[0], /aria-describedby="peso-stato"/);
});

test('documento: stessa struttura per Markdown e (poi) PDF; nome base senza estensione; avviso personale solo per le schede personali', () => {
  const m = DB.materiali[0];
  const d = Esporta.documento({ materiale: m, valutazione: calcola(m, { forma: 'tonda', testi: FORME.tonda }), appVersione: APP, db: DB.meta, istante: ISTANTE });
  assert.equal(d.ok, true);
  assert.equal(d.nomeBase, 'scheda_c45e_2026-11-14_2135');
  assert.equal(d.avvisoPersonale, null);
  assert.deepEqual(plain(d.sezioni.map((s) => s.titolo)), ['Identificazione', 'Composizione chimica', 'Densità', 'Pezzo', 'Calcolo', 'Avvertenza']);
  const tipi = new Set();
  for (const s of d.sezioni) for (const b of s.blocchi) tipi.add(b.t);
  assert.deepEqual([...tipi].sort(), ['avviso', 'elenco', 'sotto', 'tabella', 'testo']);
  assert.equal(Esporta.aMarkdown(d), esporta(m, calcola(m, { forma: 'tonda', testi: FORME.tonda })).testo);
  const p = Esporta.documento({ materiale: PERS_A, valutazione: calcola(PERS_A, { forma: 'tonda', testi: FORME.tonda }), appVersione: APP, db: DB.meta, istante: ISTANTE });
  assert.equal(p.avvisoPersonale, Esporta.DICITURA_PERSONALE);
  assert.ok(p.sezioni.some((s) => s.blocchi.some((b) => b.t === 'libero')), 'fonte e note personali sono blocchi «libero»');
});
