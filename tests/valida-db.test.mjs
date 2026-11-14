// Test del validatore: il DB reale deve passare, e ogni violazione delle regole sulle fonti deve essere rilevata.
// Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estraiDb, validaDb, contaFontiIndipendenti, numeriAbbreviati, enteDi } from '../tools/valida-db.mjs';

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

// ---- alias: le regole si provano su voci costruite, con un alias inventato («Provalias») che non è nel DB reale
const conAlias = (db, opzioni = {}) => {
  const v = db.materiali.find((x) => x.id === '7075');
  const nuova = (id, emittente, ruolo, url) => ({ id, emittente, ruolo, documento: 'Documento di prova', riferimento: 'alias p. 1', url, sha256: '0123456789abcdef', campi: ['alias'] });
  v.fonti.push(nuova('A1', opzioni.e1 ?? 'Fornitore Uno', opzioni.r1 ?? 'fornitore di lavorazioni', opzioni.u1 ?? 'https://esempio-uno.it/7075.pdf'));
  v.fonti.push(nuova('A2', opzioni.e2 ?? 'Politecnico Due', opzioni.r2 ?? 'tesi o articolo tecnico', opzioni.u2 ?? 'https://esempio-due.it/tesi.pdf'));
  v.alias.push({ alias: 'Provalias', origine: opzioni.origine ?? 'non da produttore', fonti: opzioni.fonti ?? ['A1', 'A2'],
    prove: (opzioni.fonti ?? ['A1', 'A2']).map((f) => ({ fonte: f, pagina: 1, estratto: '7075, noto come Provalias' })) });
  return v;
};

test('alias non da produttore con 2 documenti indipendenti (distributore, tesi): ammesso', () => {
  const db = copia(); conAlias(db);
  assert.deepEqual(validaDb(db).errori, []);
});

test('alias non da produttore con un solo documento o con lo stesso emittente: rifiutato', () => {
  let db = copia(); conAlias(db, { fonti: ['A1'] });
  conErrore(db, 'almeno 2 fonti indipendenti');
  db = copia(); conAlias(db, { e1: 'Stesso Emittente', e2: 'stesso emittente' });
  conErrore(db, 'almeno 2 fonti indipendenti');
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
  v.alias[0].prove.push({ fonte: 'KAI-7075SP', pagina: 1, estratto: '7075 (Provalias)' });
  conErrore(db, 'l\'origine deve essere «produttore»');
});

test('alias senza prove, o fonte che dichiara «alias» senza essere citata: rifiutato', () => {
  let db = copia(); let v = conAlias(db); v.alias[0].prove = [];
  conErrore(db, 'senza prove (documento, pagina, frase)');
  db = copia(); v = conAlias(db); v.alias = [];
  conErrore(db, 'dichiara «alias» ma nessun alias la cita');
});

test('alias con nota: ammessa se è un testo, rifiutata se vuota o non testuale', () => {
  let db = copia(); let v = conAlias(db); v.alias[0].nota = 'Nel documento «Provalias» è anche il nome di una famiglia di leghe.';
  assert.deepEqual(validaDb(db).errori, []);
  db = copia(); v = conAlias(db); v.alias[0].nota = '';
  conErrore(db, 'la nota, se presente');
  db = copia(); v = conAlias(db); v.alias[0].nota = 42;
  conErrore(db, 'la nota, se presente');
});

// ---- Fase 2c: fonti indipendenti, alias con una sola fonte, documenti forniti dall'utente, corrispondenze indicative, numeri abbreviati
const voceDa = (db, id) => db.materiali.find((v) => v.id === id);

test('fonti indipendenti = enti diversi: Lucefin IT ed EN contano una volta, le tre società Swiss Steel una sola', () => {
  assert.equal(enteDi('Swiss Steel Group (Steeltec)'), 'swiss steel group');
  assert.equal(enteDi('Swiss Steel Group (Deutsche Edelstahlwerke)'), enteDi('Swiss Steel Group'));
  const f = (emittente, extra = {}) => ({ emittente, campi: ['densita'], densita_letta: [{ valore: '7.85', unita: 'kg/dm³', g_cm3: 7.85 }], ...extra });
  assert.equal(contaFontiIndipendenti([f('Lucefin Group'), f('Lucefin Group')], 'densita'), 1);
  assert.equal(contaFontiIndipendenti([f('Lucefin Group'), f('Ovako')], 'densita'), 2);
  assert.equal(contaFontiIndipendenti([f('Swiss Steel Group (Steeltec)'), f('Swiss Steel Group (Deutsche Edelstahlwerke)'), f('Swiss Steel Group')], 'densita'), 1);
  assert.equal(contaFontiIndipendenti([{ emittente: 'Ovako', campi: ['designazioni'] }], 'densita'), 0, 'senza densita_letta non conta');
  assert.equal(contaFontiIndipendenti([{ emittente: 'A', campi: ['tag'] }, { emittente: 'a (b)', campi: ['tag'] }, { emittente: 'C', campi: ['tag'] }], 'tag'), 2);
});

test('densità da una sola fonte indipendente: 39NiCrMo3 (IT+EN Lucefin), 1.2311, S235JR, C45; più fonti per 1.4462, 1.2343, 7075', () => {
  const db = copia();
  for (const id of ['39nicrmo3', '1.2311', 's235jr', 'c45']) assert.equal(contaFontiIndipendenti(voceDa(db, id).fonti, 'densita'), 1, id);
  assert.equal(contaFontiIndipendenti(voceDa(db, '1.4462').fonti, 'densita'), 3, '1.4462: Lucefin, Swiss Steel, Alleima');
  assert.equal(contaFontiIndipendenti(voceDa(db, '1.2343').fonti, 'densita'), 2, '1.2343: Lucefin e Böhler (ISOBLOC e ISODISC sono lo stesso ente)');
  assert.equal(contaFontiIndipendenti(voceDa(db, '7075').fonti, 'densita'), 2);
  // il doppio conteggio IT+EN esiste solo nel 39NiCrMo3 e nel 1.4462 (le uniche voci con due schede Lucefin dello stesso materiale)
  const doppie = db.materiali.filter((v) => {
    const l = v.fonti.filter((f) => f.emittente === 'Lucefin Group');
    return l.length > 1;
  }).map((v) => v.id);
  assert.deepEqual(doppie.sort(), ['1.4462', '39nicrmo3']);
});

test('i documenti forniti da Luca (IMS, Moretti): senza url, solo alias e corrispondenze, mai densità, tag o composizione', () => {
  const db = copia();
  const ims = voceDa(db, '39nicrmo3').fonti.find((f) => f.id === 'IMS-NCM2');
  const mor = voceDa(db, '1.2379').fonti.find((f) => f.id === 'MOR-CWS');
  for (const f of [ims, mor]) {
    assert.equal(f.fornito_da_utente, true);
    assert.equal(f.url, null);
    assert.ok(f.campi.every((c) => ['alias', 'corrispondenze'].includes(c)), f.id);
    assert.ok(f.densita_letta === undefined);
  }
  assert.match(ims.ruolo, /^catalogo commerciale/);
  assert.match(mor.ruolo, /^distributore/);
  // la composizione del 39NiCrMo3 resta quella della EN 10083-3 (IMS riporta UNI 7845: Si 0,15-0,40, P e S ≤ 0,035)
  const c = voceDa(db, '39nicrmo3').composizione;
  assert.deepEqual(c.elementi.Si, { max: 0.40 });
  assert.deepEqual(c.elementi.P, { max: 0.025 });
  assert.match(c.riferimento, /EN 10083-3/);
});

test('documento fornito dall\'utente: ammesso solo con url null; senza il flag serve un url https', () => {
  let db = copia(); const ims = voceDa(db, '39nicrmo3').fonti.find((f) => f.id === 'IMS-NCM2');
  ims.url = 'https://esempio.it/ims.pdf';
  conErrore(db, 'non ha url');
  db = copia(); delete voceDa(db, '39nicrmo3').fonti.find((f) => f.id === 'IMS-NCM2').fornito_da_utente;
  conErrore(db, 'url https mancante');
});

test('alias con una sola fonte: serve una_sola_fonte e vale solo con un solo ente', () => {
  const db = copia();
  const ncm2 = voceDa(db, '39nicrmo3').alias[0];
  assert.equal(ncm2.alias, 'NCM2'); assert.equal(ncm2.una_sola_fonte, true); assert.equal(ncm2.origine, 'non da produttore');
  assert.equal(voceDa(db, '1.2379').alias[0].alias, 'KORV');
  assert.equal(voceDa(db, '7075').alias[0].una_sola_fonte, undefined, 'Ergal ha due enti indipendenti');
  // senza il flag: rifiutato
  let d2 = copia(); delete voceDa(d2, '39nicrmo3').alias[0].una_sola_fonte;
  conErrore(d2, 'almeno 2 fonti indipendenti');
  // con il flag ma due enti indipendenti: rifiutato
  d2 = copia(); voceDa(d2, '7075').alias[0].una_sola_fonte = true;
  conErrore(d2, 'enti indipendenti');
  // flag con origine «produttore»: rifiutato
  d2 = copia(); const k = voceDa(d2, '39nicrmo3'); k.alias[0].una_sola_fonte = true; k.alias[0].origine = 'produttore';
  conErrore(d2, 'nessuna fonte di produttore');
  // alias valido da produttore: senza flag ammesso, con il flag rifiutato («una sola fonte» vale solo per i «non da produttore»)
  const daProduttore = (flag) => {
    const d = copia(); const v = voceDa(d, '7075');
    v.fonti.find((f) => f.id === 'KAI-7075SP').campi.push('alias');
    v.alias.push({ alias: 'Provaprod', origine: 'produttore', fonti: ['KAI-7075SP'], prove: [{ fonte: 'KAI-7075SP', pagina: 1, estratto: '7075 detto Provaprod' }], ...(flag ? { una_sola_fonte: true } : {}) });
    return d;
  };
  assert.deepEqual(validaDb(daProduttore(false)).errori, []);
  conErrore(daProduttore(true), 'vale solo per gli alias «non da produttore»');
  d2 = copia(); voceDa(d2, '1.2379').alias[0].una_sola_fonte = 'sì';
  conErrore(d2, 'vero/falso');
  // due schede dello stesso ente restano «una sola fonte»
  d2 = copia(); conAlias(d2, { e1: 'Stesso Ente (IT)', e2: 'Stesso Ente (EN)' });
  conErrore(d2, 'almeno 2 fonti indipendenti');
});

test('fonte solo alias: i campi ammessi sono alias e corrispondenze; densità o tag no', () => {
  let db = copia(); voceDa(db, '1.2379').fonti.find((f) => f.id === 'MOR-CWS').campi = ['alias', 'tag'];
  conErrore(db, 'solo per gli alias');
  db = copia(); voceDa(db, '1.2379').fonti.find((f) => f.id === 'MOR-CWS').campi = ['alias', 'composizione'];
  conErrore(db, 'solo per gli alias');
});

test('corrispondenze indicative: array di stringhe, con fonte che le dichiara, mai già tra le designazioni', () => {
  const k = voceDa(copia(), '39nicrmo3');
  assert.deepEqual(k.designazioni.indicative, ['36CrNiMo4', '1.6511']);
  assert.equal(k.designazioni.DIN, '', '36CrNiMo4 non è la designazione DIN della voce');
  let db = copia(); voceDa(db, '39nicrmo3').designazioni.indicative = ['', 'x'];
  conErrore(db, 'designazioni.indicative');
  db = copia(); voceDa(db, '39nicrmo3').designazioni.indicative.push('39NiCrMo3');
  conErrore(db, 'già presente tra le designazioni');
  db = copia(); for (const f of voceDa(db, '39nicrmo3').fonti) f.campi = f.campi.filter((c) => c !== 'corrispondenze');
  conErrore(db, 'senza fonte che dichiari «corrispondenze»');
  db = copia(); voceDa(db, '42crmo4').fonti[0].campi.push('corrispondenze');
  conErrore(db, 'ma la voce non ha corrispondenze indicative');
});

test('numeri abbreviati: nessuna collisione nel DB reale; il validatore fallisce se una voce futura ne crea una', () => {
  const reale = numeriAbbreviati(copia());
  assert.deepEqual(reale.collisioni, []);
  for (const q of ['2343', '2311', '2379', '4462', '2344', '4301', '0038', '0503', '6510']) assert.ok(reale.mappa[q], q);
  assert.equal(reale.mappa['2343'], '1.2343'); assert.equal(reale.mappa['6511'], undefined, '1.6511 è solo indicativa');
  const nuova = (db, id, wnr, extra = {}) => { const v = structuredClone(voceDa(db, '1.2343')); v.id = id; v.nome = `Voce ${id}`; v.designazioni = { ...v.designazioni, WNr: wnr, altre: [], ...extra }; db.materiali.push(v); return v; };
  // 1.7075 contro l'alluminio 7075
  let db = copia(); nuova(db, 'finto-7075', '1.7075');
  conErrore(db, 'in collisione con il numero 7075 della voce 7075');
  // due voci con lo stesso W.Nr.
  db = copia(); nuova(db, 'doppio', '1.2343');
  conErrore(db, 'stesso W.Nr. 1.2343');
  // coda di un W.Nr. 2.xxxx (Inconel 2.4668)
  db = copia(); nuova(db, 'finto-4668', '1.4668');
  conErrore(db, 'in collisione con il W.Nr. 2.4668');
  // numero a 4 cifre di un alias o di un nome commerciale
  db = copia(); voceDa(db, '1.2311').alias = [{ alias: '2344', origine: 'produttore', fonti: ['LUC-12311'], prove: [{ fonte: 'LUC-12311', pagina: 1, estratto: 'prova di collisione' }] }];
  voceDa(db, '1.2311').fonti.find((f) => f.id === 'LUC-12311').campi.push('alias');
  conErrore(db, 'in collisione con il numero 2344 della voce 1.2311');
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
