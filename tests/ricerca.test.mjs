// Test della ricerca. Eseguono esattamente il blocco RICERCA di index.html (non una copia) sul DB reale
// e, per le regole sull'ordine e sugli alias, su voci costruite apposta.
// Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { estraiDb, numeriAbbreviati as abbreviatiValidatore } from '../tools/valida-db.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blocco = html.match(/\/\/ RICERCA:INIZIO\n([\s\S]*?)\/\/ RICERCA:FINE/);
assert.ok(blocco, 'blocco RICERCA non trovato in index.html');
const Ricerca = vm.runInNewContext(blocco[1] + '\n;Ricerca', {});
const DB = estraiDb(html);
const copia = () => structuredClone(DB);
const motore = (db = DB) => Ricerca.crea(db);
const ids = (risultati) => risultati.map((r) => r.m.id);
// i risultati nascono in un altro contesto (vm): li ricopio in array normali per confrontarli con assert.deepEqual
const ricopia = (risultati) => Array.from(risultati, (r) => ({ m: r.m, rango: r.rango, motivi: Array.from(r.motivi) }));
const cerca = (testo, db = DB) => ricopia(motore(db).cerca(testo));
const insieme = (lista) => [...lista].sort();
const conTag = (tag, db = DB) => db.materiali.filter((v) => v.tag.some((t) => t.tag === tag)).map((v) => v.id);
const FAMIGLIA = 'famiglia (classificazione dell\'app)';

// ---------------------------------------------------------------- normalizzazione
test('maiuscole, accenti e simboli non contano: «BÖHLER», «bohler», «boehler»', () => {
  const atteso = insieme(['1.2343', '1.2344', '1.2379']);   // BÖHLER W300, W302, K110
  for (const q of ['BÖHLER', 'böhler', 'bohler', 'BOEHLER', 'Boehler']) assert.deepEqual(insieme(ids(cerca(q))), atteso, q);
});

test('«Njørdal» si trova anche con «njordal» e «njoerdal»', () => {
  for (const q of ['Njørdal', 'njordal', 'NJOERDAL']) assert.deepEqual(ids(cerca(q)), ['5083'], q);
});

test('«ti-6al-4v», «Ti 6Al 4V» e «TI6AL4V» trovano lo stesso titanio', () => {
  for (const q of ['ti-6al-4v', 'Ti 6Al 4V', 'TI6AL4V']) assert.deepEqual(ids(cerca(q)), ['ti-6al-4v'], q);
});

// ---------------------------------------------------------------- designazioni
test('designazione esatta al primo posto, con il motivo', () => {
  const casi = [['304', '304', 'designazione AISI/SAE «304»'], ['1.4301', '304', 'designazione W.Nr. «1.4301»'], ['c45e', 'c45e', 'designazione EN «C45E»'],
    ['H13', '1.2344', 'designazione AISI/SAE «H13»'], ['1.4401', '316', 'designazione W.Nr. «1.4401»'], ['2.4668', 'inconel718', 'designazione W.Nr. «2.4668»']];
  for (const [q, id, motivo] of casi) {
    const r = cerca(q);
    assert.equal(r[0].m.id, id, q);
    assert.equal(r[0].rango, Ricerca.CLASSE.DESIG_ESATTA, q);
    assert.deepEqual(r[0].motivi, [motivo], q);
  }
});

test('designazione esatta prima di quella parziale: «C45» trova C45 (EN) e C45E (UNI C45) come designazioni esatte', () => {
  const r = cerca('c45');
  assert.deepEqual(insieme(ids(r).slice(0, 2)), ['c45', 'c45e']);
  assert.ok(r.slice(0, 2).every((x) => x.rango === Ricerca.CLASSE.DESIG_ESATTA));
  assert.ok(r.slice(2).every((x) => x.rango > Ricerca.CLASSE.DESIG_ESATTA));
});

test('una designazione parziale (inizio) si trova ma dopo quella esatta', () => {
  const r = cerca('1.43');
  assert.ok(r.length >= 1);
  assert.ok(r.every((x) => x.rango === Ricerca.CLASSE.DESIG_PARZIALE), JSON.stringify(r.map((x) => [x.m.id, x.rango])));
  assert.ok(r.every((x) => x.motivi[0].startsWith('designazione')));
});

test('più parole: tutte devono trovare qualcosa nella stessa voce', () => {
  assert.deepEqual(ids(cerca('304 inox')), ['304']);
  assert.deepEqual(ids(cerca('304 alluminio')), []);
});

// ---------------------------------------------------------------- ordine: designazione > alias > nome > tag > famiglia
const voce = (id, nome, famiglia, extra = {}) => ({
  id, nome, famiglia, nome_commerciale: extra.nc ?? '', alias: extra.alias ?? [], tag: extra.tag ?? [],
  designazioni: { EN: '', WNr: '', UNI: '', AISI_SAE: '', DIN: '', altre: extra.altre ?? [] }
});
const sintetico = (materiali) => ({ meta: { famiglie: ['Acciai inox', 'Altri'] }, materiali });

test('ordine dei risultati: designazione esatta, alias, nome, tag, famiglia', () => {
  const db = sintetico([
    voce('e', 'Yyy', 'Acciai inox'),
    voce('d', 'Zzz', 'Altri', { tag: [{ tag: 'inox' }] }),
    voce('c', 'Prova inox lega', 'Altri'),
    voce('b', 'Bbb', 'Altri', { alias: [{ alias: 'Inox', origine: 'non da produttore' }] }),
    voce('a', 'Aaa', 'Altri', { altre: ['INOX'] })
  ]);
  const r = cerca('inox', db);
  assert.deepEqual(ids(r), ['a', 'b', 'c', 'd', 'e']);
  const C = Ricerca.CLASSE;
  assert.deepEqual(r.map((x) => x.rango), [C.DESIG_ESATTA, C.ALIAS_ESATTO, C.NOME, C.TAG, C.FAMIGLIA]);
  assert.match(r[1].motivi[0], /alias «Inox» \(alias non da produttore\)/);
  assert.match(r[2].motivi[0], /^nome «Prova inox lega»/);
  assert.match(r[3].motivi[0], /^tag «inox»/);
  assert.deepEqual(r[4].motivi, [FAMIGLIA]);
});

// ---------------------------------------------------------------- tag
const SINGOLE = Object.entries(Ricerca.SINONIMI_TAG).flatMap(([tag, forme]) => forme.filter((s) => !/\s/.test(s)).map((s) => [tag, s]));

test('ogni forma di un tag trova le voci con quel tag verificato e nessun falso positivo', () => {
  for (const [tag, forma] of SINGOLE) {
    const attese = conTag(tag);
    const r = cerca(forma);
    const trovate = ids(r);
    for (const id of attese) assert.ok(trovate.includes(id), `«${forma}» deve trovare ${id} (tag ${tag})`);
    for (const x of r) {
      if (!attese.includes(x.m.id)) {
        // una voce senza il tag può comparire solo per un altro motivo vero (nome, designazione), mai per «tag»
        assert.ok(x.motivi.every((m) => !m.startsWith('tag ')), `«${forma}» ha trovato ${x.m.id} per un tag che non ha`);
        assert.ok(x.motivi.every((m) => /^(nome|designazione|alias|famiglia)/.test(m)), `${x.m.id}: ${x.motivi}`);
      }
    }
  }
});

test('«bonificato» e sinonimi: solo le voci con il tag «da bonifica»', () => {
  const attese = insieme(conTag('da bonifica'));
  assert.ok(attese.length >= 2);
  for (const q of ['bonificato', 'bonifica', 'Bonificati', 'BONIFICATA', 'da bonifica', 'acciaio da bonifica', 'acciai bonificati']) {
    assert.deepEqual(insieme(ids(cerca(q))), attese, q);
  }
});

test('«da tempra» è un tag separato da «da bonifica»', () => {
  const tempra = insieme(conTag('da tempra'));
  const bonifica = insieme(conTag('da bonifica'));
  assert.ok(tempra.length >= 3);
  assert.deepEqual(tempra.filter((id) => bonifica.includes(id)), [], 'nessuna voce ha entrambi i tag nel DB reale');
  for (const q of ['tempra', 'temprato', 'temprata', 'temprabile', 'da tempra', 'acciaio temprato']) assert.deepEqual(insieme(ids(cerca(q))), tempra, q);
  for (const q of ['bonificato', 'bonifica']) for (const id of tempra) assert.ok(!ids(cerca(q)).includes(id), `${q} non deve trovare ${id}`);
  for (const id of bonifica) assert.ok(!ids(cerca('temprato')).includes(id), `temprato non deve trovare ${id}`);
  assert.ok(!Object.values(Ricerca.SINONIMI_TAG['da tempra']).some((s) => /bonific/.test(s)), '«bonifica» non è un sinonimo di «da tempra»');
});

test('gli altri tag: ogni parola trova solo le voci con quel tag', () => {
  const casi = { cementato: 'da cementazione', cementazione: 'da cementazione', cuscinetti: 'per cuscinetti', automatico: 'automatico',
    precipitazione: 'indurente per precipitazione', austenitico: 'austenitico', strutturale: 'da costruzione' };
  for (const [q, tag] of Object.entries(casi)) {
    const attese = insieme(conTag(tag));
    assert.ok(attese.length >= 1, tag);
    assert.deepEqual(insieme(ids(cerca(q))), attese, q);
  }
});

test('frasi con più parole: «utensili a caldo», «utensili a freddo», «per cuscinetti»', () => {
  assert.deepEqual(insieme(ids(cerca('utensili a caldo'))), insieme(conTag('per utensili a caldo')));
  assert.deepEqual(insieme(ids(cerca('utensili a freddo'))), insieme(conTag('per utensili a freddo')));
  assert.deepEqual(insieme(ids(cerca('per cuscinetti'))), insieme(conTag('per cuscinetti')));
  assert.deepEqual(insieme(ids(cerca('hot work'))), insieme(conTag('per utensili a caldo')));
});

test('senza il tag verificato la voce non si trova più (nessuna deduzione dal nome o dalla famiglia)', () => {
  const db = copia();
  for (const v of db.materiali) v.tag = v.tag.filter((t) => t.tag !== 'da bonifica');
  for (const q of ['bonificato', 'bonifica', 'acciaio da bonifica', 'Acciai da bonifica']) assert.deepEqual(ids(cerca(q, db)), [], q);
  // e un tag tolto da una sola voce toglie solo quella
  const db2 = copia();
  db2.materiali.find((v) => v.id === 'c45e').tag = [];
  assert.deepEqual(insieme(ids(cerca('bonificato', db2))), insieme(conTag('da bonifica').filter((id) => id !== 'c45e')));
});

test('i nomi delle famiglie di trattamento non sono testo cercabile', () => {
  const db = sintetico([voce('x', 'Qwerty', 'Acciai inox'), voce('y', 'Asdfgh', 'Altri')]);
  db.meta.famiglie = ['Acciai da bonifica', 'Acciai per utensili', 'Altri'];
  db.materiali[0].famiglia = 'Acciai da bonifica';
  db.materiali[1].famiglia = 'Acciai per utensili';
  for (const q of ['bonifica', 'bonificato', 'da bonifica', 'utensili', 'Acciai per utensili', 'acciai da bonifica']) assert.deepEqual(ids(cerca(q, db)), [], q);
  // per i nomi neutri vale solo la mappa dei nomi neutri: «acciaio» trova entrambe le famiglie di acciaio
  assert.deepEqual(insieme(ids(cerca('acciaio', db))), ['x', 'y']);
  assert.ok(!Object.keys(Ricerca.FAMIGLIE_NEUTRE).some((k) => /bonific|utensil|tempr|cement/.test(k)));
});

// ---------------------------------------------------------------- nomi neutri delle famiglie
test('«acciaio»: tutte le voci di acciaio, quelle senza la parola nel nome per «famiglia», in coda', () => {
  const r = cerca('acciaio');
  const acciai = DB.materiali.filter((v) => /^Acciai/.test(v.famiglia)).map((v) => v.id);
  assert.deepEqual(insieme(ids(r)), insieme(acciai));
  for (const x of r) {
    if (/acciaio/i.test(x.m.nome)) assert.equal(x.rango, Ricerca.CLASSE.NOME, x.m.id);
    else { assert.equal(x.rango, Ricerca.CLASSE.FAMIGLIA, x.m.id); assert.deepEqual(x.motivi, [FAMIGLIA], x.m.id); }
  }
  // priorità bassa: nessuna voce trovata per famiglia compare prima di una trovata per nome
  const ranghi = r.map((x) => x.rango);
  assert.deepEqual(ranghi, [...ranghi].sort((a, b) => a - b));
  assert.deepEqual(ids(cerca('acciai')).sort(), ids(r).sort());
  assert.deepEqual(r.find((x) => x.m.id === 'c45e').motivi, [FAMIGLIA]);
});

test('nomi neutri: alluminio, rame, ottone, titanio, inox, stagno trovano le voci della famiglia', () => {
  const famiglia = (...nomi) => DB.materiali.filter((v) => nomi.includes(v.famiglia)).map((v) => v.id);
  assert.deepEqual(insieme(ids(cerca('alluminio'))), insieme(famiglia('Alluminio e leghe')));
  assert.deepEqual(insieme(ids(cerca('titanio'))), insieme(famiglia('Titanio')));
  assert.deepEqual(insieme(ids(cerca('stagno'))), insieme(famiglia('Stagno')));
  assert.deepEqual(insieme(ids(cerca('inox'))), insieme(famiglia('Acciai inox')));
  for (const q of ['rame', 'ottone']) assert.deepEqual(insieme(ids(cerca(q))), insieme(famiglia('Rame, ottone, bronzo')), q);
});

test('«rame» e «ottone»: la voce con la parola nel nome prima, le altre di famiglia dopo', () => {
  let r = cerca('ottone');
  assert.deepEqual(ids(r), ['cuzn39pb3', 'cu-etp']);
  assert.match(r[0].motivi[0], /^nome «Ottone CuZn39Pb3/);
  assert.deepEqual(r[1].motivi, [FAMIGLIA]);
  r = cerca('rame');
  assert.deepEqual(ids(r), ['cu-etp', 'cuzn39pb3']);
  assert.deepEqual(r[1].motivi, [FAMIGLIA]);
});

test('i nomi neutri non trovano voci di altre famiglie', () => {
  for (const q of ['alluminio', 'titanio']) for (const x of cerca(q)) assert.ok(!/acciai|rame/i.test(x.m.famiglia), q);
  assert.ok(!ids(cerca('rame')).includes('sn'));
  assert.ok(!ids(cerca('acciaio')).includes('inconel718'));
});

// ---------------------------------------------------------------- alias
const conErgal = (origine = 'non da produttore') => {
  const db = copia();
  db.materiali.find((v) => v.id === '7075').alias = [{ alias: 'Ergal', origine, fonti: [], prove: [] }];
  return db;
};

test('alias: «ergal» trova solo la voce con quell\'alias, con la dicitura «alias non da produttore»', () => {
  const db = conErgal();
  for (const q of ['ergal', 'ERGAL', 'Ergal']) {
    const r = cerca(q, db);
    assert.deepEqual(ids(r), ['7075'], q);
    assert.equal(r[0].rango, Ricerca.CLASSE.ALIAS_ESATTO);
    assert.deepEqual(r[0].motivi, ['alias «Ergal» (alias non da produttore)']);
  }
  assert.deepEqual(ids(cerca('erg', db)), ['7075']);
  assert.equal(cerca('erg', db)[0].rango, Ricerca.CLASSE.ALIAS_PARZIALE);
  assert.deepEqual(ids(cerca('ergal 7075', db)), ['7075']);
  assert.deepEqual(ids(cerca('ergal 6082', db)), []);
});

test('alias da produttore: dicitura diversa; senza l\'alias nel DB «ergal» non trova nulla', () => {
  assert.deepEqual(cerca('ergal', conErgal('produttore'))[0].motivi, ['alias «Ergal» (alias da produttore)']);
  const senza = copia();
  for (const v of senza.materiali) v.alias = [];
  assert.deepEqual(ids(cerca('ergal', senza)), []);
});

test('ogni alias del DB reale si trova con il proprio nome, al primo posto per quella voce', () => {
  for (const v of DB.materiali) for (const a of v.alias) {
    const r = cerca(a.alias);
    assert.equal(r[0].m.id, v.id, a.alias);
    assert.ok(r[0].motivi.some((m) => m.startsWith(`alias «${a.alias}»`)), a.alias);
  }
});

// ---------------------------------------------------------------- nessun falso positivo, elenco vuoto
test('testi privi di senso, vicini ma sbagliati o solo parole vuote: nessun risultato', () => {
  for (const q of ['xyzzy', 'bonificatoo', 'temprat0', 'cementat', 'qwerty', 'da di', 'ergal']) {
    if (q === 'ergal' && DB.materiali.some((v) => v.alias.some((a) => /ergal/i.test(a.alias)))) continue;
    assert.deepEqual(ids(cerca(q)), [], q);
  }
});

test('testo vuoto: tutte le voci, senza motivi', () => {
  for (const q of ['', '   ', null, undefined]) {
    const r = cerca(q);
    assert.equal(r.length, DB.materiali.length);
    assert.ok(r.every((x) => x.motivi.length === 0));
  }
});

// ---------------------------------------------------------------- raggruppamento
test('raggruppa: famiglie senza risultati nascoste, prima quella col risultato migliore', () => {
  const m = motore();
  const gruppi = (testo) => Array.from(m.raggruppa(m.cerca(testo)), (x) => ({ famiglia: x.famiglia, voci: Array.from(x.voci) }));
  const famiglieTag = (tag) => DB.meta.famiglie.filter((f) => DB.materiali.some((v) => v.famiglia === f && v.tag.some((t) => t.tag === tag)));
  assert.deepEqual(gruppi('bonificato').map((g) => g.famiglia), famiglieTag('da bonifica'));   // stessa priorità: ordine del DB
  const g = gruppi('acciaio');
  assert.ok(g.every((x) => x.voci.length > 0));
  assert.equal(g[0].famiglia, 'Acciai per utensili', 'le voci con «acciaio» nel nome (priorità maggiore) vengono prima');
  assert.ok(!g.map((x) => x.famiglia).includes('Ghise'));
  const tutte = gruppi('');
  assert.deepEqual(tutte.map((x) => x.famiglia), DB.meta.famiglie.filter((f) => DB.materiali.some((v) => v.famiglia === f)));
});

// ---------------------------------------------------------------- Fase 2c: sinonimi dell'app, numero abbreviato, alias con una sola fonte
const SIN = 'sinonimo dell\'app';
const ABB = 'numero abbreviato (regola dell\'app)';

test('«ferro» e «acciaio dolce» trovano S235JR e solo quello, con «sinonimo dell\'app»', () => {
  for (const q of ['ferro', 'Ferro', 'FERRO', 'acciaio dolce', 'Acciaio Dolce']) {
    const r = cerca(q);
    assert.deepEqual(ids(r), ['s235jr'], q);
    assert.deepEqual(r[0].motivi, [SIN], q);
    assert.equal(r[0].rango, Ricerca.CLASSE.SINONIMO, q);
  }
  for (const q of ['dolce', 'ferrosa', 'acciaio dolci', 'ferro dolce']) assert.deepEqual(ids(cerca(q)), [], q);
});

test('i sinonimi non creano risultati se la voce non c\'è; la famiglia «Ferro» resta nascosta', () => {
  const db = copia(); db.materiali = db.materiali.filter((v) => v.id !== 's235jr');
  assert.deepEqual(ids(cerca('ferro', db)), []);
  assert.deepEqual(ids(cerca('acciaio dolce', db)), []);
  const g = Array.from(motore().raggruppa(motore().cerca('ferro')), (x) => x.famiglia);
  assert.deepEqual(g, ['Acciai al carbonio']);
  assert.ok(!Array.from(motore().raggruppa(motore().cerca('')), (x) => x.famiglia).includes('Ferro'));
  assert.ok(!('ferro' in Ricerca.FAMIGLIE_NEUTRE), '«ferro» non è un nome neutro di famiglia: è un sinonimo di una voce');
});

test('«acciaio» continua a trovare S235JR, per famiglia', () => {
  const r = cerca('acciaio').find((x) => x.m.id === 's235jr');
  assert.deepEqual(r.motivi, [FAMIGLIA]);
});

test('numero abbreviato: 4 cifre uguali al W.Nr. senza «1.», risultato unico, con la precedenza sul nome', () => {
  for (const q of ['2343', '2311', '2379', '4462']) {
    const r = cerca(q);
    const id = { 2343: '1.2343', 2311: '1.2311', 2379: '1.2379', 4462: '1.4462' }[q];
    assert.deepEqual(ids(r), [id], q);
    assert.deepEqual(r[0].motivi, [ABB], `${q}: il motivo è il numero abbreviato anche se il nome contiene «1.${q}»`);
    assert.equal(r[0].rango, Ricerca.CLASSE.NUMERO_ABBREVIATO, q);
  }
  assert.ok(Ricerca.CLASSE.NUMERO_ABBREVIATO < Ricerca.CLASSE.NOME && Ricerca.CLASSE.NUMERO_ABBREVIATO > Ricerca.CLASSE.ALIAS_PARZIALE);
});

test('numero abbreviato: vale per ogni W.Nr. 1.xxxx del DB e per nient\'altro', () => {
  const wnr = DB.materiali.filter((v) => /^1\.\d{4}$/.test(v.designazioni.WNr));
  assert.ok(wnr.length >= 17);
  for (const v of wnr) {
    const q = v.designazioni.WNr.slice(2);
    const r = cerca(q);
    assert.deepEqual(ids(r), [v.id], `${q} → ${v.id}`);
    assert.deepEqual(r[0].motivi, [ABB], q);
  }
  // non per il W.Nr. 2.4668 dell'Inconel (la regola riguarda solo 1.xxxx), non con il punto, non con più o meno di 4 cifre, non con altre parole
  assert.deepEqual(ids(cerca('4668')), []);
  assert.deepEqual(cerca('1.2343')[0].motivi, ['designazione W.Nr. «1.2343»']);
  assert.ok(!cerca('12343').some((x) => x.motivi.includes(ABB)));
  assert.ok(!cerca('234').some((x) => x.motivi.includes(ABB)));
  assert.ok(!cerca('2343 acciaio').some((x) => x.motivi.includes(ABB)));
});

test('«6511» e le corrispondenze indicative non portano al 39NiCrMo3', () => {
  assert.deepEqual(ids(cerca('6511')), []);
  assert.deepEqual(ids(cerca('1.6511')), []);
  assert.deepEqual(ids(cerca('36CrNiMo4')), []);
  assert.deepEqual(ids(cerca('6510')), ['39nicrmo3'], '1.6510 è il W.Nr. della voce');
  assert.deepEqual(ids(cerca('9840')), ['39nicrmo3'], 'AISI/SAE 9840 è nella tabella Lucefin senza parentesi');
});

test('numero abbreviato: se c\'è una collisione non vale (1.7075 contro l\'alluminio 7075); stessa regola del validatore', () => {
  const db = copia();
  const finto = structuredClone(db.materiali.find((v) => v.id === '1.2343'));
  finto.id = 'finto-7075'; finto.nome = 'Finto acciaio'; finto.designazioni = { EN: '', WNr: '1.7075', UNI: '', AISI_SAE: '', DIN: '', altre: [] }; finto.alias = []; finto.tag = [];
  db.materiali.push(finto);
  const r = cerca('7075', db);
  assert.deepEqual(ids(r), ['7075'], 'resta solo l\'alluminio, per designazione esatta');
  assert.equal(r[0].rango, Ricerca.CLASSE.DESIG_ESATTA);
  // stesso W.Nr. su due voci (S235JR e una sua copia: nessun altro numero a 4 cifre da solo nei loro testi)
  const db2 = copia(); const doppio = structuredClone(db2.materiali.find((v) => v.id === 's235jr')); doppio.id = 'doppio'; doppio.nome = 'Doppio'; db2.materiali.push(doppio);
  assert.ok(!cerca('0038', db2).some((x) => x.motivi.includes(ABB)), 'due voci con 1.0038: «0038» è ambiguo');
  // coda di un W.Nr. di un'altra famiglia: 1.4668 contro l'Inconel 2.4668
  const db3 = copia(); const finto2 = structuredClone(db3.materiali.find((v) => v.id === 's235jr')); finto2.id = 'finto-4668'; finto2.nome = 'Finto 4668'; finto2.designazioni = { EN: '', WNr: '1.4668', UNI: '', AISI_SAE: '', DIN: '', altre: [] }; db3.materiali.push(finto2);
  assert.ok(!cerca('4668', db3).some((x) => x.motivi.includes(ABB)), '1.4668 contro il 2.4668 dell\'Inconel: ambiguo');
  // la mappa del validatore e quella della ricerca coincidono, anche nei casi con collisione
  for (const d of [DB, db, db2, db3]) assert.deepEqual({ ...Ricerca.numeriAbbreviati(d) }, abbreviatiValidatore(d).mappa);
});

test('alias KORV e NCM2: anche in minuscolo, con «una sola fonte»', () => {
  for (const [q, id, alias] of [['korv', '1.2379', 'KORV'], ['KORV', '1.2379', 'KORV'], ['Korv', '1.2379', 'KORV'], ['ncm2', '39nicrmo3', 'NCM2'], ['NCM2', '39nicrmo3', 'NCM2'], ['Ncm2', '39nicrmo3', 'NCM2']]) {
    const r = cerca(q);
    assert.deepEqual(ids(r), [id], q);
    assert.deepEqual(r[0].motivi, [`alias «${alias}» (alias non da produttore, una sola fonte)`], q);
    assert.equal(r[0].rango, Ricerca.CLASSE.ALIAS_ESATTO);
  }
  assert.deepEqual(cerca('ergal')[0].motivi, ['alias «Ergal» (alias non da produttore)'], 'Ergal ha due fonti indipendenti: nessuna dicitura «una sola fonte»');
  assert.deepEqual(ids(cerca('ncm')), ['39nicrmo3'], 'inizio dell\'alias');
  assert.deepEqual(ids(cerca('kor')), ['1.2379']);
});

test('«bonificato» trova il 39NiCrMo3 e il 1.2311 dal tag; «temprato» trova il 1.2343 dal tag «da tempra»', () => {
  const b = ids(cerca('bonificato'));
  for (const id of ['39nicrmo3', '1.2311', 'c45', 'c45e', '42crmo4']) assert.ok(b.includes(id), id);
  assert.ok(!b.includes('1.2343'));
  const t = cerca('temprato');
  assert.ok(ids(t).includes('1.2343'));
  assert.ok(t.every((x) => x.motivi.every((m) => m.startsWith('tag «da tempra»'))));
  assert.ok(!ids(t).includes('1.2311'), '1.2311 è «da bonifica», non «da tempra»');
});

test('«duplex» e «inox duplex» trovano il 1.4462 dal tag; «acciaio inox» non lo scambia per austenitico', () => {
  assert.deepEqual(ids(cerca('duplex')), ['1.4462']);
  assert.deepEqual(ids(cerca('inox duplex')), ['1.4462']);
  assert.ok(!ids(cerca('austenitico')).includes('1.4462'));
});

test('gli esempi del segnaposto del campo di ricerca trovano tutti qualcosa', () => {
  const ph = html.match(/placeholder="([^"]*)"/)[1];
  const esempi = ph.split(',').map((x) => x.replace('…', '').trim()).filter(Boolean);
  assert.ok(esempi.length >= 4, ph);
  for (const q of esempi) assert.ok(cerca(q).length > 0, `«${q}» non trova nulla`);
});

// ---------------------------------------------------------------- etichetta delle designazioni senza colonna propria
test('«trovato per»: le designazioni senza colonna propria si chiamano «altra designazione», le altre «designazione EN/W.Nr./…»', () => {
  const uns = cerca('S30400');
  assert.deepEqual(ids(uns), ['304']);
  assert.deepEqual(uns[0].motivi, ['altra designazione «UNS S30400»']);
  assert.deepEqual(cerca('1.2343')[0].motivi, ['designazione W.Nr. «1.2343»']);
  assert.deepEqual(cerca('H11')[0].motivi, ['designazione AISI/SAE «H11»']);
  // anche per le corrispondenze parziali (inizio della designazione)
  assert.deepEqual(cerca('S3040')[0].motivi, ['altra designazione «UNS S30400»']);
  // nessuna forma «designazione altra» in nessun risultato: si cercano tutte le designazioni «altre» del database
  for (const v of DB.materiali) for (const a of v.designazioni.altre) {
    for (const x of cerca(a)) assert.ok(x.motivi.every((m) => !/designazione altra/.test(m)), `«${a}» → ${x.motivi}`);
    const suo = cerca(a).find((x) => x.m.id === v.id);
    assert.ok(suo && suo.motivi.some((m) => /designazione/.test(m) || /^nome|^tag|^alias|^famiglia|^numero|^sinonimo/.test(m)), `${a} non trova ${v.id}`);
  }
});

// ---------------------------------------------------------------- parole di un solo carattere e letture unite (app 0.2.5)
const rid = (risultati) => risultati.map((r) => r.m.id + ':' + r.rango);   // «id:rango» nell'ordine restituito
const nomiConLettera = (l) => DB.materiali.filter((v) => Ricerca.pulisci(v.nome).includes(l)).length;
const digitata = (testo, db = DB) => ricopia(motore(db).cercaDigitata(testo));   // solo la lettura digitata (senza le letture unite)
const spazia = (s) => String(s).replace(/([A-Za-z])(?=[0-9])|([0-9])(?=[A-Za-z])/g, '$1$2 ').replace(/\s+/g, ' ').trim();   // «C45E» → «C 45 E»
const staccaUltima = (s) => String(s).replace(/(\d)([A-Za-z])(?![A-Za-z0-9])/g, '$1 $2');                                  // «C45E» → «C45 E», «316L» → «316 L»
const valoriDi = (m) => { const d = m.designazioni; return [m.nome, d.EN, d.WNr, d.UNI, d.AISI_SAE, d.DIN].concat(d.altre || [], (m.alias || []).map((a) => a.alias), String(m.nome_commerciale || '').split(';').map((x) => x.trim())).filter(Boolean); };
// corpus derivato dal DB: ogni valore cercabile con la sua voce d'origine, come scritto e con gli spazi
const corpusDerivato = () => {
  const out = [];
  for (const m of DB.materiali) for (const v of new Set(valoriDi(m))) for (const q of new Set([v, spazia(v), staccaUltima(v)])) out.push({ q, origine: m.id });
  return out;
};
// query in linguaggio naturale, senza parole di un solo carattere
const NATURALI = ['utensili a caldo', 'utensili a freddo', 'per cuscinetti', 'acciaio da bonifica', 'bonificato e temprato', 'inox', 'hot work', 'ferro', 'acciaio dolce',
  'ergal', 'korv', 'ncm2', 'titanio grado 2', 'titanio 5', 'grado 5', 'titanio 2', 'ottone', 'rame', 'stagno', 'alluminio 7075', 'acciai al carbonio', 'acciaio per utensili',
  'inox 304', 'tubo inox', 'la lega', 'il ferro', '1.4301', '4301', 'boehler', 'c45e'];

test('una lettera sola: mai sottostringa del nome, solo prefisso di designazioni e alias (il motivo della regola t.length >= 2)', () => {
  // la premessa: una lettera compare in quasi tutti i nomi, quindi una ricerca per sottostringa darebbe quasi tutto il database
  assert.ok(nomiConLettera('n') >= 15 && nomiConLettera('o') >= 15, `la «n» e la «o» compaiono in almeno 15 nomi su ${DB.materiali.length}`);
  for (const l of 'abcdefghijklmnopqrstuvwxyz') {
    for (const r of cerca(l)) assert.ok(r.motivi.every((m) => !/^nome/.test(m)), `«${l}»: ${r.m.nome} trovato per nome (${r.motivi})`);
  }
  assert.ok(ids(cerca('n')).length <= 5 && ids(cerca('o')).length <= 5, 'una lettera sola dà pochi risultati, non tutto il database');
  for (const l of ['a', 'e', 'i']) assert.deepEqual(ids(cerca(l)), [], `«${l}» è una parola vuota`);
});

test('una lettera sola vale come parola INTERA del nome («Lega B» trova «Lega prova B»); una cifra sola no', () => {
  const db = sintetico([voce('lega-b', 'Lega prova B', 'Altri'), voce('lega-2', 'Lega 2', 'Altri'), voce('altra', 'Altra lega', 'Altri')]);
  for (const q of ['Lega prova B', 'Lega B', 'prova B', 'lega b prova', 'B']) assert.deepEqual(rid(cerca(q, db)), ['lega-b:6'], q);
  assert.deepEqual(ids(cerca('Lega C', db)), [], 'una lettera che non è una parola del nome non trova nulla');
  // una cifra sola non vale come parola intera del nome: «Lega 2» si trova con le parole unite («Lega2»), non con la sola lettura digitata
  assert.deepEqual(ids(digitata('Lega 2', db)), []);
  assert.deepEqual(ids(cerca('Lega 2', db)), ['lega-2']);
});

test('letture unite: «C 45» come «C45»; «C45 E» e «C 45 E» mettono C45E per primo', () => {
  assert.deepEqual(rid(cerca('C 45')), rid(cerca('C45')));
  assert.deepEqual(insieme(rid(cerca('C 45'))), ['c45:1', 'c45e:1']);
  assert.deepEqual(rid(cerca('C45 E')), ['c45e:1', 'c45:1']);
  assert.deepEqual(rid(cerca('C 45 E')), ['c45e:1', 'c45:3']);
});

test('letture unite: designazioni e alias scritti con gli spazi trovano la voce giusta', () => {
  const casi = [['S 235 J R', ['s235jr:1']], ['100 Cr 6', ['100cr6:1']], ['AFNOR XC 48', ['c45e:1']], ['NCM 2', ['39nicrmo3:2']], ['Ti 6 Al 4 V', ['ti-6al-4v:6']], ['S 355 J 2', ['s355j2:1']]];
  for (const [q, atteso] of casi) assert.deepEqual(rid(cerca(q)), atteso, q);
  assert.equal(rid(cerca('D 2'))[0], '1.2379:1', 'D 2');
});

test('ogni valore del DB, come scritto e con gli spazi, ritrova la propria voce', () => {
  const corpus = corpusDerivato();
  const falliti = corpus.filter((c) => !ids(cerca(c.q)).includes(c.origine)).map((c) => `«${c.q}» → ${c.origine}`);
  assert.ok(corpus.length >= 250, `${corpus.length} query nel corpus`);
  assert.deepEqual(falliti, []);
});

test('nessuna voce sparisce e nessun rango peggiora rispetto alla sola lettura digitata (corpus del DB e query naturali)', () => {
  for (const q of [...corpusDerivato().map((c) => c.q), ...NATURALI]) {
    const tutte = new Map(cerca(q).map((r) => [r.m.id, r.rango]));
    for (const r of digitata(q)) assert.ok(tutte.has(r.m.id) && tutte.get(r.m.id) <= r.rango, `«${q}»: ${r.m.id} (rango ${r.rango}) ${tutte.has(r.m.id) ? 'peggiora a ' + tutte.get(r.m.id) : 'sparisce'}`);
  }
});

test('le query senza parole di un solo carattere non cambiano con le letture unite', () => {
  for (const q of NATURALI) assert.deepEqual(rid(cerca(q)), rid(digitata(q)), q);
});

test('le letture unite non usano tag, famiglie, sinonimi né numero abbreviato (valgono solo digitati)', () => {
  assert.deepEqual(ids(cerca('b o n i f i c a t o')), []);        // «bonificato» è un tag: lo usa solo la lettura digitata
  assert.ok(ids(cerca('bonificato')).length > 0);
  assert.deepEqual(ids(cerca('f e r r o')), []);                  // il sinonimo «ferro» → S235JR vale solo digitato
  assert.deepEqual(ids(cerca('r a m e')), ['cu-etp']);            // trovata per nome; la famiglia «Rame, ottone, bronzo» non vale nelle letture unite
  assert.deepEqual(rid(cerca('43 01')), ['304:6']);               // il numero abbreviato vale solo se la ricerca è esattamente 4 cifre digitate
  assert.deepEqual(rid(cerca('4301')), ['304:5']);
});

test('senza 316L e 304L nel DB: «inox 316 L», «316 L», «304 L» restano a 0 risultati e non ricadono su Inox 316 o Inox 304', () => {
  assert.ok(!DB.materiali.some((v) => /\b(316|304) ?L\b/i.test(JSON.stringify([v.nome, v.designazioni, v.alias]))), 'premessa: il DB non ha 316L né 304L');
  assert.ok(DB.materiali.some((v) => v.id === '316') && DB.materiali.some((v) => v.id === '304'), 'premessa: Inox 316 e Inox 304 ci sono');
  for (const q of ['inox 316 L', '316 L', '316L', 'inox 316L', 'AISI 316 L', '304 L', '304L', 'inox 304 L', 'inox 304L', 'Inox 316 l', '316  L']) assert.deepEqual(rid(cerca(q)), [], q);
});

test('con una voce 316L: «inox 316 L» e «316 L» trovano solo la 316L, «316» trova Inox 316 e poi la 316L', () => {
  const db = copia();
  const v = structuredClone(db.materiali.find((x) => x.id === '316'));
  v.id = '316l'; v.nome = 'Inox 316L (1.4404)'; v.designazioni = { ...v.designazioni, WNr: '1.4404', AISI_SAE: '316L', altre: [] }; v.alias = [];
  db.materiali.push(v);
  for (const q of ['inox 316 L', '316 L', '316L', 'inox 316L']) assert.deepEqual(rid(cerca(q, db)), ['316l:1'], q);
  assert.deepEqual(rid(cerca('inox 316', db)), ['316:1', '316l:3']);
  assert.deepEqual(rid(cerca('316', db)), ['316:1', '316l:3']);
});

test('letture unite: una parola di un carattere si attacca anche se le altre parole non seguono l\'ordine del nome', () => {
  const db = sintetico([voce('x1', 'Barra C45E extra', 'Altri'), voce('x2', 'Barra C45 extra', 'Altri'), voce('x3', 'Extra C45', 'Altri')]);
  assert.deepEqual(ids(digitata('C 45 extra', db)), [], 'premessa: la sola lettura digitata non trova nulla');
  assert.deepEqual(insieme(ids(cerca('C 45 extra', db))), ['x1', 'x2', 'x3']);
});

test('letture unite: la «e» dopo una cifra si attacca («ypsilon C45 E» mette prima la voce con C45E)', () => {
  const db = sintetico([voce('y1', 'Barra C45E ypsilon', 'Altri'), voce('y2', 'Barra C45 ypsilon', 'Altri')]);
  assert.deepEqual(rid(digitata('ypsilon C45 E', db)), ['y2:6', 'y1:6']);   // la sola lettura digitata: la «e» è una parola vuota, vince l'ordine alfabetico
  assert.deepEqual(rid(cerca('ypsilon C45 E', db)), ['y1:6', 'y2:6']);
});

test('i gruppi di famiglia seguono la stessa parità: «C45 E» mostra prima C45E (Acciai da bonifica) di C45 (Acciai al carbonio)', () => {
  const R = motore();
  const gruppi = Array.from(R.raggruppa(R.cerca('C45 E')), (g) => ({ famiglia: g.famiglia, voci: Array.from(g.voci, (x) => x.m.id) }));
  assert.deepEqual(gruppi, [{ famiglia: 'Acciai da bonifica', voci: ['c45e'] }, { famiglia: 'Acciai al carbonio', voci: ['c45'] }]);
  // senza letture unite a parità di rango vale l'ordine delle famiglie del DB
  const g2 = Array.from(R.raggruppa(R.cercaDigitata('C45 E')), (g) => g.famiglia);
  assert.deepEqual(g2, ['Acciai al carbonio', 'Acciai da bonifica']);
});
