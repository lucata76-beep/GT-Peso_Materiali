# Versioni del database

## Regola

Dalla v4 in poi: **una versione pubblicata non cambia contenuto**. Ogni modifica ai dati dopo una versione pubblicata alza la versione del DB (`meta.versione`) e aggiorna la data (`meta.data`). Non devono esistere due contenuti diversi con la stessa etichetta.

Come è fatta rispettare:

- `tests/versione-db.test.mjs` conserva l'impronta SHA-256 del contenuto (il JSON del blocco `db-materiali`) di ogni versione pubblicata: se il DB dichiara una versione già pubblicata ma il contenuto è diverso, il test fallisce. La versione non può essere più vecchia di una pubblicata e la data non può tornare indietro.
- `tools/valida-db.mjs` richiede che la versione sia un intero positivo (testo: `"4"`) e che il campo `tipico` compaia solo dalla v4 in poi.
- A ogni nuova pubblicazione si aggiunge una riga alla tabella `PUBBLICATE` del test.

## Elenco dei contenuti pubblicati

Impronta = SHA-256 del JSON del blocco DB, ricavata dal commit indicato.

| Etichetta | Fase | Data | Voci · alias | Commit | Dove | Impronta SHA-256 |
|---|---|---|---|---|---|---|
| v1 | Fase 1 | 2026-11-13 | 21 · 0 | `7b24019` | `main` (storia) | `49508d684cc439e2a65128ded7c883ed85b3bc0bcaea25d06a638f46e3478ef2` |
| v2 | Fase 1 (fonti ammesse) | 2026-11-13 | 21 · 0 | `fdd48af` | `main` (storia) | `8216be8048230adfbb6f8059e00c25cdc2f6f59620dd6f8e703988b2de4c1c46` |
| **v3** (a) | Fase 2b, prima versione (tag, nessun alias) | 2026-11-13 | 21 · 0 | `2a2aca7` | `main` (storia) | `d04daabeb29ad3ce7ad8920bb98d43259d4dd4aa5594ef43bcd895e7b38ad385` |
| **v3** (b) | Fase 2b, versione finale (con l'alias «Ergal») | 2026-11-13 | 21 · 1 | `c89253c`; è il DB di `main` (`1de12e2`) | `main` | `de3b0826da4fc13ae0517898d1004f0ed600d6f315f1e1cdadcdb54fe5c3a199` |
| **v3** (c) | Fase 2c (6 nuove voci, alias NCM2 e KORV) | 2026-11-14 | 27 · 3 | `08f9cd3`, `08cea49` | ramo della PR #3 | `1b2ea1c41a814ea691811fea91a68fcfaddd24171399c1baa2327269cc125792` |
| v4 | Fase 2d | 2026-11-14 | 27 · 3 | PR #4 | non ancora pubblicata | si registra alla pubblicazione |

## Eccezione storica: tre contenuti con l'etichetta «v3»

Prima di questa regola l'etichetta «v3» è stata usata per tre contenuti diversi:

- **(a)** e **(b)**: i due stati della Fase 2b, entrambi nella storia di `main`. Il DB di `main` è (b): 21 voci del 2026-11-13, un alias.
- **(c)**: il DB della Fase 2c (27 voci, 2026-11-14). La richiesta della Fase 2c indicava «DB v3» mentre la v3 esisteva già in `main`, e l'etichetta è stata riusata.

Decisione di Luca: la v3 resta com'è; la v3 di `main` (b) e gli altri contenuti sopra sono documentati qui come eccezione storica. Il test protegge la v3 (c), quella che con la PR #3 sostituisce il DB di `main`. Dalla PR #4 la versione è la v4, e da qui in poi la regola non ha eccezioni.

## v4 (Fase 2d)

Rispetto alla v3 (c) cambiano solo dati: il flag `tipico: true` sulle letture di densità che il documento dichiara «valore tipico» (C45, S355J2 e S235JR: Ovako; Inconel 718: Special Metals SMC-045) e `data_verifica` di S355J2 e Inconel 718. Documento, pagina e frase di ogni voce: sezione «Valore tipico (DB v4)» di `docs/fonti-fase2c.md`.
