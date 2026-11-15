// La documentazione non deve raccontare cose diverse dal codice: versioni, indice e affermazioni del README, collegamenti interni, impronta della v4,
// checklist iPhone che riporta solo gli esiti comunicati, cartelle e file che i documenti dicono presenti o assenti.
// Esecuzione: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { estraiDb } from '../tools/valida-db.mjs';

const radice = new URL('../', import.meta.url);
const leggi = (p) => readFileSync(new URL(p, radice), 'utf8');
const html = leggi('index.html');
const db = estraiDb(html);
const APP = (html.match(/const APP_VERSIONE = '([^']+)';/) || [])[1];
const DICITURA = (html.match(/const DICITURA_TEORICO = '([^']+)';/) || [])[1];
const readme = leggi('README.md');

test('il README dichiara la versione dell\'app, la versione e la data del database e il numero di materiali del codice', () => {
  assert.ok(APP, 'costante APP_VERSIONE non trovata');
  assert.ok(readme.includes(`**App ${APP} · Database v${db.meta.versione} (${db.meta.data}), ${db.materiali.length} materiali.**`),
    `README: la riga di stato deve essere «App ${APP} · Database v${db.meta.versione} (${db.meta.data}), ${db.materiali.length} materiali.»`);
  assert.equal((readme.match(/App \d+\.\d+\.\d+/g) || []).length, 1, 'una sola versione dell\'app nel README');
});

test('il README ha i nove capitoli dell\'indice, nell\'ordine, e ogni voce dell\'indice punta a un capitolo che esiste', () => {
  const titoli = ['1. Cos\'è l\'app', '2. Uso', '3. Struttura del repository e blocchi di index.html', '4. Validatore e test', '5. Regole del database e delle fonti',
    '6. Versioni dell\'app e del database', '7. GitHub Pages', '8. Limiti', '9. «Peso teorico»: la dicitura'];
  const trovati = readme.split('\n').filter((r) => /^## \d+\./.test(r)).map((r) => r.slice(3));
  assert.deepEqual(trovati, titoli);
  const indice = readme.split('\n').filter((r) => /^\d+\. \[/.test(r));
  assert.equal(indice.length, 9);
  indice.forEach((r, i) => assert.ok(r.startsWith(`${i + 1}. [${titoli[i].replace(/^\d+\. /, '')}](#`), `voce ${i + 1} dell'indice: ${r}`));
  // l'àncora di GitHub: minuscole, spazi in trattini, senza punteggiatura (l'apostrofo, i due punti e le virgolette caporali spariscono)
  const ancora = (t) => t.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-');
  indice.forEach((r, i) => assert.ok(r.includes(`(#${ancora(titoli[i])})`), `àncora della voce ${i + 1}: attesa #${ancora(titoli[i])} in «${r}»`));
});

test('il README sui sorgenti dice il vero: nessuno script di assemblaggio né build, i blocchi marcati ci sono, APP_VERSIONE sta fuori dai blocchi', () => {
  for (const f of ['ui.js', 'ui.css', 'ui.body.html', 'package.json', '.github', 'build', 'Makefile']) assert.ok(!existsSync(new URL(f, radice)), `${f} esiste: il README dice che non c'è nessuna build`);
  assert.match(readme, /\*\*Non esiste nessuno script di assemblaggio né una build\*\*/);
  for (const m of ['DB:INIZIO', 'DB:FINE']) assert.ok(html.includes(m), m);
  for (const b of ['ENGINE', 'RICERCA', 'SCHEDE', 'ESPORTA']) {
    assert.ok(html.includes(`// ${b}:INIZIO\n`) && html.includes(`// ${b}:FINE\n`), `blocco ${b}`);
    assert.ok(readme.includes(`// ${b}:INIZIO … ${b}:FINE`), `il README descrive il blocco ${b}`);
  }
  const posVersione = html.indexOf('const APP_VERSIONE');
  const ultimoFine = Math.max(...['ENGINE', 'RICERCA', 'SCHEDE', 'ESPORTA'].map((b) => html.indexOf(`// ${b}:FINE`)));
  assert.ok(posVersione > ultimoFine, 'APP_VERSIONE è dopo l\'ultimo blocco marcato');
  assert.equal(html.slice(0, posVersione).split('<script>').length - 1, 2, 'APP_VERSIONE è nel secondo <script> classico (l\'interfaccia)');
  assert.match(readme, /\*\*fuori da ogni blocco marcato\*\*/);
  // il generatore del DB non scrive in index.html
  assert.ok(!leggi('tools/costruisci_db.py').includes('index.html'));
});

test('GitHub Pages nel README: solo l\'indirizzo, la radice di main e il dominio github.io', () => {
  const cap = readme.split('## 7. GitHub Pages\n')[1].split('\n## 8.')[0];
  assert.ok(cap.includes('**https://lucata76-beep.github.io/GT-Peso_Materiali/**'));
  assert.match(cap, /\*\*radice del ramo `main`\*\*/);
  assert.match(cap, /dominio `github\.io`/);
  assert.equal((cap.match(/https?:\/\//g) || []).length, 1, 'un solo indirizzo nel capitolo');
});

test('jsPDF non c\'è più: né vendor/, né un riferimento nel README o nel codice', () => {
  assert.ok(!existsSync(new URL('vendor/', radice)), 'la cartella vendor/ non deve esistere');
  assert.doesNotMatch(readme, /jsPDF/i);
  assert.doesNotMatch(readme, /\| `vendor\/` \|/);
  assert.doesNotMatch(html, /jspdf/i);
  assert.match(leggi('docs/esportazione.md'), /jsPDF e la cartella `vendor\/` sono stati tolti nella 0\.4\.0/);
});

test('la dicitura «peso teorico» è identica nel README, in docs/esportazione.md e nel codice', () => {
  assert.equal(DICITURA, 'Peso teorico: densità nominale, spigoli vivi, nessuna tolleranza.');
  assert.ok(readme.includes(`> **${DICITURA}**`), 'README');
  assert.ok(leggi('docs/esportazione.md').includes(DICITURA), 'docs/esportazione.md');
  assert.ok(readme.includes('«Calcolo con spigoli vivi: i raggi del tubo reale non sono considerati.»'));
  assert.ok(html.includes('Calcolo con spigoli vivi: i raggi del tubo reale non sono considerati.'));
});

test('il registro delle versioni dell\'app: versioni crescenti, l\'ultima è quella del codice, il database indicato esiste', () => {
  const righe = leggi('docs/versioni-app.md').split('\n').filter((r) => /^\| \d+\.\d+\.\d+ \|/.test(r));
  assert.ok(righe.length >= 9, `righe del registro: ${righe.length}`);
  const versioni = righe.map((r) => r.split('|')[1].trim());
  const num = (v) => v.split('.').map(Number);
  for (let i = 1; i < versioni.length; i++) {
    const [a, b] = [num(versioni[i - 1]), num(versioni[i])];
    assert.ok(a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2]))), `versioni non crescenti: ${versioni[i - 1]} → ${versioni[i]}`);
  }
  assert.equal(versioni[versioni.length - 1], APP, 'l\'ultima riga del registro non è la versione del codice');
  assert.match(righe[righe.length - 1], new RegExp(`\\| v${db.meta.versione} \\|$`), 'l\'ultima riga indica la versione del database del codice');
});

test('la versione dell\'app è scritta una sola volta in index.html (nella costante), e non ci sono altre versioni «a mano»', () => {
  assert.equal(html.split(`'${APP}'`).length - 1, 1);
  assert.ok(!html.includes('v' + APP));
});

test('la v4 del database è registrata: l\'impronta nel test, nel registro dei DB e quella del DB di lavoro coincidono', () => {
  const nelTest = /4: \{ data: '[^']+', voci: \d+, sha256: '([0-9a-f]{64})' \}/.exec(leggi('tests/versione-db.test.mjs'));
  assert.ok(nelTest, 'v4 non registrata in PUBBLICATE');
  const impronta = createHash('sha256').update(JSON.stringify(db)).digest('hex');
  assert.equal(db.meta.versione, '4');
  assert.equal(nelTest[1], impronta, 'l\'impronta registrata non è quella del DB di lavoro (v4)');
  const doc = leggi('docs/versioni-db.md');
  assert.ok(doc.includes(`\`${impronta}\``), 'docs/versioni-db.md riporta l\'impronta della v4');
  assert.doesNotMatch(doc, /non ancora pubblicata/);
  assert.match(doc, /## Da correggere alla prossima versione del DB/);
  assert.match(doc, /71 occorrenze \(53 «densita» e 18 «nome_commerciale»\) in 57 fonti su 64/);
});

test('il README e il registro dei DB dicono il vero sui nomi interni dei campi nei riferimenti: 71 occorrenze in 57 fonti su 64', () => {
  let occ = 0; let fonti = 0;
  for (const m of db.materiali) for (const f of m.fonti) { const n = (f.riferimento.match(/\bdensita\b|nome_commerciale/g) || []).length; occ += n; if (n) fonti++; }
  assert.deepEqual([occ, fonti], [71, 57]);
  assert.match(readme, /Da correggere alla prossima versione del DB/);
});

test('collegamenti interni dei documenti: ogni file collegato esiste', () => {
  for (const f of ['README.md', 'docs/esportazione.md', 'docs/checklist-iphone.md', 'docs/versioni-app.md', 'docs/versioni-db.md']) {
    const base = f.includes('/') ? f.slice(0, f.lastIndexOf('/') + 1) : '';
    for (const m of leggi(f).matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
      if (/^https?:/.test(m[1])) continue;
      assert.ok(existsSync(new URL(base + m[1], radice)), `${f}: collegamento a «${m[1]}» che non esiste`);
    }
  }
});

test('il README elenca i comandi dei test e i file delle suite che esistono davvero', () => {
  for (const comando of ['node --test tests/*.test.mjs', 'node tests/ui.playwright.cjs', 'node tests/esporta.playwright.cjs', 'node tools/valida-db.mjs']) assert.ok(readme.includes(comando), comando);
  for (const f of ['tests/ui.playwright.cjs', 'tests/esporta.playwright.cjs', 'tools/valida-db.mjs']) assert.ok(existsSync(new URL(f, radice)), f);
  const suite = readdirSync(new URL('tests/', radice)).filter((x) => x.endsWith('.test.mjs'));
  assert.ok(suite.length >= 7, `file di test Node: ${suite.join(', ')}`);
});

test('la checklist iPhone riporta solo gli esiti comunicati: sei prove ✅ del 2026-11-15, le voci «da provare» richieste, nessuna voce extra', () => {
  const c = leggi('docs/checklist-iphone.md');
  assert.match(c, /## Provato il 2026-11-15 \(app 0\.3\.0\)/);
  assert.match(c, /## Da provare/);
  const provate = c.split('## Da provare')[0];
  const ok = provate.split('\n').filter((r) => /^\| .* \| ✅ \|$/.test(r)).map((r) => r.split('|')[1].trim());
  assert.deepEqual(ok, ['Safari, Scarica scheda (.md)', 'Safari, Condividi…', 'Icona Home, Scarica scheda (.md)', 'Icona Home, Condividi…', 'Esporta schede (JSON)', '«Crea PDF» di iOS dal foglio di condivisione']);
  assert.match(provate, /Il file esportato resta `\.md`\. Gli accenti erano corretti \*\*tranne\*\* «densita» e «nome_commerciale» nei «Riferimenti» delle fonti: nella 0\.4\.0 si leggono «densità» e «nome commerciale»/);
  assert.match(provate, /\*\*D5 confermata\*\*/);
  assert.doesNotMatch(c, /non comunicato/i, 'le righe «non comunicato» sono state tolte');
  const daProvare = c.split('## Da provare')[1].split('\n').filter((r) => /^\| ☐ \|/.test(r)).map((r) => r.split('|')[2].trim()).filter((x) => x !== 'Prova');   // senza l'intestazione della tabella
  assert.equal(daProvare.length, 19);
  const attese = ['Riferimenti', 'C 45', 'C45 E', 'S 235 J R', '100 Cr 6', 'NCM 2', 'inox 316 L', 'AISI 316', 'UNI C45', 'EN C45', 'EN 1.4301', 'SAE 1045', 'UNI 304', 'constructor',
    'Azzera', 'Importa schede', 'Schede personali in Safari contro icona Home', 'Versione di iOS', 'L\'icona Home apre l\'app senza la barra di Safari?'];
  attese.forEach((a, i) => assert.ok(daProvare[i].includes(a), `voce ${i + 1}: «${a}» in «${daProvare[i]}»`));
  for (const extra of ['tastiera', 'zoom', 'tema', 'notch', 'tacca', 'rotazione', 'orizzontale', 'Collegamenti alle fonti', 'Barra del peso', 'Avvio senza rete']) assert.ok(!daProvare.join('\n').toLowerCase().includes(extra.toLowerCase()), `voce extra «${extra}»`);
  assert.match(c, /\| ☐ \| \*\*Riga «Riferimenti» con l'accento \(0\.4\.0\)\.\*\*/);
});

test('documenti coerenti sulla fase 3b: annullata, nessun documento la dà ancora per futura', () => {
  const doc = leggi('docs/esportazione.md');
  assert.match(doc, /La 3b, PDF nell'app, è annullata/);
  assert.doesNotMatch(doc, /parte dopo la prova/);
  assert.doesNotMatch(doc, /\(0\.3\.1\)/);
  assert.match(doc, /D3 \| π e ρ nel PDF \| non più applicabile/);
  assert.match(doc, /D4 \| Precarico del PDF \| non più applicabile/);
  assert.match(doc, /D8 \| Cartella `vendor\/` \| non più applicabile/);
  assert.match(doc, /D5 \| «Condividi…» \|[^\n]*confermata/);
  assert.match(readme, /la fase 3b è stata annullata/);
});
