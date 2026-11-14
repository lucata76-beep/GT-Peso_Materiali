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
