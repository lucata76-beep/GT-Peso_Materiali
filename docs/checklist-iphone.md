# Checklist iPhone

Che cosa è stato provato su un iPhone vero e che cosa resta da provare. I collaudi automatici (`tests/ui.playwright.cjs`, `tests/esporta.playwright.cjs`) usano Chromium con iPhone emulato (390×844, tocco, tema chiaro e scuro): **non sono Safari**.

Esiti comunicati da Luca. Legenda: **✅ provato** · **☐ da provare**.

## Provato il 2026-11-15 (app 0.3.0)

Tutto ok.

| Prova | Esito |
|---|---|
| Safari, Scarica scheda (.md) | ✅ |
| Safari, Condividi… | ✅ |
| Icona Home, Scarica scheda (.md) | ✅ |
| Icona Home, Condividi… | ✅ |
| Esporta schede (JSON) | ✅ |
| «Crea PDF» di iOS dal foglio di condivisione | ✅ |

Il file esportato resta `.md`. Gli accenti erano corretti **tranne** «densita» e «nome_commerciale» nei «Riferimenti» delle fonti: nella 0.4.0 si leggono «densità» e «nome commerciale» (il DB v4 resta com'è: l'app mostra i nomi dei campi in italiano).

**D5 confermata**: «Condividi…» è un pulsante secondario, visibile solo se `canShare({ files })` è vero e il puntatore è touch.

**Il PDF non è nell'app**: la fase 3b è annullata; il PDF si ottiene con «Crea PDF» di iOS dal foglio di condivisione.

## Da provare

Annotare accanto a ogni voce l'esito e la data. Le ricerche si scrivono nel campo «Cerca» con l'app 0.4.0; l'esito atteso è calcolato dal codice (blocco `RICERCA`) e fissato dai test.

| ☐ | Prova | Atteso |
|---|---|---|
| ☐ | **Riga «Riferimenti» con l'accento (0.4.0).** Scegliere un materiale, aprire «Fonti dei dati», e scaricare la scheda: leggere la riga «Riferimenti» | «densità p. N» (non «densita») e «nome commerciale p. N» (non «nome_commerciale»), sia a schermo sia nel file `.md` |
| ☐ | Ricerca «C 45» | C45 (1.0503), C45E |
| ☐ | Ricerca «C45 E» | C45E, poi C45 (1.0503) |
| ☐ | Ricerca «S 235 J R» | S235JR |
| ☐ | Ricerca «100 Cr 6» | 100Cr6 |
| ☐ | Ricerca «NCM 2» | 39NiCrMo3 (alias NCM2) |
| ☐ | Ricerca «inox 316 L» | nessun risultato (il DB non ha il 316L) |
| ☐ | Ricerca «AISI 316» | Inox 316 |
| ☐ | Ricerca «UNI C45» | C45E |
| ☐ | Ricerca «EN C45» | C45 (1.0503), C45E |
| ☐ | Ricerca «EN 1.4301» | Inox 304, con la regola EN 10027-2 dichiarata nel «trovato per» |
| ☐ | Ricerca «SAE 1045» | C45 (1.0503), C45E |
| ☐ | Ricerca «UNI 304» | nessun risultato (la 304 non ha una designazione UNI) |
| ☐ | Ricerca «constructor» | nessun risultato e nessun errore |
| ☐ | Azzera | torna la schermata iniziale, le schede personali restano |
| ☐ | Importa schede | il file JSON esportato si rilegge; le schede doppie sono saltate e dichiarate |
| ☐ | Schede personali in Safari contro icona Home | annotare se una scheda creata in Safari c'è anche aprendo l'app dall'icona Home, o se sono separate |
| ☐ | Versione di iOS | annotare: ______ |
| ☐ | L'icona Home apre l'app senza la barra di Safari? | annotare sì o no |
