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

test('fonte da distributore o senza ruolo: rifiutata', () => {
  const db = copia();
  db.materiali[0].fonti[0].ruolo = 'distributore';
  delete db.materiali[1].fonti[0].ruolo;
  conErrore(db, 'ruolo non ammesso');
  assert.ok(validaDb(db).errori.filter((e) => e.includes('ruolo non ammesso')).length >= 2);
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
