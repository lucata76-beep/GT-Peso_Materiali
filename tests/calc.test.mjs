// Test del motore di calcolo. Eseguono esattamente il blocco ENGINE di index.html (non una copia).
// Con densità fittizia ρ = 1 g/cm³ i grammi coincidono con i cm³: sono valori di prova, non dati del database.
// Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/\/\/ ENGINE:INIZIO\n([\s\S]*?)\/\/ ENGINE:FINE/);
assert.ok(m, 'blocco ENGINE non trovato in index.html');
const Motore = vm.runInNewContext(m[1] + '\n;Motore', {});

const ok = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} atteso ${b} ± ${tol}, ottenuto ${a}`);
// peso unitario in g con ρ = 1 g/cm³
const grammi = (forma, testi, unitaLunghezza = 'mm', extra = {}) => {
  const v = Motore.valuta({ forma, testi, unitaLunghezza, pezzi: '1', densita: 1, unitaPeso: 'g', ...extra });
  assert.ok(v.completo, `calcolo non completo: ${JSON.stringify(v.campi)}`);
  return v.risultato.peso_unitario;
};

// ---- i test richiesti
test('cilindro D100 × L100 → 785,398 g', () => ok(grammi('tonda', { D: '100', L: '100' }), 785.398, 0.0005));
test('quadro 10×10×10 → 1,000 g', () => ok(grammi('quadro', { a: '10', L: '10' }), 1.0, 1e-9));
test('sfera D10 → 0,523599 g', () => ok(grammi('sfera', { D: '10' }), 0.523599, 5e-7));
test('esagono S10 × L10 → 0,866025 g', () => ok(grammi('esagono', { S: '10', L: '10' }), 0.866025, 5e-7));
test('tubo De20 s2 L100 → 11,3097 g', () => ok(grammi('tubo', { De: '20', s: '2', L: '100' }), 11.3097, 5e-5));
test('tubo rettangolare 40×20 s2 L100 → 22,400 g', () => ok(grammi('tuboq', { a: '40', b: '20', s: '2', L: '100' }), 22.4, 1e-9));
test('piatto 100×50×10 → 50,000 g', () => ok(grammi('piatto', { a: '100', b: '50', L: '10' }), 50.0, 1e-9));
test('cubo di lato 1 in → 16,387064 g', () => ok(grammi('quadro', { a: '1', L: '1' }, 'in'), 16.387064, 5e-7));
test('1000 g → 2,204623 lb e 35,27396 oz', () => {
  ok(Motore.convertiMassa(1000, 'g', 'lb'), 2.204623, 5e-7);
  ok(Motore.convertiMassa(1000, 'g', 'oz'), 35.27396, 5e-6);
});
test('coerenza: stesso pezzo in mm e in pollici = stesso peso', () => {
  const mm = grammi('tonda', { D: '25,4', L: '254' }, 'mm', { densita: 7.85 });
  const pollici = grammi('tonda', { D: '1', L: '10' }, 'in', { densita: 7.85 });
  ok(mm, pollici, 1e-9);
  const cm = grammi('tuboq', { a: '4', b: '2', s: '0,2', L: '10' }, 'cm');
  ok(cm, grammi('tuboq', { a: '40', b: '20', s: '2', L: '100' }, 'mm'), 1e-9);
  const metri = grammi('piatto', { a: '0,1', b: '0,05', L: '0,01' }, 'm');
  ok(metri, 50.0, 1e-9);
});

// ---- altre unità e conversioni
test('conversioni di massa: andata e ritorno', () => {
  for (const u of ['g', 'kg', 't', 'lb', 'oz']) {
    ok(Motore.convertiMassa(Motore.convertiMassa(123.456, 'kg', u), u, 'kg'), 123.456, 1e-9, u);
  }
  ok(Motore.convertiMassa(1, 'lb', 'kg'), 0.45359237, 1e-12);
  ok(Motore.convertiMassa(1, 'oz', 'g'), 28.349523125, 1e-12);
  ok(Motore.convertiMassa(1, 't', 'kg'), 1000, 1e-9);
});

test('unità di peso nel risultato', () => {
  const base = { forma: 'quadro', testi: { a: '100', L: '1000' }, unitaLunghezza: 'mm', pezzi: '1', densita: 7.85 };
  const kg = Motore.valuta({ ...base, unitaPeso: 'kg' }).risultato;
  ok(kg.peso_unitario, 78.5, 1e-9);
  ok(Motore.valuta({ ...base, unitaPeso: 'lb' }).risultato.peso_unitario, 78.5 / 0.45359237, 1e-9);
  ok(Motore.valuta({ ...base, unitaPeso: 't' }).risultato.peso_unitario, 0.0785, 1e-12);
  ok(Motore.valuta({ ...base, unitaPeso: 'g' }).risultato.peso_unitario, 78500, 1e-6);
});

test('pezzi: peso unitario e totale', () => {
  const v = Motore.valuta({ forma: 'quadro', testi: { a: '10', L: '10' }, unitaLunghezza: 'mm', pezzi: '12', densita: 8, unitaPeso: 'g' }).risultato;
  ok(v.peso_unitario, 8, 1e-12);
  ok(v.peso_totale, 96, 1e-12);
  assert.equal(v.pezzi, 12);
});

test('volume noto: cm³ e pollici cubi', () => {
  ok(Motore.valuta({ forma: 'volume', testi: { V: '250' }, unitaLunghezza: 'cm', pezzi: '1', densita: 2, unitaPeso: 'g' }).risultato.peso_unitario, 500, 1e-9);
  ok(Motore.valuta({ forma: 'volume', testi: { V: '1' }, unitaLunghezza: 'in', pezzi: '1', densita: 1, unitaPeso: 'g' }).risultato.peso_unitario, 16.387064, 5e-7);
  ok(Motore.valuta({ forma: 'volume', testi: { V: '1000' }, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'g' }).risultato.peso_unitario, 1, 1e-12);
});

test('intervallo di densità: pesi con le letture estreme', () => {
  const r = Motore.valuta({ forma: 'quadro', testi: { a: '10', L: '10' }, unitaLunghezza: 'mm', pezzi: '2', densita: 7.775, densitaIntervallo: [7.7, 7.85], unitaPeso: 'g' }).risultato;
  ok(r.peso_totale_min, 15.4, 1e-9);
  ok(r.peso_totale_max, 15.7, 1e-9);
  ok(r.peso_totale, 15.55, 1e-9);
});

// ---- interpretazione dei numeri
test('numeri: punto e virgola sono decimali, nessun separatore di migliaia', () => {
  assert.equal(Motore.interpretaNumero('1,5').valore, 1.5);
  assert.equal(Motore.interpretaNumero('1.5').valore, 1.5);
  assert.equal(Motore.interpretaNumero(' 25,4 ').valore, 25.4);
  assert.equal(Motore.interpretaNumero('.5').valore, 0.5);
  assert.equal(Motore.interpretaNumero('5.').valore, 5);
  assert.equal(Motore.interpretaNumero('1.000').valore, 1); // il punto è sempre decimale
  assert.equal(Motore.interpretaNumero('').stato, 'vuoto');
  assert.equal(Motore.interpretaNumero('   ').stato, 'vuoto');
  // messaggi mirati: l'ambiguità tra separatori è spiegata, il testo non numerico no
  for (const t of ['1.000,5', '1,000.5', '1,2,3', '1.2.3']) assert.match(Motore.interpretaNumero(t).messaggio, /un solo separatore decimale/, t);
  for (const t of ['abc', '1e3', '12 5', ',', '.', '5mm']) assert.match(Motore.interpretaNumero(t).messaggio, /Scrivi un numero/, t);
  assert.match(Motore.interpretaNumero('-5').messaggio, /maggiore di zero/);
  for (const t of ['1.000,5', '1,000.5', '1,2,3', '1.2.3', 'abc', '1e3', '12 5', ',', '.', '--5', '5mm', '٣']) {
    const r = Motore.interpretaNumero(t);
    assert.equal(r.stato, 'errore', t);
    assert.ok(r.messaggio.length > 10, t);
  }
});

// ---- validazione: errori chiari, mai NaN
test('valori nulli, negativi o assurdi: errore chiaro', () => {
  for (const t of ['0', '-5', '0,0', '1e9', 'x', '1,2,3']) {
    const v = Motore.valuta({ forma: 'quadro', testi: { a: t, L: '10' }, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'g' });
    assert.equal(v.completo, false, t);
    assert.equal(v.campi.a.stato, 'errore', t);
    assert.equal(v.risultato, null, t);
  }
  const grande = Motore.valuta({ forma: 'quadro', testi: { a: '1000000000', L: '10' }, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'g' });
  assert.equal(grande.campi.a.messaggio, 'Il valore è troppo grande.');
});

test('tubo tondo: 2s deve essere minore di De', () => {
  for (const s of ['10', '11', '20']) {
    const v = Motore.valuta({ forma: 'tubo', testi: { De: '20', s, L: '100' }, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'g' });
    assert.equal(v.completo, false, s);
    assert.equal(v.campi.s.stato, 'errore', s);
    assert.match(v.campi.s.messaggio, /2·s/);
  }
  assert.equal(Motore.valuta({ forma: 'tubo', testi: { De: '20', s: '9,99', L: '100' }, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'g' }).completo, true);
});

test('tubo quadro/rettangolare: 2s minore del lato più corto, avviso spigoli vivi', () => {
  const v = Motore.valuta({ forma: 'tuboq', testi: { a: '40', b: '20', s: '10', L: '100' }, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'g' });
  assert.equal(v.completo, false);
  assert.equal(v.campi.s.stato, 'errore');
  const buono = Motore.valuta({ forma: 'tuboq', testi: { a: '40', b: '20', s: '2', L: '100' }, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'g' });
  assert.equal(buono.risultato.avvisi.length, 1);
  assert.match(buono.risultato.avvisi[0], /spigoli vivi/);
});

test('pezzi: intero maggiore di zero', () => {
  for (const p of ['0', '1,5', '-2', 'due', '2000000000']) {
    const v = Motore.valuta({ forma: 'quadro', testi: { a: '10', L: '10' }, unitaLunghezza: 'mm', pezzi: p, densita: 1, unitaPeso: 'g' });
    assert.equal(v.completo, false, p);
    assert.equal(v.pezzi.stato, 'errore', p);
  }
  assert.equal(Motore.valuta({ forma: 'quadro', testi: { a: '10', L: '10' }, unitaLunghezza: 'mm', pezzi: '', densita: 1, unitaPeso: 'g' }).completo, false);
});

test('campi vuoti o densità mancante: nessun risultato', () => {
  const vuoto = Motore.valuta({ forma: 'tonda', testi: {}, unitaLunghezza: 'mm', pezzi: '1', densita: 1, unitaPeso: 'kg' });
  assert.deepEqual([...vuoto.mancanti], ['D', 'L']);
  assert.equal(vuoto.risultato, null);
  const senzaDensita = Motore.valuta({ forma: 'tonda', testi: { D: '10', L: '10' }, unitaLunghezza: 'mm', pezzi: '1', densita: null, unitaPeso: 'kg' });
  assert.equal(senzaDensita.completo, false);
  assert.equal(senzaDensita.densitaMancante, true);
  assert.equal(Motore.valuta({ forma: 'tonda', testi: { D: '10', L: '10' }, unitaLunghezza: 'mm', pezzi: '1', densita: 0, unitaPeso: 'kg' }).completo, false);
  assert.equal(Motore.valuta({ forma: 'inesistente', testi: {}, pezzi: '1', densita: 1 }).completo, false);
});

// percorsi dei numeri NaN/Infinity in un oggetto (JSON.stringify trasformerebbe NaN in null e non li vedrebbe)
const numeriNonFiniti = (x, percorso = '') => {
  if (typeof x === 'number') return Number.isFinite(x) ? [] : [percorso];
  if (x && typeof x === 'object') return Object.entries(x).flatMap(([k, v]) => numeriNonFiniti(v, percorso + '.' + k));
  return [];
};

test('mai NaN o Infinity nei risultati e nei passaggi (prova su molte combinazioni)', () => {
  const valori = ['', '0', '-1', 'abc', '1,5', '2', '10', '99999', '1e5', '1.2.3', '0,001', '1000000'];
  let controllati = 0;
  for (const forma of Motore.ORDINE_FORME) {
    const campi = Motore.FORME[forma].campi.map((c) => c[0]);
    for (const u of ['mm', 'cm', 'm', 'in']) {
      for (const x of valori) {
        for (const y of valori) {
          const testi = {};
          campi.forEach((c, i) => { testi[c] = (i % 2 ? y : x); });
          const v = Motore.valuta({ forma, testi, unitaLunghezza: u, pezzi: '3', densita: 7.85, unitaPeso: 'kg' });
          assert.deepEqual(numeriNonFiniti(v), [], `${forma} ${u} ${x}/${y}: numeri non finiti nel risultato`);
          if (v.risultato) {
            assert.ok(Number.isFinite(v.risultato.peso_totale) && v.risultato.peso_totale > 0);
            assert.ok(v.risultato.passaggi.every((p) => !/NaN|Infinity|undefined/.test(p)), v.risultato.passaggi.join(' | '));
          }
          controllati++;
        }
      }
    }
  }
  assert.ok(controllati > 1000);
});

test('formattazione: virgola decimale, nessun NaN', () => {
  assert.equal(Motore.formatta(785.398163, 6), '785,398');
  assert.equal(Motore.formatta(0.523599, 6), '0,523599');
  assert.equal(Motore.formatta(22.4, 6), '22,4');
  assert.equal(Motore.formatta(0, 6), '0');
  assert.equal(Motore.formatta(NaN, 6), '–');
  assert.equal(Motore.formatta(Infinity, 6), '–');
  assert.equal(Motore.formatta(1e-7, 6), '0,0000001');
  assert.equal(Motore.formatta(785398.163397, 9, true), '785 398,163');
  assert.equal(Motore.formatta(1e9, 9, true), '1 000 000 000');
});

test('passaggi: contengono formula, volume, massa e totale', () => {
  const r = Motore.valuta({ forma: 'tonda', testi: { D: '100', L: '100' }, unitaLunghezza: 'mm', pezzi: '3', densita: 7.85, unitaPeso: 'kg' }).risultato;
  const t = r.passaggi.join('\n');
  assert.match(t, /Formula: V = π\/4 · D² · L/);
  assert.match(t, /785 398,163 mm³/);
  assert.match(t, /785,398 cm³/);
  assert.match(t, /Massa = V × ρ/);
  assert.match(t, /Totale = .* × 3 pezzi/);
});

// ---- fonti indipendenti: stessa regola nel motore (usato dall'interfaccia) e nel validatore
import { estraiDb, contaFontiIndipendenti, enteDi } from '../tools/valida-db.mjs';
test('fontiIndipendenti: enti diversi, le schede dello stesso ente (IT/EN, società dello stesso gruppo) contano una volta', () => {
  const f = (e, campi = ['densita'], d = [{ g_cm3: 7.8 }]) => ({ emittente: e, campi, densita_letta: campi.includes('densita') ? d : undefined });
  assert.equal(Motore.fontiIndipendenti([f('Lucefin Group'), f('Lucefin Group')], 'densita'), 1);
  assert.equal(Motore.fontiIndipendenti([f('Lucefin Group'), f('Ovako'), f('Ovako')], 'densita'), 2);
  assert.equal(Motore.fontiIndipendenti([f('Swiss Steel Group (Steeltec)'), f('Swiss Steel Group (Deutsche Edelstahlwerke)')], 'densita'), 1);
  assert.equal(Motore.fontiIndipendenti([f('Ovako', ['designazioni'])], 'densita'), 0);
  assert.equal(Motore.fontiIndipendenti([f('A', ['tag']), f('B', ['tag', 'alias']), f('b', ['alias'])], 'tag'), 2);
  assert.equal(Motore.fontiIndipendenti([f('A', ['tag']), f('B', ['tag', 'alias']), f('b', ['alias'])], 'alias'), 1);
  assert.equal(Motore.fontiIndipendenti(undefined, 'densita'), 0);
  assert.equal(Motore.enteDi('ATI (Allegheny Technologies)'), 'ati');
});

test('fontiIndipendenti: il motore e il validatore danno lo stesso numero per ogni voce e ogni campo del DB', () => {
  const db = estraiDb(html);
  for (const v of db.materiali) for (const campo of ['densita', 'composizione', 'designazioni', 'tag', 'alias', 'nome_commerciale']) {
    assert.equal(Motore.fontiIndipendenti(v.fonti, campo), contaFontiIndipendenti(v.fonti, campo), `${v.id}/${campo}`);
  }
  for (const v of db.materiali) for (const fo of v.fonti) assert.equal(Motore.enteDi(fo.emittente), enteDi(fo.emittente));
});

test('densitaTipica: vera solo se ogni lettura di densità è dichiarata tipica dal documento', () => {
  const l = (tipico, extra = {}) => ({ densita_letta: [{ valore: '7800', unita: 'kg/m³', g_cm3: 7.8, ...(tipico === undefined ? {} : { tipico }) }], ...extra });
  assert.equal(Motore.densitaTipica([l(true)]), true);
  assert.equal(Motore.densitaTipica([l(true), l(true)]), true, 'più documenti, tutti tipici');
  assert.equal(Motore.densitaTipica([l(true), l(undefined)]), false, 'basta un documento non tipico');
  assert.equal(Motore.densitaTipica([l(undefined), l(true)]), false);
  assert.equal(Motore.densitaTipica([l(undefined)]), false, 'senza il flag');
  assert.equal(Motore.densitaTipica([l(false)]), false);
  assert.equal(Motore.densitaTipica([l('true')]), false, 'solo true vale');
  assert.equal(Motore.densitaTipica([{ densita_letta: [{ tipico: true }, { tipico: undefined }] }]), false, 'due letture nello stesso documento, una non tipica');
  assert.equal(Motore.densitaTipica([{ densita_letta: [{ tipico: true }, { tipico: true }] }]), true, 'due letture nello stesso documento, entrambe tipiche');
  assert.equal(Motore.densitaTipica([l(true), { campi: ['tag'] }]), true, 'un documento senza letture non conta');
  assert.equal(Motore.densitaTipica([]), false);
  assert.equal(Motore.densitaTipica(undefined), false);
  assert.equal(Motore.densitaTipica([{ campi: ['tag'] }]), false, 'nessuna lettura');
});
