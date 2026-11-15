# Esportazione della scheda (Fase 3)

Stato: **3a, Markdown, in produzione dall'app 0.3.0** (PR #8) e provata su iPhone (esiti in [checklist-iphone.md](checklist-iphone.md)). **La 3b, PDF nell'app, è annullata**: niente font incorporato né jsPDF. Per un PDF su iPhone resta «Crea PDF» di iOS dal foglio di condivisione. Il database resta la v4.

## Cosa fa

Con un risultato valido (materiale scelto, dimensioni e pezzi corretti) compare, sotto il peso, il pulsante **Scarica scheda (.md)**. Senza risultato resta visibile ma disattivo, e il testo «cosa manca» sotto il peso dice perché. Non esiste un file parziale.

Su un dispositivo touch che accetta davvero il file compare anche **Condividi…** (vedi sotto). Sul PC non compare mai.

## Contenuto e ordine

Tutto viene dal database o dalla scheda personale, e i numeri sono quelli del Motore nello stesso formato della schermata (nessun ricalcolo). Le funzioni che producono i testi comuni stanno nel blocco `ESPORTA` di `index.html`; schermo e file le chiamano entrambi (`tests/esporta.test.mjs` controlla che l'interfaccia non ne tenga una copia).

| # | Sezione | Contenuto |
|---|---|---|
| 1 | Titolo | `Scheda materiale: <nome>`, la famiglia in corsivo. Per le schede personali, subito sotto: **SCHEDA PERSONALE: dati inseriti dall'utente, non verificati su documenti**. Poi, per tutte, la dicitura **Peso teorico: densità nominale, spigoli vivi, nessuna tolleranza.** (dalla 0.4.0, prima di ogni numero) |
| 2 | Identificazione | Designazioni con il loro ente (EN, W.Nr., UNI, AISI/SAE, DIN), «Altre», corrispondenze indicative («non sono identità»), alias con la provenienza e la loro nota, nome commerciale solo se c'è |
| 3 | Composizione chimica | Riferimento, avviso «Composizione parziale» se c'è, tabella elemento e valore (% in massa) oppure «Elemento puro: Sn», nota |
| 4 | Densità | Densità usata, spiegazione («valore nominale: punto medio…» o «letture concordi»), «Valore tipico» e «Una sola fonte di densità» dove ci sono, intervallo delle letture con la nota e il peso con le letture estreme, numero di fonti indipendenti, elenco delle fonti che dichiarano la densità (ente, ruolo, documento, valore letto con unità e pagina, riferimenti scritti in italiano, indirizzo oppure «Copia fornita da Luca: nessun link pubblico»), data di verifica |
| 5 | Pezzo | Forma, dimensioni interpretate con le unità scelte, pezzi |
| 6 | Calcolo | Peso unitario, peso totale, volume in cm³ e mm³, formula e passaggi, avvisi della forma (spigoli vivi del tubo quadro) |
| 7 | Avvertenza | La stessa dicitura, ripetuta in fondo: «Peso teorico: densità nominale, spigoli vivi, nessuna tolleranza.» (è la frase a schermo; un test ne controlla l'uguaglianza) |
| 8 | Piede | Data e ora locali di generazione, versione dell'app, versione e data del DB |

**Schede personali.** Come sopra, con queste differenze: densità «inserita da te» (con il testo originale se l'unità inserita non è g/cm³), fonte e note scritte dall'utente con la loro etichetta, «Creata il… modificata il…» al posto della data di verifica, nessun conteggio di fonti, nessun «valore tipico», nessun «una sola fonte».

**Non incluso.** I **tag** (sono parole di ricerca dell'app, senza dato fisico) e le fonti che non dichiarano la densità (restano a schermo).

## Formato e sicurezza del testo

- UTF-8 senza BOM, a capo `\n`, tipo `text/markdown`. Il separatore delle migliaia è lo spazio stretto U+202F del Motore, come a schermo.
- Il testo scritto dall'utente (nome, designazioni, nome commerciale, fonte, note) non diventa mai Markdown: i segni `` \ ` * _ [ ] < > | # ~ $ `` hanno la barra rovesciata davanti (`&` solo se potrebbe formare un'entità), e a inizio riga anche `-`, `+`, `=` e `1.`. Fonte e note vanno in una citazione, una riga per riga. Il test dei 2000 testi casuali controlla che togliere le barre restituisca l'originale e che nessun segno resti attivo.
- L'indirizzo di una fonte è scritto tra `<…>`, così resta leggibile anche senza un visualizzatore Markdown.

## Nome del file

`scheda_<materiale>_<AAAA-MM-GG>_<HHMM>.md`, per esempio `scheda_c45e_2026-11-14_2135.md`. Il materiale è il nome in minuscolo, senza accenti, solo `[a-z0-9-]`, al massimo 30 caratteri (per le schede personali il nome, perché l'id è casuale); se non resta nulla, `materiale`. Data e ora sono quelle locali del clic: due schede dello stesso materiale in minuti diversi hanno nomi diversi.

## Consegna

Una sola funzione, `consegna()`, chiamata in modo **sincrono dentro il clic**, con il file costruito subito prima:

- **Scarica**: `<a download>` su un Blob; l'indirizzo `blob:` resta valido 60 s (il salvataggio può partire dopo il clic).
- **Condividi…**: `navigator.share({ files: [file] })`. Visibile solo se `navigator.share` e `canShare` esistono, il puntatore è touch (`(pointer: coarse)`) e `canShare({ files: [File .md di tipo text/markdown] })` è vero. L'annullamento (`AbortError`) non fa nulla; con qualunque altro errore (anche `share()` che lancia subito) parte il download e il messaggio dice il nome dell'errore. Un secondo tocco mentre la condivisione è aperta viene ignorato.
- Il pulsante «Esporta schede» (archivio JSON delle schede personali) non è stato toccato: ha la sua consegna, con la revoca dell'indirizzo dopo 2 s.

## Cosa è verificato e cosa no

**Dal sorgente WebKit (`main`, letto da GitHub il 14/11/2026)**: `Navigator::share()` rifiuta con `NotAllowedError` se la finestra non ha attivazione transitoria e la consuma (quindi un tocco permette una sola condivisione); l'attivazione dura 5 s; un secondo `share()` mentre il primo è aperto dà `InvalidStateError`; poi controlla i dati (`TypeError`). È il codice di oggi, non quello di uno specifico iOS.

**Dalla pianificazione (sessione precedente, non rifatto qui)**: il supporto dei file in `share()` dalla Safari 15 (note di rilascio Safari), `download` su Blob da Safari 10.1 / iOS 13 (dati di compatibilità MDN), l'assenza di manifest e di `apple-mobile-web-app-capable` nell'app (verificabile in `index.html`). Il comportamento del download di un Blob da un'app dall'icona Home è **non verificato**: solo segnalazioni di utenti, nessuna risposta Apple.

**Provato su iPhone (esito comunicato da Luca il 2026-11-15)**: Scarica e Condividi funzionano in Safari e dall'icona Home, il file resta `.md`, gli accenti sono corretti, «Crea PDF» di iOS dal foglio di condivisione funziona. **Non comunicato**: versione di iOS, nome del file con data e ora, comportamento dell'annullamento, uso dell'app dopo il download dall'icona Home (voci aperte in [checklist-iphone.md](checklist-iphone.md)).

**Non provabile nei test automatici**: Safari reale (Playwright ha solo Chromium) e il foglio di condivisione di iOS; i collaudi simulano `navigator.share` e registrano come viene chiamato.

## Decisioni della Fase 3

| # | Decisione | In 3a |
|---|---|---|
| D1 | Senza risultato | pulsanti disattivi, nessun file parziale |
| D2 | Alias e tag | alias sì (con la provenienza), tag no |
| D3 | π e ρ nel PDF | non più applicabile (3b annullata); il Markdown usa π e ρ, come lo schermo |
| D4 | Precarico del PDF | non più applicabile (3b annullata) |
| D5 | «Condividi…» | pulsante secondario, solo con `canShare` e touch; **confermata** da Luca dopo la prova su iPhone, resta com'è (potrà cambiarla dopo altre prove) |
| D6 | Nome del file | con `_HHMM` |
| D7 | Fonti nella scheda | solo quelle che dichiarano la densità |
| D8 | Cartella `vendor/` | non più applicabile (3b annullata): jsPDF e la cartella `vendor/` sono stati tolti nella 0.4.0 |

Scelte fatte in 3a oltre le D1–D8: i pulsanti stanno sotto il peso (non in fondo ai dettagli); il file ha tipo `text/markdown` senza parametro `charset` (una scelta, non verificata su iOS); il modello del documento (`Esporta.documento`) è separato dal Markdown (`Esporta.aMarkdown`): un altro formato userebbe lo stesso contenuto.

## Test

- `tests/esporta.test.mjs` (Node): testo esatto di nove casi (`tests/esporta-attesi/*.md`: valore tipico con fonte unica, fonte unica, intervallo con alias e copia fornita, alias Ergal, elemento puro, composizione parziale con tubo quadro, tipico con intervallo, due schede personali), senza risultato, nomi file, nessun `NaN`/`undefined`/`null` su 29 voci × 8 forme × 5 varianti, numeri uguali a quelli del Motore, Markdown sicuro, un solo posto per i testi comuni.
- `tests/esporta.playwright.cjs`: schermo contro file su 27 voci e 2 schede personali, file identici ai testi di riferimento, pulsanti (attivi/disattivi, bersagli, contrasti), download (nome con orologio fisso, indirizzo ancora valido dopo 2,5 s), condivisione simulata (sincrona, annullamento, rifiuto, errore immediato, doppio tocco, visibilità).
- `tests/ui.playwright.cjs`: aggiornato solo per la nuova dicitura e per l'etichetta con più pezzi; i pulsanti rientrano nei suoi controlli di bersagli e contrasti.
- `tests/documentazione.test.mjs` (Node): il README, i registri delle versioni e la checklist non dicono cose diverse dal codice.

Esecuzione: `node --test tests/*.test.mjs`, `node tests/ui.playwright.cjs`, `node tests/esporta.playwright.cjs`.

## Aggiunte della 0.4.0

- **Dicitura «peso teorico»**: una sola frase, «Peso teorico: densità nominale, spigoli vivi, nessuna tolleranza.», uguale a schermo e nel file. A schermo sta subito sotto il riquadro del peso (non più in fondo ai dettagli); nel file compare in alto, sotto il titolo e la famiglia (e sotto la dicitura delle schede personali), e di nuovo nella sezione finale «Avvertenza». L'etichetta sopra il numero è «Peso teorico»; con più pezzi «Peso teorico totale (N pezzi)». Sottotitolo («Peso teorico dei materiali») ed etichette sono ora protetti da test (su `main` non lo erano).
- **Riferimenti delle fonti**: il DB v4 contiene i nomi interni dei campi («densita p. 6», «nome_commerciale p. 1»). Schermo («Fonti dei dati») e file li mostrano come «densità p. 6» e «nome commerciale p. 1» con `Esporta.riferimentoLeggibile`, che sostituisce solo le forme esatte. Il DB non cambia; la correzione alla fonte è annotata in [versioni-db.md](versioni-db.md).
- **jsPDF**: la cartella `vendor/` (jsPDF 4.2.1, licenza e `LEGGIMI`) è stata tolta: l'app non la usava e `main` la pubblicava sul sito.

## Prove su iPhone

Esiti e voci ancora aperte: [checklist-iphone.md](checklist-iphone.md).
