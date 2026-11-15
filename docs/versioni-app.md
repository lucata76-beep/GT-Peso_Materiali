# Versioni dell'app

Schema `0.<fase>.<revisione>`. Il valore è la costante `APP_VERSIONE` in `index.html` (un solo punto) e compare nell'intestazione dell'app. Il database ha le sue etichette: [versioni-db.md](versioni-db.md).

`tests/documentazione.test.mjs` controlla che l'ultima riga di questa tabella sia la versione del codice.

Le versioni sono ricavate dalla storia di git (valore della costante in ciascun commit). Prima della 0.2.1 l'app non mostrava una versione.

| Versione | Data | Che cosa | Commit | DB |
|---|---|---|---|---|
| 0.2.1 | 2026-11-13 | Fase 2b: marchio, intestazione, ricerca per tag, alias e famiglia | `2a2aca7` | v3 |
| 0.2.2 | 2026-11-14 | Fase 2c: 6 nuove voci (27), alias NCM2 e KORV, ricerca con sinonimi e numero abbreviato | `08f9cd3` | v3 |
| 0.2.3 | 2026-11-14 | Fase 2d: schede materiale personali, «valore tipico» sulla densità | `d096ae0`, `ff8be8a` | v3, poi v4 |
| 0.2.4 | 2026-11-14 | Pulsante «Azzera» | `9b0c707` | v4 |
| 0.2.5 | 2026-11-14 | Ricerca: parole di un solo carattere e designazioni scritte con gli spazi | `8a08aab` | v4 |
| 0.2.6 | 2026-11-14 | Ricerca: etichette di norma (AISI, SAE, EN, UNI, DIN, W.Nr.) | `a14d6cd` | v4 |
| 0.2.7 | 2026-11-14 | Tabelle senza prototipo: «constructor» non rompe più la ricerca | `3eeaf6f` | v4 |
| 0.3.0 | 2026-11-14 | Fase 3a: esportazione della scheda in Markdown (Scarica e Condividi) | `913490d` (PR #8) | v4 |
| 0.4.0 | 2026-11-15 | Fase 4 (chiusura v1): dicitura «peso teorico: densità nominale, spigoli vivi, nessuna tolleranza» a schermo (sotto il peso) e nel file (in alto e in fondo), etichetta «Peso teorico totale (N pezzi)», «Riferimenti» con «densità» e «nome commerciale», README, checklist iPhone; jsPDF tolto da `vendor/` (la 3b, PDF, è annullata) | questo commit | v4 |
