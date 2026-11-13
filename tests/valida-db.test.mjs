// Test del validatore: il DB reale deve passare, e ogni violazione delle regole sulle fonti deve essere rilevata.
// Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estraiDb, validaDb } from '../tools/valida-db.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const copia = () => structuredClone(estraiDb(html));
const conErrore = (db, frammento) => {
  const { errori } = validaDb(db);
  assert.ok(errori.some((e) => e.includes(frammento)), `atteso un errore con «${frammento}», trovati: ${JSON.stringify(errori)}`);
};

test('il DB in index.html è valido', () => {
  const { errori } = validaDb(copia());
  assert.deepEqual(errori, []);
});

test('ogni voce ha almeno una fonte con densità letta', () => {
  for (const v of copia().materiali) {
    assert.ok(v.fonti.length >= 1, v.id);
    assert.ok(v.fonti.some((f) => f.densita_letta?.length), v.id);
  }
});

test('voce senza fonti: rifiutata', () => {
  const db = copia(); db.materiali[0].fonti = [];
  conErrore(db, 'nessuna fonte');
});

test('id duplicato: rifiutato', () => {
  const db = copia(); db.materiali[1].id = db.materiali[0].id;
  conErrore(db, 'id duplicato');
});

test('densità nominale fuori intervallo: rifiutata', () => {
  const db = copia();
  const v = db.materiali.find((x) => x.densita_intervallo_g_cm3);
  v.densita_g_cm3 = v.densita_intervallo_g_cm3[1] + 1;
  conErrore(db, v.id);
});

test('densità diversa dalla lettura concorde: rifiutata', () => {
  const db = copia();
  const v = db.materiali.find((x) => !x.densita_intervallo_g_cm3);
  v.densita_g_cm3 += 0.05;
  conErrore(db, 'diversa dalla lettura concorde');
});

test('letture discordi senza intervallo: rifiutate', () => {
  const db = copia();
  const v = db.materiali.find((x) => x.densita_intervallo_g_cm3);
  v.densita_intervallo_g_cm3 = null; v.nota_intervallo = '';
  conErrore(db, 'letture discordi');
});

test('nome commerciale senza fonte che lo verifichi: rifiutato', () => {
  const db = copia();
  const v = db.materiali.find((x) => !x.nome_commerciale);
  v.nome_commerciale = 'Nome inventato';
  conErrore(db, 'nome_commerciale senza fonte');
});

test('fonte senza hash o senza url https: rifiutata', () => {
  const db = copia();
  delete db.materiali[0].fonti[0].sha256;
  db.materiali[1].fonti[0].url = 'http://esempio.it/x.pdf';
  conErrore(db, 'sha256');
  conErrore(db, 'url https');
});

test('densità nulla o negativa: rifiutata', () => {
  const db = copia(); db.materiali[0].densita_g_cm3 = 0;
  conErrore(db, 'densita_g_cm3');
});

test('composizione con min > max e senza «resto»: rifiutata', () => {
  const db = copia();
  const v = db.materiali.find((x) => x.composizione.tipo === 'lega');
  const k = Object.keys(v.composizione.elementi).find((e) => typeof v.composizione.elementi[e] === 'object');
  v.composizione.elementi[k] = { min: 5, max: 1 };
  conErrore(db, 'min > max');
  for (const e of Object.keys(v.composizione.elementi)) if (v.composizione.elementi[e] === 'resto') delete v.composizione.elementi[e];
  conErrore(db, 'elemento base');
});

test('distributore su dati numerici o fonte senza ruolo: rifiutati', () => {
  const db = copia();
  db.materiali[0].fonti[0].ruolo = 'distributore';          // ammesso solo per gli alias, qui la fonte porta densità
  delete db.materiali[1].fonti[0].ruolo;
  conErrore(db, 'solo per gli alias');
  conErrore(db, 'ruolo non ammesso');
});

// ---- tag
test('il vocabolario dei tag è nel DB e ogni tag usato è nel vocabolario', () => {
  const db = copia();
  assert.ok(db.meta.tag.length >= 8);
  for (const v of db.materiali) for (const t of v.tag) assert.ok(db.meta.tag.includes(t.tag), `${v.id}: ${t.tag}`);
});

test('ogni tag ha prove: documento, pagina e frase', () => {
  const db = copia();
  let n = 0;
  for (const v of db.materiali) for (const t of v.tag) {
    assert.ok(t.prove.length >= 1, `${v.id}/${t.tag}`);
    for (const p of t.prove) {
      assert.ok(v.fonti.some((f) => f.id === p.fonte && f.campi.includes('tag')), `${v.id}/${t.tag}/${p.fonte}`);
      assert.ok(Number.isInteger(p.pagina) && p.estratto.length > 4, `${v.id}/${t.tag}`);
      n++;
    }
  }
  assert.ok(n >= 19);
});

test('tag fuori vocabolario: rifiutato', () => {
  const db = copia(); const v = db.materiali.find((x) => x.tag.length);
  v.tag[0].tag = 'tag inventato';
  conErrore(db, 'fuori dal vocabolario');
});

test('tag senza prove o con prova di una fonte non dichiarata: rifiutato', () => {
  let db = copia(); let v = db.materiali.find((x) => x.tag.length);
  v.tag[0].prove = [];
  conErrore(db, 'senza prove');
  db = copia(); v = db.materiali.find((x) => x.tag.length);
  v.tag[0].prove[0].fonte = 'FONTE-INESISTENTE';
  conErrore(db, 'non è tra le fonti della voce');
  db = copia(); v = db.materiali.find((x) => x.tag.length);
  const f = v.fonti.find((x) => x.id === v.tag[0].prove[0].fonte);
  f.campi = f.campi.filter((c) => c !== 'tag');
  conErrore(db, 'non dichiara il campo «tag»');
});

test('tag duplicato nella stessa voce: rifiutato', () => {
  const db = copia(); const v = db.materiali.find((x) => x.tag.length);
  v.tag.push(structuredClone(v.tag[0]));
  conErrore(db, 'duplicato');
});

test('«da tempra»: solo con la durezza HRC dopo tempra e solo per utensili o cuscinetti', () => {
  const db = copia();
  const conTempra = db.materiali.filter((v) => v.tag.some((t) => t.tag === 'da tempra'));
  assert.ok(conTempra.length >= 3);
  for (const v of conTempra) {
    for (const p of v.tag.find((t) => t.tag === 'da tempra').prove) assert.match(p.estratto, /HRC/, `${v.id}: la prova deve citare la tabella HRC`);
    assert.ok(v.tag.some((t) => ['per cuscinetti', 'per utensili a caldo', 'per utensili a freddo'].includes(t.tag)), `${v.id}: «da tempra» solo su utensili o cuscinetti`);
  }
  const v = conTempra[0];
  v.tag.find((t) => t.tag === 'da tempra').prove[0].estratto = 'solo through hardening, nessuna tabella di durezza';
  conErrore(db, 'durezza HRC');
});

// ---- alias (nessun alias è ancora nel DB reale: le regole si provano su voci costruite)
const conAlias = (db, opzioni = {}) => {
  const v = db.materiali.find((x) => x.id === '7075');
  const nuova = (id, emittente, ruolo, url) => ({ id, emittente, ruolo, documento: 'Documento di prova', riferimento: 'alias p. 1', url, sha256: '0123456789abcdef', campi: ['alias'] });
  v.fonti.push(nuova('A1', opzioni.e1 ?? 'Fornitore Uno', opzioni.r1 ?? 'fornitore di lavorazioni', opzioni.u1 ?? 'https://esempio-uno.it/7075.pdf'));
  v.fonti.push(nuova('A2', opzioni.e2 ?? 'Politecnico Due', opzioni.r2 ?? 'tesi o articolo tecnico', opzioni.u2 ?? 'https://esempio-due.it/tesi.pdf'));
  v.alias.push({ alias: 'Ergal', origine: opzioni.origine ?? 'non da produttore', fonti: opzioni.fonti ?? ['A1', 'A2'],
    prove: (opzioni.fonti ?? ['A1', 'A2']).map((f) => ({ fonte: f, pagina: 1, estratto: '7075, noto come Ergal' })) });
  return v;
};

test('alias non da produttore con 2 documenti indipendenti (distributore, tesi): ammesso', () => {
  const db = copia(); conAlias(db);
  assert.deepEqual(validaDb(db).errori, []);
});

test('alias non da produttore con un solo documento o con lo stesso emittente: rifiutato', () => {
  let db = copia(); conAlias(db, { fonti: ['A1'] });
  conErrore(db, 'almeno 2 documenti di emittenti indipendenti');
  db = copia(); conAlias(db, { e1: 'Stesso Emittente', e2: 'stesso emittente' });
  conErrore(db, 'almeno 2 documenti di emittenti indipendenti');
});

test('alias da aggregatori (Wikipedia, Scribd, MatWeb…): rifiutato', () => {
  for (const url of ['https://it.wikipedia.org/wiki/7075', 'https://www.scribd.com/document/1/x', 'https://www.matweb.com/search/x']) {
    const db = copia(); conAlias(db, { u1: url });
    conErrore(db, 'aggregatori');
  }
});

test('documenti da distributore o tesi usati per dati numerici: rifiutato', () => {
  const db = copia(); const v = conAlias(db);
  v.fonti.find((f) => f.id === 'A1').campi = ['alias', 'densita'];
  conErrore(db, 'solo per gli alias');
});

test('alias con origine «produttore» ma senza documento di produttore: rifiutato', () => {
  const db = copia(); conAlias(db, { origine: 'produttore' });
  conErrore(db, 'nessuna fonte di produttore');
});

test('alias «non da produttore» con un documento di produttore tra le fonti: rifiutato', () => {
  const db = copia(); const v = conAlias(db, { fonti: ['A1', 'A2', 'KAI-7075SP'] });
  v.fonti.find((f) => f.id === 'KAI-7075SP').campi.push('alias');
  v.alias[0].prove.push({ fonte: 'KAI-7075SP', pagina: 1, estratto: '7075 (Ergal)' });
  conErrore(db, 'l\'origine deve essere «produttore»');
});

test('alias senza prove, o fonte che dichiara «alias» senza essere citata: rifiutato', () => {
  let db = copia(); let v = conAlias(db); v.alias[0].prove = [];
  conErrore(db, 'senza prove (documento, pagina, frase)');
  db = copia(); v = conAlias(db); v.alias = [];
  conErrore(db, 'dichiara «alias» ma nessun alias la cita');
});

test('Lucefin è etichettato come produttore e distributore', () => {
  const lucefin = copia().materiali.flatMap((v) => v.fonti).filter((f) => f.emittente === 'Lucefin Group');
  assert.ok(lucefin.length > 0);
  for (const f of lucefin) assert.match(f.ruolo, /^produttore e distributore/);
});

test('nessuna fonte thyssenkrupp nel DB (non ammessa)', () => {
  const testo = JSON.stringify(copia());
  assert.ok(!/thyssenkrupp/i.test(testo));
});

test('composizione parziale: solo valori booleani', () => {
  const db = copia();
  const v = db.materiali.find((x) => x.composizione.parziale);
  assert.ok(v, 'attesa almeno una voce con composizione parziale');
  v.composizione.parziale = 'sì';
  conErrore(db, 'vero/falso');
});

test('famiglia non prevista: rifiutata', () => {
  const db = copia(); db.materiali[0].famiglia = 'Famiglia inventata';
  conErrore(db, 'non prevista');
});

test('JSON con «</script» nel testo: rifiutato', () => {
  const rotto = html.replace('"Acciai da bonifica"', '"Acciai </script> da bonifica"');
  assert.throws(() => estraiDb(rotto), /romperebbe la pagina/);
});
