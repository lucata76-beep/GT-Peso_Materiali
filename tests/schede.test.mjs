// Test delle schede materiale personali. Eseguono esattamente i blocchi ENGINE, RICERCA e SCHEDE di index.html (non una copia).
// Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { estraiDb, validaDb } from '../tools/valida-db.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blocco = (nome) => { const m = html.match(new RegExp(`// ${nome}:INIZIO\\n([\\s\\S]*?)// ${nome}:FINE`)); assert.ok(m, `blocco ${nome} non trovato`); return m[1]; };
const { Motore, Ricerca, Schede } = vm.runInNewContext(`${blocco('ENGINE')}\n${blocco('RICERCA')}\n${blocco('SCHEDE')}\n;({ Motore, Ricerca, Schede })`, {});
const DB = estraiDb(html);
const plain = (x) => JSON.parse(JSON.stringify(x));    // gli oggetti nascono in un altro contesto (vm): li ricopio per assert.deepEqual
const vicino = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `atteso ${b}, ottenuto ${a}`);

const OGGI = '2026-11-14';
const base = (extra = {}) => ({ nome: 'Acciaio di prova', densita: { testo: '7,85', unita: 'g/cm³' }, composizione: [], designazioni: '', nome_commerciale: '', fonte: '', note: '', ...extra });
const valida = (input, ctx = {}) => plain(Schede.valida(input, { nomiEsistenti: [], oggi: OGGI, ...ctx }));
const archiviata = (extra = {}, id = 'p-prova1') => { const r = valida(base(extra)); assert.ok(r.ok, JSON.stringify(r.errori)); return { ...r.scheda, id }; };

// ---------------------------------------------------------------- densità
test('densità: punto o virgola, unità convertite in g/cm³', () => {
  vicino(Schede.interpretaDensita('7,85', 'g/cm³').g_cm3, 7.85);
  vicino(Schede.interpretaDensita('7.85', 'g/cm³').g_cm3, 7.85);
  vicino(Schede.interpretaDensita('7,85', 'kg/dm³').g_cm3, 7.85);
  vicino(Schede.interpretaDensita('7850', 'kg/m³').g_cm3, 7.85);
  const lbIn3 = 453.59237 / Math.pow(2.54, 3);                       // 1 lb = 453,59237 g, 1 in = 2,54 cm
  vicino(Schede.interpretaDensita('0,284', 'lb/in³').g_cm3, 0.284 * lbIn3, 1e-9);
  vicino(Schede.UNITA_DENSITA['lb/in³'], lbIn3, 1e-12);
  assert.deepEqual(plain(Schede.ORDINE_UNITA), ['g/cm³', 'kg/dm³', 'kg/m³', 'lb/in³']);
});

test('densità: errori chiari per testo vuoto, non numerico, zero, negativo, troppo alta, separatori ambigui, unità ignota', () => {
  assert.equal(Schede.interpretaDensita('', 'g/cm³').stato, 'vuoto');
  assert.match(Schede.interpretaDensita('abc', 'g/cm³').messaggio, /Scrivi un numero/);
  assert.match(Schede.interpretaDensita('0', 'g/cm³').messaggio, /maggiore di zero/);
  assert.match(Schede.interpretaDensita('-7', 'g/cm³').messaggio, /maggiore di zero/);
  assert.match(Schede.interpretaDensita('26', 'g/cm³').messaggio, /supera 25 g\/cm³: controlla l'unità/);
  assert.match(Schede.interpretaDensita('26000', 'kg/m³').messaggio, /supera 25/);
  assert.equal(Schede.interpretaDensita('25', 'g/cm³').stato, 'ok', '25 g/cm³ è il limite ammesso');
  assert.match(Schede.interpretaDensita('1.000,5', 'g/cm³').messaggio, /un solo separatore/);
  assert.match(Schede.interpretaDensita('7,85', 'g/litro').messaggio, /unità di misura/);
});

// ---------------------------------------------------------------- composizione
test('valore di composizione: intervallo, massimo, minimo, nominale, resto (maiuscole e simboli diversi)', () => {
  const v = (t) => plain(Schede.interpretaValoreComposizione(t));
  for (const t of ['0,35-0,43', '0.35-0.43', '0,35 – 0,43', '0,35—0,43', '0,35÷0,43', ' 0,35 - 0,43 ']) assert.deepEqual(v(t), { stato: 'ok', tipo: 'intervallo', min: 0.35, max: 0.43 }, t);
  for (const t of ['max 0,5', 'MAX 0.5', 'massimo 0,5', '≤0,5', '≤ 0,5', '<= 0,5']) assert.deepEqual(v(t), { stato: 'ok', tipo: 'max', max: 0.5 }, t);
  for (const t of ['min 0,2', 'MIN 0.2', 'minimo 0,2', '≥0,2', '>= 0,2']) assert.deepEqual(v(t), { stato: 'ok', tipo: 'min', min: 0.2 }, t);
  assert.deepEqual(v('0,4'), { stato: 'ok', tipo: 'nominale', nominale: 0.4 });
  assert.deepEqual(v('18'), { stato: 'ok', tipo: 'nominale', nominale: 18 });
  for (const t of ['resto', 'Resto', 'RESTO']) assert.deepEqual(v(t), { stato: 'ok', tipo: 'resto' }, t);
  assert.deepEqual(v('min 0'), { stato: 'ok', tipo: 'min', min: 0 });
  assert.deepEqual(v('0-0,5'), { stato: 'ok', tipo: 'intervallo', min: 0, max: 0.5 });
  assert.equal(v('').stato, 'vuoto');
});

test('valore di composizione: errori (minimo > massimo, oltre 100, zero, testo, separatori)', () => {
  const m = (t) => Schede.interpretaValoreComposizione(t).messaggio;
  assert.match(m('0,5-0,35'), /minimo supera il massimo/);
  assert.match(m('101'), /non può superare 100/);
  assert.match(m('max 120'), /non può superare 100/);
  assert.match(m('0,3-120'), /non può superare 100/);
  assert.match(m('0'), /maggiore di zero/);
  assert.match(m('max 0'), /maggiore di zero/);
  assert.match(m('0-0'), /maggiore di zero/);
  for (const t of ['abc', '-5', '1,2,3', '1.000,5', 'circa 5', '5%', 'max', '0,3 - ']) assert.match(m(t), /Scrivi un valore come|Usa un solo separatore|Scrivi un numero/, t);
  assert.equal(Schede.interpretaValoreComposizione('100').stato, 'ok');
});

test('testo canonico di una riga: rilegge lo stesso valore', () => {
  for (const t of ['0,35-0,43', 'max 0,5', 'min 0,2', '0,4', 'resto', '0,0625', '12,5-13,5']) {
    const r = Schede.interpretaValoreComposizione(t);
    const riga = { tipo: r.tipo, ...(r.min !== undefined && { min: r.min }), ...(r.max !== undefined && { max: r.max }), ...(r.nominale !== undefined && { nominale: r.nominale }) };
    assert.deepEqual(plain(Schede.interpretaValoreComposizione(Schede.testoRiga(riga))), plain(r), t);
  }
});

// ---------------------------------------------------------------- scheda: inserimento
test('scheda valida: normalizzata, con densità in g/cm³ e composizione in righe', () => {
  const r = valida(base({
    nome: '  Acciaio   di prova ', densita: { testo: '7850', unita: 'kg/m³' },
    composizione: [{ elemento: 'C', valore: '0,35-0,43' }, { elemento: '', valore: '' }, { elemento: 'Cr', valore: 'max 1' }, { elemento: 'Fe', valore: 'resto' }],
    designazioni: 'X1;  Y2 \n Z3; X1', nome_commerciale: ' Marchio ', fonte: 'catalogo', note: 'a\r\nb'
  }), { creata: '2026-01-02' });
  assert.ok(r.ok, JSON.stringify(r.errori));
  const s = r.scheda;
  assert.equal(s.nome, 'Acciaio di prova');
  vicino(s.densita_g_cm3, 7.85);
  assert.deepEqual(s.densita_immessa, { testo: '7850', unita: 'kg/m³' });
  assert.deepEqual(s.composizione, [{ elemento: 'C', tipo: 'intervallo', min: 0.35, max: 0.43 }, { elemento: 'Cr', tipo: 'max', max: 1 }, { elemento: 'Fe', tipo: 'resto' }]);
  assert.deepEqual(s.designazioni, ['X1', 'Y2', 'Z3']);
  assert.equal(s.nome_commerciale, 'Marchio'); assert.equal(s.note, 'a\nb');
  assert.equal(s.creata, '2026-01-02'); assert.equal(s.modificata, OGGI);
});

test('scheda minima: solo nome e densità; la composizione resta facoltativa', () => {
  const r = valida(base());
  assert.ok(r.ok); assert.deepEqual(r.scheda.composizione, []);
});

test('nome: obbligatorio, non troppo lungo, non duplicato (maiuscole, accenti e simboli non contano)', () => {
  assert.match(valida(base({ nome: '   ' })).errori.nome, /Scrivi il nome/);
  assert.match(valida(base({ nome: 'x'.repeat(81) })).errori.nome, /troppo lungo/);
  assert.match(valida(base({ nome: '---' })).errori.nome, /almeno una lettera o una cifra/);
  const ctx = { nomiEsistenti: ['Alluminio 7075', 'Acciaio ÈSEMPIO'] };
  assert.match(valida(base({ nome: 'alluminio-7075' }), ctx).errori.nome, /Esiste già/);
  assert.match(valida(base({ nome: 'ACCIAIO esempio' }), ctx).errori.nome, /Esiste già/);
  assert.ok(valida(base({ nome: 'x'.repeat(80) }), ctx).ok);
  // i nomi del database verificato sono davvero esclusi: nessuna voce reale può essere ridefinita da una scheda personale
  for (const v of DB.materiali) assert.match(valida(base({ nome: v.nome }), { nomiEsistenti: DB.materiali.map((m) => m.nome) }).errori.nome, /Esiste già/, v.nome);
});

test('densità obbligatoria e controllata nella scheda', () => {
  assert.match(valida(base({ densita: { testo: '', unita: 'g/cm³' } })).errori.densita, /Scrivi la densità/);
  assert.match(valida(base({ densita: { testo: '30', unita: 'g/cm³' } })).errori.densita, /supera 25/);
  assert.match(valida(base({ densita: undefined })).errori.densita, /Scrivi la densità/);
});

test('composizione: errori per riga (elemento mancante o non valido, duplicato, due «resto», valore errato)', () => {
  const r = valida(base({ composizione: [
    { elemento: '', valore: '1' }, { elemento: 'cr', valore: '1' }, { elemento: 'Crx', valore: '1' }, { elemento: 'C', valore: '' },
    { elemento: 'Ni', valore: '0,5-0,1' }, { elemento: 'Mn', valore: '1' }, { elemento: 'Mn', valore: '2' },
    { elemento: 'Fe', valore: 'resto' }, { elemento: 'Al', valore: 'resto' }
  ] }));
  assert.equal(r.ok, false); assert.equal(r.scheda, null);
  const e = r.errori.composizione.map((x) => `${x.riga}:${x.campo}`);
  assert.deepEqual(e, ['0:elemento', '1:elemento', '2:elemento', '3:valore', '4:valore', '6:elemento', '8:valore']);
  assert.match(r.errori.composizione[5].messaggio, /già inserito/);
  assert.match(r.errori.composizione[6].messaggio, /un solo elemento «resto»/);
});

test('composizione: la somma dei valori nominali oltre il 100 % è un avviso, non un errore', () => {
  const r = valida(base({ composizione: [{ elemento: 'Fe', valore: '90' }, { elemento: 'Cr', valore: '20' }] }));
  assert.ok(r.ok); assert.match(r.avvisi[0], /supera il 100 %/);
  assert.deepEqual(valida(base({ composizione: [{ elemento: 'Fe', valore: '60' }, { elemento: 'Cr', valore: '20' }] })).avvisi, []);
});

test('designazioni, nome commerciale, fonte e note: limiti di lunghezza', () => {
  assert.match(valida(base({ designazioni: Array.from({ length: 21 }, (_, i) => 'D' + i).join(';') })).errori.designazioni, /Troppe designazioni/);
  assert.match(valida(base({ designazioni: 'x'.repeat(61) })).errori.designazioni, /troppo lunga/);
  assert.match(valida(base({ nome_commerciale: 'x'.repeat(81) })).errori.nome_commerciale, /troppo lungo/);
  assert.match(valida(base({ fonte: 'x'.repeat(301) })).errori.fonte, /troppo lungo/);
  assert.match(valida(base({ note: 'x'.repeat(501) })).errori.note, /troppo lungo/);
  assert.ok(valida(base({ fonte: 'x'.repeat(300), note: 'x'.repeat(500) })).ok);
});

test('controllo di tutti i campi insieme: gli errori si accumulano e la scheda non si crea', () => {
  const r = valida({ nome: '', densita: { testo: 'x', unita: 'g/cm³' }, composizione: [{ elemento: 'cr', valore: '1' }] });
  assert.equal(r.ok, false);
  assert.ok(r.errori.nome && r.errori.densita && r.errori.composizione.length === 1);
});

// ---------------------------------------------------------------- forma usata dall'app
test('aMateriale: forma delle voci del database, marcata «personale», senza fonti, tag né alias', () => {
  const s = archiviata({ composizione: [{ elemento: 'C', valore: '0,35-0,43' }, { elemento: 'Cr', valore: 'max 1' }, { elemento: 'Mo', valore: '0,2' }, { elemento: 'Ti', valore: 'min 0,1' }, { elemento: 'Fe', valore: 'resto' }], designazioni: 'X1; Y2', nome_commerciale: 'Marchio' });
  const m = plain(Schede.aMateriale(s));
  assert.equal(m.personale, true); assert.equal(m.famiglia, 'Schede personali'); assert.equal(Schede.FAMIGLIA, 'Schede personali');
  assert.deepEqual(m.fonti, []); assert.deepEqual(m.tag, []); assert.deepEqual(m.alias, []);
  assert.deepEqual(m.designazioni, { EN: '', WNr: '', UNI: '', AISI_SAE: '', DIN: '', altre: ['X1', 'Y2'] });
  assert.equal(m.nome_commerciale, 'Marchio'); assert.equal(m.densita_intervallo_g_cm3, null);
  vicino(m.densita_g_cm3, 7.85);
  assert.deepEqual(m.composizione.elementi, { C: { min: 0.35, max: 0.43 }, Cr: { max: 1 }, Mo: { nominale: 0.2 }, Ti: { min: 0.1 }, Fe: 'resto' });
  assert.match(m.composizione.riferimento, /non verificata su documenti/);
  assert.equal(plain(Schede.aMateriale(archiviata())).composizione, null, 'senza composizione: nessuna tabella');
});

test('aInput: la scheda si riapre nel modulo e, ricontrollata, dà la stessa scheda (anche con kg/m³ e lb/in³)', () => {
  for (const extra of [
    { composizione: [{ elemento: 'C', valore: '0,35-0,43' }, { elemento: 'Fe', valore: 'resto' }], designazioni: 'A; B', fonte: 'f', note: 'n\nm' },
    { densita: { testo: '7850', unita: 'kg/m³' }, composizione: [{ elemento: 'Cu', valore: 'max 0,5' }, { elemento: 'Zn', valore: '39,5' }] },
    { densita: { testo: '0,284', unita: 'lb/in³' }, nome_commerciale: 'X' }
  ]) {
    const s = archiviata(extra);
    const di_nuovo = valida(Schede.aInput(s), { id: s.id, creata: s.creata });
    assert.ok(di_nuovo.ok, JSON.stringify(di_nuovo.errori));
    assert.deepEqual(di_nuovo.scheda, plain(s));
  }
});

// ---------------------------------------------------------------- ricerca con le schede personali
const dbUnito = (schede) => ({ meta: { ...DB.meta, famiglie: [...DB.meta.famiglie, 'Schede personali'] }, materiali: [...DB.materiali, ...schede.map((s) => Schede.aMateriale(s))] });
const trova = (db, q) => Array.from(Ricerca.crea(db).cerca(q), (r) => ({ id: r.m.id, rango: r.rango, motivi: Array.from(r.motivi) }));

test('ricerca: una scheda personale si trova per nome, designazione, sigla e nome commerciale, e sta nel suo gruppo', () => {
  const s = archiviata({ nome: 'Lega Zeta', designazioni: 'ZETA-7; Sigla Y', nome_commerciale: 'Zetalloy' }, 'p-zeta');
  const db = dbUnito([s]);
  for (const q of ['zeta', 'Lega Zeta', 'zeta-7', 'sigla y', 'zetalloy']) assert.deepEqual(trova(db, q).map((x) => x.id), ['p-zeta'], q);
  assert.deepEqual(trova(db, 'zeta-7')[0].motivi, ['altra designazione «ZETA-7»']);
  assert.deepEqual(trova(db, 'zeta')[0].motivi, ['altra designazione «ZETA-7»'], 'inizio della designazione');
  const g = Ricerca.crea(db); const gruppi = Array.from(g.raggruppa(g.cerca('zeta')), (x) => x.famiglia);
  assert.deepEqual(gruppi, ['Schede personali']);
  assert.ok(!Array.from(g.raggruppa(Ricerca.crea(dbUnito([])).cerca('')), (x) => x.famiglia).includes('Schede personali'), 'senza schede il gruppo non compare');
});

test('ricerca: le schede personali non cambiano i risultati del database verificato (numeri abbreviati, tag, alias, sinonimi)', () => {
  const schede = [archiviata({ nome: 'Mia 2343', designazioni: '2343; 7075; 1.7075; inox' }, 'p-a'), archiviata({ nome: 'Mia 2', designazioni: '1.2343' }, 'p-b')];
  const senza = dbUnito([]); const con = dbUnito(schede);
  const verificati = (db, q) => trova(db, q).filter((x) => !x.id.startsWith('p-'));
  for (const q of ['2343', '2311', '7075', 'ferro', 'acciaio dolce', 'korv', 'ncm2', 'bonificato', 'temprato', 'acciaio', 'ergal', 'inox', '4462', '6511', '1.2343']) {
    assert.deepEqual(verificati(con, q), verificati(senza, q), `«${q}» cambia con le schede personali`);
  }
  assert.ok(trova(con, '2343').some((x) => x.id === '1.2343' && x.motivi[0] === 'numero abbreviato (regola dell\'app)'), 'il numero abbreviato del 1.2343 resta valido');
  assert.deepEqual(Ricerca.numeriAbbreviati(con) && { ...Ricerca.numeriAbbreviati(con) }, { ...Ricerca.numeriAbbreviati(senza) });
  // la scheda dell'utente con la stessa designazione si trova comunque, per designazione esatta
  assert.equal(trova(con, '2343')[0].id.startsWith('p-'), true);
});

// ---------------------------------------------------------------- archivio e file di backup
test('archivio: serializza e rilegge le stesse schede', () => {
  const lista = [archiviata({ composizione: [{ elemento: 'C', valore: '0,4' }] }, 'p-uno'), archiviata({ nome: 'Seconda', densita: { testo: '8000', unita: 'kg/m³' }, designazioni: 'A;B' }, 'p-due')];
  const r = plain(Schede.deserializza(Schede.serializza(lista)));
  assert.equal(r.errore, null); assert.deepEqual(r.scartate, []); assert.deepEqual(r.schede, plain(lista));
  assert.equal(JSON.parse(Schede.serializza(lista)).versione, 1);
});

test('archivio: file non valido, versione sconosciuta o forma sbagliata non lanciano e non danno schede', () => {
  for (const t of ['', 'non è json', '[]', '{}', 'null', '{"versione":1}', '{"versione":1,"schede":{}}']) {
    const r = Schede.deserializza(t);
    assert.deepEqual(plain(r.schede), [], t); assert.ok(r.errore, t);
  }
  assert.match(Schede.deserializza('{"versione":2,"schede":[]}').errore, /Versione dell'archivio non supportata \(2\)/);
});

test('archivio: le schede alterate o incoerenti vengono scartate una per una, con il motivo', () => {
  const buona = archiviata({}, 'p-ok');
  const m = (f) => { const x = plain(archiviata({ nome: 'Altra ' + Math.random().toString(36).slice(2, 6) }, 'p-x' + Math.random().toString(36).slice(2, 6))); f(x); return x; };
  const lista = [
    buona,
    m((x) => { x.densita_g_cm3 = 99; }),                      // densità fuori limite
    m((x) => { x.densita_g_cm3 = 7.7; }),                     // incoerente con il valore immesso (7,85)
    m((x) => { x.densita_immessa.unita = 'g/litro'; }),
    m((x) => { x.composizione = [{ elemento: 'cr', tipo: 'max', max: 1 }]; }),
    m((x) => { x.composizione = [{ elemento: 'C', tipo: 'max', max: 500 }]; }),
    m((x) => { x.composizione = [{ elemento: 'Fe', tipo: 'resto' }, { elemento: 'Al', tipo: 'resto' }]; }),
    m((x) => { x.composizione = [{ elemento: 'C', tipo: 'max', max: 1 }, { elemento: 'C', tipo: 'max', max: 2 }]; }),
    m((x) => { x.id = '../x'; }),
    m((x) => { x.nome = ''; }),
    m((x) => { x.designazioni = 'non un array'; }),
    m((x) => { x.creata = 'ieri'; }),
    42, null, 'testo'
  ];
  const r = plain(Schede.deserializza(JSON.stringify({ versione: 1, schede: lista })));
  assert.deepEqual(r.schede.map((s) => s.id), ['p-ok']);
  assert.equal(r.scartate.length, lista.length - 1);
  assert.ok(r.scartate.every((x) => x.motivo));
  assert.ok(r.scartate.some((x) => /incoerente/.test(x.motivo)));
});

test('archivio: nomi o id doppi nel file, e oltre il limite di 200 schede', () => {
  const a = archiviata({ nome: 'Uguale' }, 'p-1'); const b = { ...archiviata({ nome: 'uguale' }, 'p-2') }; const c = { ...archiviata({ nome: 'Altro' }, 'p-1') };
  const r = plain(Schede.deserializza(JSON.stringify({ versione: 1, schede: [a, b, c] })));
  assert.equal(r.schede.length, 1); assert.equal(r.scartate.length, 2);
  const tante = Array.from({ length: 205 }, (_, i) => ({ ...archiviata({ nome: 'Scheda ' + i }, 'p-n' + i) }));
  const r2 = plain(Schede.deserializza(JSON.stringify({ versione: 1, schede: tante })));
  assert.equal(r2.schede.length, 200); assert.equal(r2.scartate.length, 5);
});

test('nuovo id: sempre diverso da quelli usati, anche con lo stesso seme', () => {
  const usati = [];
  for (let i = 0; i < 5; i++) usati.push(Schede.nuovoId('abc', usati));
  assert.equal(new Set(usati).size, 5); assert.ok(usati.every((x) => /^p-[a-z0-9-]+$/.test(x)));
  assert.match(Schede.nuovoId('', []), /^p-x$/);
});

test('importazione: aggiunge le nuove, salta i nomi già presenti (anche del database), dà un id nuovo agli id in conflitto', () => {
  const esistenti = [archiviata({ nome: 'Mia lega' }, 'p-a')];
  const importate = [
    archiviata({ nome: 'MIA LEGA' }, 'p-b'),                   // stesso nome di una scheda presente
    archiviata({ nome: DB.materiali[0].nome }, 'p-c'),         // stesso nome di una voce del database
    archiviata({ nome: 'Nuova' }, 'p-a'),                      // id già usato da un'altra scheda
    archiviata({ nome: 'Altra nuova' }, 'p-d')
  ];
  const u = plain(Schede.unisci(plain(esistenti), importate, DB.materiali.map((m) => m.nome), 'seme'));
  assert.equal(u.aggiunte, 2); assert.equal(u.schede.length, 3);
  assert.deepEqual(u.saltate.map((x) => x.motivo), ['nome già presente', 'nome uguale a una scheda del database']);
  assert.equal(new Set(u.schede.map((s) => s.id)).size, 3, 'gli id restano tutti diversi');
  assert.equal(u.schede[0].nome, 'Mia lega');
  assert.equal(plain(esistenti).length, 1, 'l\'elenco di partenza non viene modificato');
});

test('importazione: oltre il limite di 200 schede si ferma con il motivo', () => {
  const esistenti = Array.from({ length: 200 }, (_, i) => ({ ...archiviata({ nome: 'E' + i }, 'p-e' + i) }));
  const u = plain(Schede.unisci(esistenti, [archiviata({ nome: 'Una di troppo' }, 'p-z')], [], 's'));
  assert.equal(u.aggiunte, 0); assert.match(u.saltate[0].motivo, /oltre il limite di 200/);
});

test('il database verificato non accetta schede personali', () => {
  const db = structuredClone(DB); db.materiali[0].personale = true;
  assert.ok(validaDb(db).errori.some((e) => e.includes('personale')), 'una voce «personale» nel DB verificato deve essere rifiutata');
  assert.deepEqual(validaDb(DB).errori, []);
});
