// Genera docs/tag-alias-fase2b.md dal DB di index.html: tag e alias di ogni voce, con documento, pagina e frase.
// Uso: node tools/report-tag.mjs   (riscrive il file; il contenuto dipende solo dal DB)
import { readFileSync, writeFileSync } from 'node:fs';
import { estraiDb } from './valida-db.mjs';

const radice = new URL('../', import.meta.url);
const db = estraiDb(readFileSync(new URL('index.html', radice), 'utf8'));
const doc = (v, id) => { const f = v.fonti.find((x) => x.id === id); return `${f.emittente}, «${f.documento}»`; };
const riga = (v, p) => `${doc(v, p.fonte)}, pag. ${p.pagina}: ${p.estratto}`;
const dicitura = (a) => (a.origine === 'produttore' ? 'alias da produttore' : a.una_sola_fonte ? 'alias non da produttore, una sola fonte' : 'alias non da produttore');

const out = [];
out.push('# Tag e alias (Fasi 2b e 2c)', '');
out.push(`Generato da \`node tools/report-tag.mjs\` sul DB v${db.meta.versione} del ${db.meta.data}. Non modificare a mano: si rigenera.`, '');
out.push('## Regole', '');
out.push('- **Tag**: una voce ha un tag solo se un documento ammesso lo afferma; per ogni tag il DB conserva documento, pagina e frase (o tabella). Il validatore rifiuta tag senza prove, fuori vocabolario o con prove di fonti che non dichiarano il campo «tag».');
out.push('- **«da tempra»** è separato da «da bonifica»: solo per acciai per utensili o cuscinetti i cui documenti riportano la durezza in HRC dopo la tempra (tabella o valore); la sola dicitura «through hardening» non basta.');
out.push('- **Sinonimi di ricerca** (es. temprato, temprabile, bonificato, bonificabile): sono logica della ricerca nel codice, non dati dei materiali. «bonifica» non è sinonimo di «da tempra».');
out.push('- **Nomi neutri delle famiglie** (acciaio, alluminio, rame, ottone, titanio, inox, stagno): trovano le voci a priorità bassa, con «trovato per: famiglia (classificazione dell\'app)» quando la parola non è nel nome. I nomi delle famiglie di trattamento («Acciai da bonifica», «Acciai per utensili») non sono testo cercabile.');
out.push('- **Alias**: campo `alias` con fonti. Con un documento del produttore l\'origine è «produttore»; altrimenti servono almeno 2 fonti indipendenti (enti diversi: due schede dello stesso ente contano una volta; distributori, fornitori di lavorazioni, tesi o articoli tecnici), mai aggregatori (Wikipedia, Scribd, MatWeb…). Per uso personale, un alias con un solo documento non-aggregatore entra con l\'etichetta «una sola fonte» (solo per gli alias). Questi documenti valgono solo per gli alias e le corrispondenze indicative, mai per i dati numerici, i tag o la composizione. In DB e a schermo: «alias non da produttore».');
out.push('- **Corrispondenze indicative** (`designazioni.indicative`): designazioni che un documento scrive solo tra parentesi o come equivalenza approssimata; si mostrano sulla scheda come «non sono identità» e non sono cercabili.');
out.push('- **Tag d\'uso** (marino, aeronautico, elettrotecnico): non previsti per ora.', '');

out.push('## Tag per voce', '');
let nTag = 0, nProve = 0;
const senza = [];
for (const v of db.materiali) {
  if (!v.tag.length) { senza.push(v); continue; }
  out.push(`### ${v.nome} (\`${v.id}\`, ${v.famiglia})`, '');
  for (const t of v.tag) {
    nTag++;
    out.push(`- **${t.tag}**`);
    for (const p of t.prove) { nProve++; out.push(`  - ${riga(v, p)}`); }
  }
  out.push('');
}
const conIndicative = db.materiali.filter((v) => v.designazioni.indicative?.length);
if (conIndicative.length) {
  out.push('## Corrispondenze indicative', '');
  for (const v of conIndicative) out.push(`- ${v.nome} (\`${v.id}\`): ${v.designazioni.indicative.join(', ')}`);
  out.push('');
}
out.push('## Voci senza tag', '');
out.push('Nessun tag del vocabolario è affermato dai documenti letti per queste voci; nessun tag è stato dedotto dal nome o dalla famiglia:', '');
for (const v of senza) out.push(`- ${v.nome} (\`${v.id}\`)`);
out.push('');

out.push('## Alias', '');
const conAlias = db.materiali.filter((v) => v.alias.length);
if (!conAlias.length) out.push('Nessun alias nel DB.', '');
for (const v of conAlias) {
  out.push(`### ${v.nome} (\`${v.id}\`)`, '');
  for (const a of v.alias) {
    out.push(`- **${a.alias}** (${dicitura(a)})`);
    for (const p of a.prove) out.push(`  - ${riga(v, p)}`);
    if (a.nota) out.push(`  - Nota: ${a.nota}`);
  }
  out.push('');
}
const docAlias = new Map();
for (const v of conAlias) for (const f of v.fonti) if (f.campi.includes('alias') && !docAlias.has(f.id)) docAlias.set(f.id, f);
if (docAlias.size) {
  out.push('### Documenti usati per gli alias (solo per gli alias, mai per i dati numerici)', '');
  out.push('| id | Emittente | Ruolo | Documento | URL | SHA-256 (16 car.) |', '|---|---|---|---|---|---|');
  for (const f of docAlias.values()) out.push(`| ${f.id} | ${f.emittente} | ${f.ruolo} | ${f.documento} | ${f.url ?? 'nessun URL: copia fornita da Luca'} | \`${f.sha256}\` |`);
  out.push('');
}
out.push(`Totale: ${nTag} tag in ${db.materiali.length - senza.length} voci (${nProve} prove con documento e pagina), ${conAlias.reduce((n, v) => n + v.alias.length, 0)} alias.`, '');
writeFileSync(new URL('docs/tag-alias-fase2b.md', radice), out.join('\n'));
console.log(`docs/tag-alias-fase2b.md: ${nTag} tag, ${nProve} prove, ${senza.length} voci senza tag`);
