# GT-Peso_Materiali

Web app per sapere il **peso teorico** dei materiali conoscendo le dimensioni.

**App 0.4.0 · Database v4 (2026-11-14), 27 materiali.**

## Indice

1. [Cos'è l'app](#1-cosè-lapp)
2. [Uso](#2-uso)
3. [Struttura del repository e blocchi di index.html](#3-struttura-del-repository-e-blocchi-di-indexhtml)
4. [Validatore e test](#4-validatore-e-test)
5. [Regole del database e delle fonti](#5-regole-del-database-e-delle-fonti)
6. [Versioni dell'app e del database](#6-versioni-dellapp-e-del-database)
7. [GitHub Pages](#7-github-pages)
8. [Limiti](#8-limiti)
9. [«Peso teorico»: la dicitura](#9-peso-teorico-la-dicitura)

## 1. Cos'è l'app

Una sola schermata, pensata per l'iPhone, che calcola il peso di un pezzo dal materiale, dalla forma e dalle dimensioni. Il peso si aggiorna mentre si scrive. I materiali sono 27, ciascuno con la densità, le designazioni, la composizione chimica e le **fonti** (documento, pagina e collegamento); ci sono anche le **schede personali**, scritte da chi usa l'app. Il peso è **teorico**: vedi il capitolo 9.

## 2. Uso

1. **Materiale**: si cerca per nome, designazione (EN, W.Nr., UNI, AISI/SAE, DIN, anche con l'etichetta della norma, per esempio «UNI C45»), alias o uso («bonificato», «inox»…).
2. **Forma**: barra tonda, quadro, esagono, piatto/lastra, tubo tondo, tubo quadro/rettangolare, sfera, volume noto.
3. **Dimensioni** in mm, cm, m o pollici, e **pezzi**. Ogni campo mostra come è stato interpretato (punto o virgola decimale).
4. **Risultato** in kg, g, t, lb o oz: peso unitario e totale, volume, formula e passaggi, densità usata con le sue fonti.

Altre funzioni:
- **Scheda personale** («Nuova scheda personale»): nome, densità, composizione, designazioni. I dati sono dichiarati «non verificati su documenti» in ogni schermata e nel file esportato. Restano nella memoria del browser di quel dispositivo e di quell'app (Safari oppure icona Home); «Esporta schede» e «Importa schede» servono per tenerne una copia in un file JSON. Dettagli: [docs/schede-personali.md](docs/schede-personali.md).
- **Azzera**: torna alla schermata iniziale, senza toccare le schede personali.
- **Esportazione**: con un risultato valido, «Scarica scheda (.md)» salva la scheda in Markdown; su un dispositivo touch che accetta il file compare anche «Condividi…». Nome del file: `scheda_<materiale>_<AAAA-MM-GG>_<HHMM>.md`. Contenuto e decisioni: [docs/esportazione.md](docs/esportazione.md). Non esiste un'esportazione PDF nell'app (la fase 3b è stata annullata): su iPhone si usa «Crea PDF» di iOS dal foglio di condivisione.
- **Su iPhone**: aprire la pagina in Safari; facoltativo, «Aggiungi alla schermata Home» (l'icona è `apple-touch-icon.png`). I campi hanno testo di almeno 16 px, così Safari non ingrandisce da solo la pagina.
- **In locale**: `index.html` si apre dal file o da un qualunque server di file statici, senza build né dipendenze. Serve JavaScript.

## 3. Struttura del repository e blocchi di index.html

**Non esiste nessuno script di assemblaggio né una build**: `index.html` è l'unico sorgente dell'app, e HTML, CSS e JavaScript dell'interfaccia stanno tutti lì dentro. Si modifica direttamente quel file.

| Blocco in `index.html` | Che cosa contiene |
|---|---|
| `<!-- DB:INIZIO … DB:FINE -->`, `<script id="db-materiali">` | Il database dei materiali (JSON). Lo produce `tools/costruisci_db.py`; nessuno script del repository lo inserisce in `index.html` |
| `// ENGINE:INIZIO … ENGINE:FINE` | `Motore`: calcolo, forme, unità, formattazione dei numeri (funzioni pure) |
| `// RICERCA:INIZIO … RICERCA:FINE` | `Ricerca`: ricerca per nome, designazione, alias, tag, etichette di norma |
| `// SCHEDE:INIZIO … SCHEDE:FINE` | `Schede`: controllo, archivio, importazione ed esportazione delle schede personali |
| `// ESPORTA:INIZIO … ESPORTA:FINE` | `Esporta`: testi comuni a schermo e file, documento della scheda, Markdown, nome del file |
| secondo `<script>`, dopo i blocchi | L'interfaccia. In cima c'è `APP_VERSIONE`, **fuori da ogni blocco marcato** |

I test eseguono esattamente i blocchi marcati, estratti da `index.html`, non copie.

| Percorso | Contenuto |
|---|---|
| `index.html` | L'app (vedi sopra) |
| `assets/`, `apple-touch-icon.png` | Marchio GT e icona per la schermata Home |
| `docs/` | Registro delle fonti, tag e alias, schede personali, esportazione, versioni, checklist iPhone |
| `tests/` | Test Node (`*.test.mjs`), collaudi con browser (`*.playwright.cjs`), testi di riferimento dell'esportazione (`esporta-attesi/`) |
| `tools/` | Validatore del database, costruttore del database dai documenti letti, generatori dei registri |

## 4. Validatore e test

Servono Node.js (provati con la 22) e, per l'interfaccia, Playwright con Chromium **installato globalmente** (non è una dipendenza del progetto).

```
node --test tests/*.test.mjs        # motore, ricerca, database, schede, esportazione, documentazione
node tests/ui.playwright.cjs        # interfaccia: iPhone emulato e desktop, chiaro e scuro
node tests/esporta.playwright.cjs   # esportazione: schermo contro file, pulsanti, download, condivisione simulata
node tools/valida-db.mjs            # validatore del database (esce con 1 se trova errori)
```

I collaudi con browser usano Chromium con iPhone emulato (390×844): **non sono Safari**. Che cosa è stato provato su un iPhone vero: [docs/checklist-iphone.md](docs/checklist-iphone.md).

## 5. Regole del database e delle fonti

- **Nessun valore senza il documento originale letto.** Ogni densità, composizione, designazione, nome commerciale, tag e alias ha una *prova*: documento, pagina e frase, confrontati con il testo del documento da `tools/costruisci_db.py`.
- **Fonti ammesse**: norme e schede tecniche dei produttori (e, per alcuni dati, fornitori e riferimenti scientifici). Lucefin è ammessa ed etichettata «produttore e distributore». **Non ammessi da soli**: distributori, aggregatori, copie e schede a pagamento; thyssenkrupp Materials e Rolled Alloys sono documenti «letti, non ammessi». Regole complete e registro: [docs/fonti-fase1.md](docs/fonti-fase1.md), [docs/fonti-fase2c.md](docs/fonti-fase2c.md), [docs/tag-alias-fase2b.md](docs/tag-alias-fase2b.md).
- **Densità**: se i documenti concordano vale il valore comune; se discordano, la densità nominale è il **punto medio** tra minimo e massimo letti (3 decimali), con intervallo e fonti (`meta.regola_nominale`). Le etichette «valore tipico» (il documento lo dichiara) e «una sola fonte» compaiono dove valgono. Le fonti indipendenti si contano per ente.
- **I documenti dei produttori non sono nel repository** (è pubblico): `.gitignore` esclude `*.pdf` e `fonti-locali/`; il file letto si identifica con l'impronta SHA-256 registrata. Per questo il database **non si può rigenerare** senza i PDF.
- **Una versione pubblicata del database non cambia contenuto.** Ogni modifica ai dati alza la versione e aggiorna la data; `tests/versione-db.test.mjs` conserva l'impronta SHA-256 di ogni versione pubblicata (v1–v4). Dettagli: [docs/versioni-db.md](docs/versioni-db.md).
- **Da correggere alla prossima versione del DB**: il generatore scrive ancora nel `riferimento` delle fonti i nomi interni dei campi («densita p. 6», «nome_commerciale p. 1»). L'app li mostra in italiano, solo per queste forme esatte, e il DB v4 resta com'è.
- Il validatore (`node tools/valida-db.mjs`) controlla struttura, coerenza interna e le regole sulle fonti, senza leggere i documenti.

## 6. Versioni dell'app e del database

- **App**: schema `0.<fase>.<revisione>`. Il valore sta in un solo punto del codice, la costante `APP_VERSIONE` in cima al secondo `<script>` (l'interfaccia), e compare nell'intestazione. Registro: [docs/versioni-app.md](docs/versioni-app.md).
- **Database**: etichette intere (`v4`), mostrate con la data nel piè di pagina e nel file esportato. Registro e regola: [docs/versioni-db.md](docs/versioni-db.md).
- Un test controlla che questo README dichiari le versioni, la data del database e il numero di materiali del codice.

## 7. GitHub Pages

L'app è pubblicata con GitHub Pages: **https://lucata76-beep.github.io/GT-Peso_Materiali/**. Pages pubblica la **radice del ramo `main`**, sul dominio `github.io`. Quello che sta in `main` è quindi pubblico anche sul sito: il file `vendor/LEGGIMI.txt`, per esempio, si leggeva dall'indirizzo pubblico.

## 8. Limiti

- **Il peso è teorico** (capitolo 9): densità nominale, spigoli vivi, nessuna tolleranza.
- **Avvio senza rete**: l'app non usa service worker, quindi l'avvio a freddo senza rete, per esempio dall'icona Home, **non è garantito e non è stato verificato**. A pagina già aperta non servono richieste di rete (i soli collegamenti esterni sono quelli ai documenti delle fonti, che si aprono solo al tocco).
- **Safari reale**: provato su iPhone solo quanto riportato in [docs/checklist-iphone.md](docs/checklist-iphone.md); il resto è collaudato con Chromium emulato.
- **Copertura**: 27 materiali. Dove i documenti letti non bastano la voce non c'è: il DB non ha, per esempio, il 316L né il 304L, e la ricerca di «inox 316 L» non trova nulla (non ricade sul 316).
- **Schede personali**: restano solo nella memoria del browser di quel dispositivo e di quell'app. Se il browser la cancella sono perse: «Esporta schede» serve per tenerne una copia.
- **PDF**: non c'è un'esportazione PDF nell'app.

## 9. «Peso teorico»: la dicitura

La frase è una sola, uguale a schermo e nel file:

> **Peso teorico: densità nominale, spigoli vivi, nessuna tolleranza.**

- **A schermo**: subito sotto il riquadro del peso. Il sottotitolo dell'app dice «Peso teorico dei materiali» e l'etichetta sopra il numero dice «Peso teorico» (con più pezzi, «Peso teorico totale (N pezzi)»).
- **Nel Markdown**: in alto, sotto il titolo e la famiglia (e sotto la dicitura delle schede personali), prima di ogni numero, e di nuovo nella sezione finale «Avvertenza».
- Il tubo quadro/rettangolare avverte inoltre: «Calcolo con spigoli vivi: i raggi del tubo reale non sono considerati.»

Nel codice la frase compare due volte (la dicitura a schermo e la costante `DICITURA_TEORICO`) e un test ne controlla l'uguaglianza. Sono protetti da test, in `tests/esporta.test.mjs` e `tests/esporta.playwright.cjs`: la frase, il sottotitolo, le due etichette, la posizione sotto il riquadro del peso, la dicitura in alto e in fondo al file e l'avviso del tubo quadro.
