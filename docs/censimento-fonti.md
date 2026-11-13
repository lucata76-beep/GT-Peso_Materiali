# Censimento fonti – Fase 1, lotto pilota (21 voci)

> **Documento di lavoro, superato da `docs/fonti-fase1.md`** (esito della lettura dei documenti). Molti link qui sotto sono
> diventati obsoleti o non servono più. Host finali dell'ambiente (23): vedi il report della Fase 1.

Stato: 2026-11-13. **Documenti candidati, NON ancora letti.** Gli URL vengono da ricerche web;
nessun valore (densità, composizione) è verificato e per questo non ne è riportato nessuno.
Un valore entra nel DB solo dopo la lettura del documento originale.

## Regole di ammissione della fonte

- **Ammesse:** norma; scheda tecnica del produttore (acciaieria, laminatoio, produttore della lega).
- **Non ammesse da sole:** distributori, aggregatori e copie (Scribd, TotalMateria, MakeItFrom, Xometry,
  Compraco, AlloyFYI, steelestores, mfgrobots, Wikipedia), mirror dei documenti di un produttore,
  schede a pagamento (appluslaboratories).
- Fonti discordanti: valore nominale + intervallo + elenco delle fonti.
- Nessun documento originale letto: la voce non entra.

## Candidati per voce

Per ogni voce: documenti da leggere. «Seconda fonte» serve a rilevare discordanze tra produttori.

### Acciai al carbonio e da bonifica

1. **C45 (1.0503)**
   - Principale: Saarstahl «0503 C45» – https://en.saarstahl.com/app/uploads/2024/03/20160401102929-0503_C45.pdf
   - Seconda: Swiss Steel «C45 XTP» – https://swisssteel-group.com/content-media/documents/Data-Sheets/Engineering-Steel/C45-XTP_en.pdf (da verificare se riferita a 1.0503)
   - Attenzione: le schede Lucefin trovate sono C45E (1.1191, `lucefin.com/eeloavys/2025/01/C45E.pdf`) e C45U (1.1730, acciaio per utensili, EN ISO 4957): **gradi diversi, non valgono per 1.0503**.
   - Aperto: tenere C45 e C45E come voci distinte o collegate.
2. **42CrMo4 (1.7225)**
   - Lucefin – https://www.lucefin.com/wp-content/files_mf/152353604042CrMo4.pdf
   - thyssenkrupp Materials (tedesco, copre anche 42CrMoS4) – https://ucpcdn.thyssenkrupp.com/_binary/UCPthyssenkruppBAMaterialsSchulte/dc4e3d67-9afe-4b41-8794-a82c0d3ab7bb/42CrMo4-42CrMoS4-1.7225-1.7227.pdf
   - Scartata: scheda Swiss Steel trovata è per 42CrMoS4 (1.7227), grado diverso.
3. **16MnCr5 (1.7131)**
   - Ovako – https://steelnavigator.ovako.com/steel-grades/16mncr5/pdf
   - Lucefin – https://lucefin.com/eeloavys/2025/01/ENG-16MnCr5.pdf
   - thyssenkrupp Steel – https://www.thyssenkrupp-steel.com/media/content_1/publikationen/precision_steel/produktinformationen_1/einsatzstahl/thyssenkrupp_16mncr5_product_information_precision_steel_en.pdf
4. **100Cr6 (1.3505)**
   - Ovako – https://steelnavigator.ovako.com/steel-grades/100cr6/
   - Lucefin – https://lucefin.com/oaleekso/files_mf/1523536908100Cr6.pdf
   - Swiss Steel (tedesco) – https://swisssteel-group.com/content-media/documents/Data-Sheets/Engineering-Steel/1.3505_de.pdf
5. **S355** → proposta **S355J2 (1.0577)**
   - Lucefin – https://lucefin.com/oaleekso/files_mf/1522935764S355J2.pdf
   - Ovako – https://steelnavigator.ovako.com/steel-grades/s355j2/pdf
   - Aperto: verificare nei documenti se i limiti di composizione differiscono tra JR, J0 e J2.
6. **11SMnPb30 (1.0718)**
   - Lucefin – https://lucefin.com/eeloavys/2025/01/ENG-11SMnPb30.pdf
   - Swiss Steel «E217 SwissCut» – https://swisssteel-group.com/content-media/documents/Data-Sheets/Engineering-Steel/E217_SwissCut_Technischesdatenblatt_0715.pdf (possibile nome commerciale: da verificare nel documento)
   - Da chiarire nei documenti: norma di riferimento attuale (EN 10087 vs ISO 683-4).

### Inox

7. **304 (1.4301)**
   - Swiss Steel – https://www.swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/Datenblatt_4301_UK.pdf
   - Aperam – https://www.aperam.com/product/304-1-4301/
   - Lucefin – https://lucefin.com/oaleekso/files_mf/15235416291.4301A304.pdf
   - Outokumpu: pagina con accesso limitato, non usabile.
8. **316** → **1.4401**
   - Swiss Steel (tedesco) – https://swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/1.4401_de.pdf
   - Lucefin – https://lucefin.com/oaleekso/files_mf/15235422061.4401A316.pdf
   - Nota: 316L (1.4404) è un grado diverso → proposto per il lotto 2.
9. **17-4PH (1.4542)**
   - BGH – https://bgh.de/media/7e/31/8f/1717660165/14542_BGH_en.pdf
   - Fagersta (Marcegaglia) – https://www.fagersta.marcegaglia.com/wp-content/uploads/2023/07/17-4PH_R565-10_ENG_2012_Edition_2.pdf
   - Lucefin – https://lucefin.com/oaleekso/files_mf/15235430111.4542Tp630.pdf

### Acciai per utensili

10. **1.2344 (X40CrMoV5-1)**
    - Böhler W302 ISODISC – https://www.bohler-edelstahl.com/app/uploads/sites/92/productdb/api/w302-isodisc_en.pdf
    - Böhler W302 ISOBLOC – https://www.bohler-edelstahl.com/app/uploads/sites/92/productdb/api/w302-isobloc_en.pdf (nome commerciale «BÖHLER W302»: da verificare nei documenti)
    - Swiss Steel – https://swisssteel-group.com/content-media/documents/_import/1.2344_en.pdf
    - Lucefin – https://lucefin.com/oaleekso/files_mf/15236076191.2344X40CrMoV51.pdf
    - Indizio non verificato: i produttori sembrano divergere sulla densità → probabile intervallo.
11. **1.2379 (X153CrMoV12)**
    - Böhler K110 (pagina; scheda PDF da individuare) – https://www.bohler-edelstahl.com/en/products/k110
    - Lucefin – https://lucefin.com/oaleekso/files_mf/15236079471.2379X153CrMoV12.pdf
    - Seconda fonte da produttore: da trovare.

### Alluminio

12. **6082**
    - Wieland – https://www.wieland.com/da/content/download/17142/file/EN-AW-6082_EN.pdf (esistono anche versioni DE, walz, EX)
    - Hydro – https://hydro.com/globalassets/08-about-hydro/hydro-worldwide/austria/nenzing/alloy-data-sheets/hydro-en-aw-6082.pdf (dichiara limiti interni più stretti della norma: **non usarlo per i limiti di norma**)
13. **7075**
    - Wieland – https://www.wieland.com/cn/content/download/17181/file/EN-AW-7075_EN.pdf (anche walz: `.../17120/file/EN-AW-7075_walz_EN.pdf`)
    - Seconda fonte da produttore: da trovare.
14. **2024**
    - Wieland – https://www.wieland.com/da/content/download/17161/file/EN-AW-2024_EN.pdf
    - Aubert & Duval – https://www.aubertduval.com/wp-content/uploads/2024/12/2024_GB.pdf
    - Indizio non verificato: discordanza tra fonti sulla densità.
15. **5083**
    - Wieland – https://www.wieland.com/de/content/download/17169/file/EN-AW-5083_EN.pdf (anche walz: `.../17122/file/EN-AW-5083_walz_EN.pdf`)
    - Seconda fonte da produttore: da trovare.
    - Constellium: cercata, nessuna scheda delle leghe 6082/7075/2024/5083 trovata.

### Titanio

16. **Titanio grado 2 (UNS R50400, 3.7035)**
    - ATI (pagina; scheda PDF da individuare) – https://www.atimaterials.com/Products/ati-cp2
    - Rolled Alloys – https://rolledalloys.com/wp-content/uploads/TiGrade2_DS_USA-1.pdf
    - Nota: le schede ATI possono riportare valori tipici e non limiti; per i limiti serve un documento che citi la specifica (ASTM B265).
17. **Ti-6Al-4V**
    - ATI – https://www.atimaterials.com/Products/Documents/datasheets/titanium/alloyed/ati_6-4_tds_en_v1.pdf
    - Zapp – https://www.zapp.com/fileadmin/_documents/Downloads/materials/high_performance_alloys/en/TiAl6V4-Grade5-Datasheet.pdf

### Rame, ottone, stagno

18. **Ottone CuZn39Pb3 (CW614N)**
    - Diehl (EN) – https://www.diehl.com/cms/files/Diehl_Brass_Solutions_Material_Datasheet_002.pdf
    - Diehl (DE) – https://www.diehl.com/cms/files/Diehl_Brass_Solutions_Werkstoffdatenblatt_002.pdf
    - Wieland – https://www.wieland.com/fr/content/download/9754/file/Z32-Z33_EX_DE.pdf (possibili nomi commerciali Z32/Z33: da verificare, equivalenza non assunta)
19. **Rame (proposta Cu-ETP, CW004A)**
    - Aurubis – https://www.aurubis.fi/wp-content/uploads/2020/06/CU_ETP.pdf
    - Kemper – https://www.kemper-group.com/media/de-at/content/04-produkte/walzprodukte/datenblaetter/cu-etp.pdf
    - Aperto: «rame» generico = Cu-ETP? Trattarlo come elemento puro (simbolo) o come lega con limiti da norma?
20. **Stagno (Sn) – A RISCHIO ESCLUSIONE**
    - Nessun documento di produttore trovato: solo rivenditori e tabelle di costanti fisiche (non ammessi).
    - Da provare: Indium Corporation – https://www.indium.com/products/metals/tin/ (rimanda a una «Commercial Tin Metal PDS», non aperta); Goodfellow – https://www.goodfellow.com/usa/material/metals/tin
    - Se nessun documento ammesso riporta la densità, la voce non entra.

### Nichel

21. **Inconel 718**
    - Special Metals – https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-718.pdf
    - Una copia mirror del documento (aerospacemetals.com) esiste: non ammessa.

## Controllo di raggiungibilità (2026-11-13)

Richiesta HTTP dei soli primi 2 KB, contenuto scartato: serve solo a sapere se l'URL esiste.

- **PDF raggiungibile:**
  - Lucefin, solo su `www.lucefin.com`: `wp-content/files_mf/<id>.pdf` (42CrMo4, 100Cr6, S355J2, 1.4301, 1.4401, 1.4542, 1.2344, 1.2379) e `wp-content/uploads/2025/01/ENG-*.pdf` (16MnCr5, 11SMnPb30)
  - Swiss Steel (`www.` reindirizza a `swisssteel-group.com`; il server a volte chiude la connessione: ritentare con pause)
  - Ovako (16MnCr5 e S355J2 in PDF; 100Cr6 solo pagina HTML)
  - Saarstahl C45, thyssenkrupp 42CrMo4, Special Metals Inconel 718, Aubert & Duval 2024, ATI Ti-6Al-4V, Diehl (EN e DE)
- **Solo pagina HTML raggiungibile:** Böhler K110, ATI CP2, Indium (stagno), Goodfellow (stagno), Rolled Alloys (radice con `www`).
- **URL del censimento non più validi:**
  - Lucefin su `lucefin.com` senza `www` (404): l'host senza `www` non serve
  - BGH 1.4542 (404)
  - Fagersta/Marcegaglia 17-4PH (404)
  - Wieland: tutti i PDF trovati danno 404, la home risponde: gli indirizzi attuali vanno cercati dal sito
  - Böhler: i PDF W302 vengono reindirizzati alla home: le schede vanno cercate dalla pagina prodotto
- **Host aggiunti all'ambiente dopo il controllo:** `rolledalloys.com` (il PDF grado 2 è su questo nome: ora raggiungibile) e `www.aurubis.com` (`www.aurubis.fi` reindirizza lì).
- **Rifiutati dal sito al client automatico (non aggirati):** Aperam (HTTP 403) e Aurubis su `www.aurubis.com` (HTTP 406, host raggiungibile ma documento rifiutato). Per il 304 restano Swiss Steel e Lucefin. Per il rame serve un'altra fonte (candidato rinviato: Kemper).

### Sintesi per voce (PDF raggiungibile oggi ≠ valore verificato: nessun documento è ancora letto)

- **Con almeno un PDF raggiungibile (16):** C45, 42CrMo4, 16MnCr5, 100Cr6, S355J2, 11SMnPb30, 304, 316, 17-4PH (solo Lucefin), 1.2344, 1.2379, 2024, Ti grado 2, Ti-6Al-4V, CuZn39Pb3, Inconel 718.
- **Senza documento raggiungibile oggi (5):** alluminio 6082, 7075 e 5083 (PDF Wieland 404: indirizzi attuali da cercare dal sito), rame (Aurubis rifiuta), stagno (nessuna scheda di produttore trovata).

## Host necessari (24 individuati, nomi esatti, nessun wildcard)

La richiesta dell'ambiente accetta al massimo 20 host. Prima richiesta: 20 host. Rinviati (seconde fonti,
da aggiungere solo se servono, con una nuova approvazione): `www.thyssenkrupp-steel.com`, `hydro.com`,
`www.zapp.com`, `www.kemper-group.com`.

| Host | Serve per |
|---|---|
| www.lucefin.com, lucefin.com | schede acciai (entrambi i nomi compaiono negli URL) |
| www.swisssteel-group.com, swisssteel-group.com | schede acciai e inox (entrambi i nomi compaiono) |
| steelnavigator.ovako.com | 16MnCr5, 100Cr6, S355J2 |
| en.saarstahl.com | C45 (1.0503) |
| ucpcdn.thyssenkrupp.com | 42CrMo4 |
| www.thyssenkrupp-steel.com (rinviato) | 16MnCr5 (terza fonte) |
| bgh.de | 17-4PH |
| www.fagersta.marcegaglia.com | 17-4PH |
| www.bohler-edelstahl.com | 1.2344, 1.2379 (e nomi commerciali) |
| www.aperam.com | 304 |
| www.specialmetals.com | Inconel 718 |
| www.wieland.com | 6082, 7075, 2024, 5083, ottone |
| hydro.com (rinviato) | 6082 (seconda fonte) |
| www.aubertduval.com | 2024 (seconda fonte) |
| www.atimaterials.com | Ti grado 2, Ti-6Al-4V |
| www.zapp.com (rinviato) | Ti-6Al-4V (seconda fonte) |
| www.rolledalloys.com | Ti grado 2 (seconda fonte) |
| www.aurubis.fi | rame |
| www.kemper-group.com (rinviato) | rame (seconda fonte) |
| www.diehl.com | ottone CuZn39Pb3 |
| www.indium.com | stagno |
| www.goodfellow.com | stagno |

Se un download viene reindirizzato a un host non in elenco, il proxy lo blocca: l'host si segnala e si aggiunge con una nuova approvazione.

## Lotto 2 (da pianificare nel report della Fase 1)

Ferro, ghise, bronzo, S235JR (richiesti). Proposti in aggiunta: 304L e 316L. Fonti non ancora cercate.
