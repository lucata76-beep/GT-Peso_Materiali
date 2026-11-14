# Schede materiale personali

Chi usa l'app può scrivere le proprie schede materiale (nome, densità o peso specifico, composizione chimica, designazioni, nome commerciale, fonte e note). Sono dati **scritti da chi usa l'app**: non hanno fonti né prove, non sono verificati su documenti e non entrano mai nel database verificato (`index.html`, blocco `DB`).

## Regole

- Ogni schermata che mostra una scheda personale lo dichiara: «Scheda personale · inserita da te, non verificata su documenti». Nei dettagli del peso compare «Scheda personale: la densità e gli altri dati sono scritti da te e non sono verificati su documenti», senza il conteggio delle fonti.
- Le schede stanno nella memoria del browser (`localStorage`, chiave `gtpm.schede-personali.v1`) di **quel dispositivo e quel browser**: il telefono e il computer non si sincronizzano. Per tenerne una copia e per portarle da un dispositivo all'altro ci sono «Esporta schede» (file JSON) e «Importa schede».
- Il nome non può ripetere quello di un'altra scheda personale né di una voce del database (maiuscole, accenti e simboli non contano): una scheda personale non può ridefinire una voce verificata.
- Le schede personali non partecipano al **numero abbreviato** (4 cifre del W.Nr.) e non cambiano i risultati di nessuna ricerca sulle voci del database; compaiono nel gruppo «Schede personali», in fondo all'elenco, e solo se ce ne sono.
- Il validatore del database rifiuta una voce con `personale` nel DB verificato.

## Campi

| Campo | Regole |
|---|---|
| Nome | obbligatorio, fino a 80 caratteri |
| Densità (peso specifico) | obbligatoria, numero con punto o virgola; unità g/cm³, kg/dm³, kg/m³ o lb/in³, convertita in g/cm³ (1 lb = 453,59237 g, 1 in = 2,54 cm); massimo 25 g/cm³ |
| Composizione chimica | facoltativa; per ogni elemento (simbolo: una maiuscola e al massimo una minuscola) un valore in %: `0,35-0,43`, `max 0,5`, `min 0,2`, `0,4` (nominale) oppure `resto`; un solo `resto`, nessun elemento ripetuto, valori da 0 a 100 |
| Designazioni e sigle | facoltative, separate da punto e virgola o a capo, fino a 20 di 60 caratteri; si cercano come le altre designazioni |
| Nome commerciale | facoltativo, fino a 80 caratteri |
| Fonte, note | facoltative, fino a 300 e 500 caratteri |

Limite: 200 schede personali.

## Formato dell'archivio e del file esportato

```json
{
 "versione": 1,
 "schede": [
  {
   "id": "p-…", "nome": "…",
   "densita_g_cm3": 7.85, "densita_immessa": { "testo": "7850", "unita": "kg/m³" },
   "composizione": [ { "elemento": "C", "tipo": "intervallo", "min": 0.35, "max": 0.43 }, { "elemento": "Fe", "tipo": "resto" } ],
   "designazioni": ["…"], "nome_commerciale": "", "fonte": "", "note": "",
   "creata": "AAAA-MM-GG", "modificata": "AAAA-MM-GG"
  }
 ]
}
```

`tipo` è `intervallo` (min e max), `max`, `min`, `nominale` o `resto`. All'apertura e all'importazione ogni scheda è ricontrollata una per una: le schede alterate o incoerenti (per esempio una densità diversa dal valore immesso) sono scartate con il motivo, le altre entrano. Un archivio illeggibile nella memoria del browser viene messo da parte sotto la chiave `…illeggibile` e l'app parte senza schede.

All'importazione una scheda è saltata se ha lo stesso nome di una già presente o di una voce del database; se il suo id è già usato ne riceve uno nuovo.

## Dove sta il codice

- `index.html`, blocco `SCHEDE:INIZIO … SCHEDE:FINE`: funzioni pure (controllo dei dati, conversioni, archivio, importazione), eseguite dai test così come sono nella pagina.
- `tests/schede.test.mjs`: 25 test sul blocco, sulla ricerca con le schede personali e sul validatore.
- `tests/ui.playwright.cjs`: inserimento, errori, modifica, duplicazione, eliminazione con conferma, memoria del browser, esportazione, importazione, archivio illeggibile, bersagli touch, testo e contrasti.
