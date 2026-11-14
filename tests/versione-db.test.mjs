// Etichette del DB: dopo una versione pubblicata, ogni modifica ai dati alza la versione (e aggiorna la data).
// Mai due contenuti diversi con la stessa etichetta. Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { estraiDb } from '../tools/valida-db.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const db = estraiDb(html);
const impronta = (d) => createHash('sha256').update(JSON.stringify(d)).digest('hex');

// Versioni già pubblicate, con l'impronta SHA-256 del loro contenuto (JSON del blocco DB). A ogni nuova pubblicazione si aggiunge una riga.
// Storico, prima di questa regola: l'etichetta «3» è stata usata per tre contenuti diversi (due nella Fase 2b, uno nella Fase 2c). Quella protetta
// qui è la v3 della Fase 2c (27 voci, 2026-11-14, commit 08cea49, PR #3), che sostituisce il DB di main. Elenco completo: docs/versioni-db.md.
const PUBBLICATE = {
  1: { data: '2026-11-13', voci: 21, sha256: '49508d684cc439e2a65128ded7c883ed85b3bc0bcaea25d06a638f46e3478ef2' },
  2: { data: '2026-11-13', voci: 21, sha256: '8216be8048230adfbb6f8059e00c25cdc2f6f59620dd6f8e703988b2de4c1c46' },
  3: { data: '2026-11-14', voci: 27, sha256: '1b2ea1c41a814ea691811fea91a68fcfaddd24171399c1baa2327269cc125792' }
};

test('una versione già pubblicata non cambia contenuto: se la modifichi, alza la versione', () => {
  const p = PUBBLICATE[db.meta.versione];
  if (!p) return;   // versione nuova: non ancora pubblicata
  assert.equal(impronta(db), p.sha256, `il DB dichiara la v${db.meta.versione} ma il contenuto è diverso da quello pubblicato: alza la versione`);
  assert.equal(db.meta.data, p.data);
  assert.equal(db.materiali.length, p.voci);
});

test('la versione del DB non è mai più vecchia di una già pubblicata', () => {
  for (const [v, p] of Object.entries(PUBBLICATE)) {
    assert.ok(Number(db.meta.versione) >= Number(v), `versione ${db.meta.versione} più vecchia della v${v} già pubblicata`);
    if (Number(db.meta.versione) > Number(v)) assert.notEqual(impronta(db), p.sha256, `la v${db.meta.versione} ha lo stesso contenuto della v${v}: stessa etichetta, stesso contenuto`);
  }
});

test('la data del DB non è precedente a quella di una versione pubblicata uguale o più vecchia', () => {
  for (const [v, p] of Object.entries(PUBBLICATE)) {
    if (Number(db.meta.versione) >= Number(v)) assert.ok(db.meta.data >= p.data, `data ${db.meta.data} precedente a quella della v${v} (${p.data})`);
  }
});

test('il DB di lavoro è la v4 del 2026-11-14 con il flag «tipico» su tutte le letture di C45, S355J2, S235JR e Inconel 718', () => {
  assert.equal(db.meta.versione, '4');
  assert.equal(db.meta.data, '2026-11-14');
  const letture = (v) => v.fonti.flatMap((f) => f.densita_letta || []);
  const conFlag = db.materiali.filter((v) => letture(v).some((x) => x.tipico === true)).map((v) => v.id);
  assert.deepEqual(conFlag, ['s355j2', 'inconel718', 's235jr', 'c45']);
  // il documento le dichiara tipiche tutte: nessuna lettura di queste voci senza flag
  for (const [id, n] of [['s355j2', 1], ['inconel718', 2], ['s235jr', 1], ['c45', 1]]) {
    const l = letture(db.materiali.find((v) => v.id === id));
    assert.equal(l.length, n, `${id}: numero di letture`);
    assert.ok(l.every((x) => x.tipico === true), `${id}: tutte le letture con il flag`);
  }
});
