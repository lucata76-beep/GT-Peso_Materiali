# Esportazione della scheda (Fase 3)

Stato: **3a, Markdown (app 0.3.0)**. La 3b, PDF (0.3.1), parte dopo la prova della 3a su iPhone. Il database resta la v4.

## Cosa fa

Con un risultato valido (materiale scelto, dimensioni e pezzi corretti) compare, sotto il peso, il pulsante **Scarica scheda (.md)**. Senza risultato resta visibile ma disattivo, e il testo «cosa manca» sotto il peso dice perché. Non esiste un file parziale.

Su un dispositivo touch che accetta davvero il file compare anche **Condividi…** (vedi sotto). Sul PC non compare mai.

## Contenuto e ordine

Tutto viene dal database o dalla scheda personale, e i numeri sono quelli del Motore nello stesso formato della schermata (nessun ricalcolo). Le funzioni che producono i testi comuni stanno nel blocco `ESPORTA` di `index.html`; schermo e file le chiamano entrambi (`tests/esporta.test.mjs` controlla che l'interfaccia non ne tenga una copia).

| # | Sezione | Contenuto |
|---|---|---|
| 1 | Titolo | `Scheda materiale: <nome>`, la famiglia in corsivo. Per le schede personali, subito sotto: **SCHEDA PERSONALE: dati inseriti dall'utente, non verificati su documenti** |
| 2 | Identificazione | Designazioni con il loro ente (EN, W.Nr., UNI, AISI/SAE, DIN), «Altre», corrispondenze indicative («non sono identità»), alias con la provenienza e la loro nota, nome commerciale solo se c'è |
| 3 | Composizione chimica | Riferimento, avviso «Composizione parziale» se c'è, tabella elemento e valore (% in massa) oppure «Elemento puro: Sn», nota |
| 4 | Densità | Densità usata, spiegazione («valore nominale: punto medio…» o «letture concordi»), «Valore tipico» e «Una sola fonte di densità» dove ci sono, intervallo delle letture con la nota e il peso con le letture estreme, numero di fonti indipendenti, elenco delle fonti che dichiarano la densità (ente, ruolo, documento, valore letto con unità e pagina, riferimenti, indirizzo oppure «Copia fornita da Luca: nessun link pubblico»), data di verifica |
| 5 | Pezzo | Forma, dimensioni interpretate con le unità scelte, pezzi |
| 6 | Calcolo | Peso unitario, peso totale, volume in cm³ e mm³, formula e passaggi, avvisi della forma (spigoli vivi del tubo quadro) |
| 7 | Avvertenza | «Peso teorico da densità nominale, senza tolleranze né raggi.» (la frase già a schermo; un test ne controlla l'uguaglianza) |
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

**Non provabile in questa sessione**: Safari reale (Playwright ha solo Chromium), il foglio di condivisione di iOS, «Salva su File», il download dall'icona Home, la durata del gesto sul tuo iOS, il nome file che iOS conserva, la lettura del `.md` su iPhone. Vanno provati a mano (sotto).

## Decisioni della Fase 3

| # | Decisione | In 3a |
|---|---|---|
| D1 | Senza risultato | pulsanti disattivi, nessun file parziale |
| D2 | Alias e tag | alias sì (con la provenienza), tag no |
| D3 | π e ρ nel PDF | parole (riguarda la 3b; il Markdown usa π e ρ, come lo schermo) |
| D4 | Precarico del PDF | riguarda la 3b |
| D5 | «Condividi…» | pulsante secondario, solo con `canShare` e touch, da confermare con la prova su iPhone |
| D6 | Nome del file | con `_HHMM` |
| D7 | Fonti nella scheda | solo quelle che dichiarano la densità |
| D8 | Cartella `vendor/` | resta piatta; il font si aggiunge lì (3b) |

Scelte fatte in 3a oltre le D1–D8: i pulsanti stanno sotto il peso (non in fondo ai dettagli); il file ha tipo `text/markdown` senza parametro `charset` (una scelta, non verificata su iOS); il modello del documento (`Esporta.documento`) è separato dal Markdown (`Esporta.aMarkdown`), così il PDF della 3b userà lo stesso contenuto.

## Test

- `tests/esporta.test.mjs` (Node): testo esatto di nove casi (`tests/esporta-attesi/*.md`: valore tipico con fonte unica, fonte unica, intervallo con alias e copia fornita, alias Ergal, elemento puro, composizione parziale con tubo quadro, tipico con intervallo, due schede personali), senza risultato, nomi file, nessun `NaN`/`undefined`/`null` su 29 voci × 8 forme × 5 varianti, numeri uguali a quelli del Motore, Markdown sicuro, un solo posto per i testi comuni.
- `tests/esporta.playwright.cjs`: schermo contro file su 27 voci e 2 schede personali, file identici ai testi di riferimento, pulsanti (attivi/disattivi, bersagli, contrasti), download (nome con orologio fisso, indirizzo ancora valido dopo 2,5 s), condivisione simulata (sincrona, annullamento, rifiuto, errore immediato, doppio tocco, visibilità).
- `tests/ui.playwright.cjs`: invariato; i pulsanti nuovi rientrano nei suoi controlli di bersagli e contrasti.

Esecuzione: `node --test tests/*.test.mjs`, `node tests/ui.playwright.cjs`, `node tests/esporta.playwright.cjs`.

## Da provare su iPhone: Markdown

Quattro combinazioni: **Safari** o **icona Home** × **Scarica** o **Condividi**. Per l'icona Home aggiungi prima l'app dalla condivisione di Safari. Annota anche la versione di iOS e se dall'icona l'app si apre senza la barra di Safari o dentro Safari.

In ogni prova: scegli C45E, D = 100, L = 100, 1 pezzo.

1. **Safari + Scarica.** Tocca «Scarica scheda (.md)». Dove finisce il file (Download di File?) e con che nome (resta `.md`, o diventa `.txt`)? Aprilo: gli accenti (à, ù), `²`, `³`, `π`, `ρ` e i numeri come `785 398,163` sono giusti? Il messaggio sotto il pulsante dice «Scarico avviato».
2. **Safari + Condividi.** Il pulsante «Condividi…» compare? Se no, annotalo. Se sì, toccalo: si apre il foglio di condivisione? Prova «Salva su File» e una seconda destinazione (Note o Mail): il file arriva con il nome giusto e il contenuto giusto? Annulla il foglio: non deve succedere nulla. Se compare un messaggio «Condivisione non riuscita (…)», annota il nome dell'errore tra parentesi.
3. **Icona Home + Scarica.** Come la 1. Il download parte? L'app resta utilizzabile dopo, o resta bloccata? Il messaggio «Scarico avviato» compare comunque anche se non succede nulla: conta quello che vedi in File.
4. **Icona Home + Condividi.** Come la 2.

Se in una prova «Condividi…» non compare dove ti aspettavi, o compare ma non funziona, è proprio l'informazione che serve per confermare o cambiare la D5.
