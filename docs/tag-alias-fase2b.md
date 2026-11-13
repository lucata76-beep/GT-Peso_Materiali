# Tag e alias – Fase 2b

Generato da `node tools/report-tag.mjs` sul DB v3 del 2026-11-13. Non modificare a mano: si rigenera.

## Regole

- **Tag**: una voce ha un tag solo se un documento ammesso lo afferma; per ogni tag il DB conserva documento, pagina e frase (o tabella). Il validatore rifiuta tag senza prove, fuori vocabolario o con prove di fonti che non dichiarano il campo «tag».
- **«da tempra»** è separato da «da bonifica»: solo per acciai per utensili o cuscinetti i cui documenti riportano la durezza in HRC dopo la tempra (tabella o valore); la sola dicitura «through hardening» non basta.
- **Sinonimi di ricerca** (es. temprato, temprabile, bonificato, bonificabile): sono logica della ricerca nel codice, non dati dei materiali. «bonifica» non è sinonimo di «da tempra».
- **Nomi neutri delle famiglie** (acciaio, alluminio, rame, ottone, titanio, inox, stagno): trovano le voci a priorità bassa, con «trovato per: famiglia (classificazione dell'app)» quando la parola non è nel nome. I nomi delle famiglie di trattamento («Acciai da bonifica», «Acciai per utensili») non sono testo cercabile.
- **Alias**: campo `alias` con fonti. Con un documento del produttore l'origine è «produttore»; altrimenti servono almeno 2 documenti di emittenti indipendenti (distributori, fornitori di lavorazioni, tesi o articoli tecnici), mai aggregatori (Wikipedia, Scribd, MatWeb…); questi documenti valgono solo per gli alias, mai per i dati numerici. In DB e a schermo: «alias non da produttore».
- **Tag d'uso** (marino, aeronautico, elettrotecnico): non previsti per ora.

## Tag per voce

### C45E (`c45e`, Acciai da bonifica)

- **da bonifica**
  - Lucefin Group, «Scheda dati C45E (ISO 683-1:2018), rev. 2024», pag. 1: «Acciaio da bonifica» (intestazione della scheda)

### 42CrMo4 (`42crmo4`, Acciai da bonifica)

- **da bonifica**
  - Lucefin Group, «Technical card 42CrMo4 (ISO 683-2:2018), rev. 2018», pag. 1: «Quenching and Tempering Steel» (intestazione della scheda)

### 16MnCr5 (`16mncr5`, Acciai legati)

- **da cementazione**
  - Lucefin Group, «Technical card 16MnCr5 (ISO 683-3:2018), rev. 2024», pag. 1: «Case-hardening Steel» (intestazione della scheda)
  - Ovako, «Steel Navigator, scheda 16MnCr5 (PDF dal sito)», pag. 1: «16MnCr5 is an alloyed case hardening steel»

### 100Cr6 (`100cr6`, Acciai legati)

- **per cuscinetti**
  - Lucefin Group, «Technical card 100Cr6 (ISO 683-17:2014), rev. 2018», pag. 1: «Bearing Steel» (intestazione della scheda)
  - Swiss Steel Group (Deutsche Edelstahlwerke), «Durapur 3505, Werkstoffdatenblatt 100Cr6 / 1.3505, 16/10/2015», pag. 1: «WÄLZLAGERSTAHL» (intestazione della scheda)
  - Ovako, «Steel Navigator, scheda 100Cr6 (PDF dal sito)», pag. 1: «100Cr6 is a through hardening bearing steels»
- **da tempra**
  - Lucefin Group, «Technical card 100Cr6 (ISO 683-17:2014), rev. 2018», pag. 1: tabella «Table of tempering values … after quenching at 840 °C in oil»: HRC 65 64 63 62 59 57 54 51 47 44 (rinvenimento a 50…500 °C)
  - Ovako, «Steel Navigator, scheda 100Cr6 (PDF dal sito)», pag. 3: tabella delle varianti: «+Q/T(m) … 61 HRC typical» (temprato e rinvenuto)

### S355J2 (`s355j2`, Acciai al carbonio)

- **da costruzione**
  - Ovako, «Steel Navigator, scheda S355J2 (PDF dal sito)», pag. 1: «S355J2 is a micro alloyed structural steel»
  - Lucefin Group, «Technical card S355J2 (EN 10025-2:2014), rev. 2018», pag. 1: «Steel for general engineering» (intestazione della scheda)

### 11SMnPb30 (`11smnpb30`, Acciai al carbonio)

- **automatico**
  - Lucefin Group, «Technical card 11SMnPb30 (ISO 683-4:2018), rev. 2024», pag. 1: «Free-cutting Steel» (intestazione della scheda)
  - Swiss Steel Group (Steeltec), «Technical Datasheet SwissCut, 28.06.23 Rev. N°1», pag. 1: «Special Free-Cutting Steels»

### Inox 304 (1.4301) (`304`, Acciai inox)

- **inox**
  - Lucefin Group, «Technical card 1.4301 X5CrNi18-10 (EN 10088-3:2014), 2018», pag. 1: «Austenitic Stainless Steel» (intestazione della scheda)
  - Swiss Steel Group (Deutsche Edelstahlwerke), «Datasheet 1.4301 Chromium-nickel austenitic stainless steel», pag. 1: «Chromium-nickel austenitic stainless steel»
- **austenitico**
  - Lucefin Group, «Technical card 1.4301 X5CrNi18-10 (EN 10088-3:2014), 2018», pag. 1: «Austenitic Stainless Steel» (intestazione della scheda)
  - Swiss Steel Group (Deutsche Edelstahlwerke), «Datasheet 1.4301 Chromium-nickel austenitic stainless steel», pag. 1: «Chromium-nickel austenitic stainless steel»

### Inox 316 (1.4401) (`316`, Acciai inox)

- **inox**
  - Lucefin Group, «Technical card 1.4401 X5CrNiMo17-12-2 (EN 10088-3:2014), 2018», pag. 1: «Austenitic Stainless Steel» (intestazione della scheda)
  - Swiss Steel Group (Deutsche Edelstahlwerke), «Acidur 4401, Werkstoffdatenblatt 1.4401, 02/12/2015», pag. 1: «NICHTROSTENDER AUSTENITISCHER STAHL»
- **austenitico**
  - Lucefin Group, «Technical card 1.4401 X5CrNiMo17-12-2 (EN 10088-3:2014), 2018», pag. 1: «Austenitic Stainless Steel» (intestazione della scheda)
  - Swiss Steel Group (Deutsche Edelstahlwerke), «Acidur 4401, Werkstoffdatenblatt 1.4401, 02/12/2015», pag. 1: «NICHTROSTENDER AUSTENITISCHER STAHL»

### Inox 17-4PH (1.4542) (`17-4ph`, Acciai inox)

- **inox**
  - Lucefin Group, «Technical card 1.4542 X5CrNiCuNb16-4 17-4 PH (EN 10088-3:2014), 2018», pag. 1: «Precipitation hardening Stainless Steel» (intestazione della scheda)
- **indurente per precipitazione**
  - Lucefin Group, «Technical card 1.4542 X5CrNiCuNb16-4 17-4 PH (EN 10088-3:2014), 2018», pag. 1: «Precipitation hardening Stainless Steel» (intestazione della scheda)
  - Marcegaglia Specialties, Fagersta Stainless, «R565.10 (17-4 PH), ENG 2025, Edition 1», pag. 1: «a martensitic precipitation-hardening steel»

### Acciaio per utensili 1.2344 (H13) (`1.2344`, Acciai per utensili)

- **per utensili a caldo**
  - voestalpine BÖHLER Edelstahl, «Data sheet BÖHLER W302 ISOBLOC», pag. 1: «HOT WORK TOOL STEELS» (W302 ISOBLOC)
  - voestalpine BÖHLER Edelstahl, «Data sheet BÖHLER W302 ISODISC», pag. 1: «HOT WORK TOOL STEELS» (W302 ISODISC)
- **da tempra**
  - Lucefin Group, «Technical card 1.2344 X40CrMoV5-1 (UNI EN ISO 4957:2002), rev. 2018», pag. 1: tabella «Tempering table after quenching at 1040 °C in oil»: HRC 55 54 53 52 51,5 52 53 54 56 56 52 48 42 32 (rinvenimento a 50…700 °C)
  - voestalpine BÖHLER Edelstahl, «Data sheet BÖHLER W302 ISOBLOC», pag. 2: «Hardness (HRC) 40 to 55 | bars hardened and tempered (BHT)»
  - Swiss Steel Group, «Technical datasheet Thermodur 2344 EFS, 10.05.23 Rev.00», pag. 2: «Hardening 1010 – 1030 °C … 54 HRC (after quenching)»

### Acciaio per utensili 1.2379 (D2) (`1.2379`, Acciai per utensili)

- **per utensili a freddo**
  - voestalpine BÖHLER Edelstahl, «Data sheet BÖHLER K110», pag. 1: «COLD WORK TOOL STEELS»
- **da tempra**
  - Lucefin Group, «Technical card 1.2379 X153CrMoV12 (UNI EN ISO 4957:2002), rev. 2018», pag. 1: tabella «Table of tempering after quenching at 1020 °C in oil»: HRC 64 63,5 63 62 61 60 58,5 58,5 59,5 59,5 57,5 50 36 (rinvenimento a 50…700 °C)

### Ottone CuZn39Pb3 (CW614N) (`cuzn39pb3`, Rame, ottone, bronzo)

- **automatico**
  - Diehl Brass Solutions, «Material Datasheet 002 (CuZn39Pb3)», pag. 1: «Standard material for automated machining»

### Inconel 718 (`inconel718`, Altri)

- **indurente per precipitazione**
  - Special Metals Corporation, «INCONEL® alloy 718, pubblicazione SMC-045 (Sept 07)», pag. 1: «The age-hardenable alloy can be readily fabricated»

## Voci senza tag

Nessun tag del vocabolario è affermato dai documenti letti per queste voci; nessun tag è stato dedotto dal nome o dalla famiglia:

- Alluminio 6082 (`6082`)
- Alluminio 7075 (`7075`)
- Alluminio 2024 (`2024`)
- Alluminio 5083 (`5083`)
- Titanio grado 2 (CP) (`ti-gr2`)
- Titanio Ti-6Al-4V (grado 5) (`ti-6al-4v`)
- Rame Cu-ETP (CW004A) (`cu-etp`)
- Stagno (Sn) (`sn`)

## Alias

### Alluminio 7075 (`7075`)

- **Ergal** (alias non da produttore)
  - Weerg, «Scheda tecnica v2.1 «Alluminio 7075», Lavorazione CNC (ultima revisione 28/10/2024)», pag. 1: «Alluminio 7075» e, sotto, «Ergal / 9007/2 / AlZnMgCu1.5 / 3.4365 / 2L95/L160 / A-ZGU / P-AlZn5.8MgCu» (elenco delle designazioni della lega)
  - Università Politecnica delle Marche, «Tesi di laurea triennale in Ingegneria meccanica, a.a. 2018/2019: «Ruolo degli alliganti nei trattamenti termici di una lega Al-Zn-Cu-Mg»», pag. 4: «Nel 1936 fu introdotta la 7075, chiamata Ergal»
  - Università Politecnica delle Marche, «Tesi di laurea triennale in Ingegneria meccanica, a.a. 2018/2019: «Ruolo degli alliganti nei trattamenti termici di una lega Al-Zn-Cu-Mg»», pag. 40: «… ciò è anche vero per la 7075 (Ergal) …»
  - Università Politecnica delle Marche, «Tesi di laurea triennale in Ingegneria meccanica, a.a. 2018/2019: «Ruolo degli alliganti nei trattamenti termici di una lega Al-Zn-Cu-Mg»», pag. 17: tabella dei nomi commerciali: «ERGAL, Leghe Al-Zn-Mg-Cu … ERGAL 55=7075 … ERGAL 65=7049»
  - Nota: La tesi (pag. 17) elenca «Ergal» anche come nome di una famiglia di leghe Al-Zn-Mg-Cu: ERGAL 55 = 7075, ERGAL 65 = 7049. Negli altri passaggi, e nella scheda Weerg, «Ergal» indica la 7075.

### Documenti usati per gli alias (solo per gli alias, mai per i dati numerici)

| id | Emittente | Ruolo | Documento | URL | SHA-256 (16 car.) |
|---|---|---|---|---|---|
| WEE-7075 | Weerg | fornitore di lavorazioni (lavorazioni CNC) | Scheda tecnica v2.1 «Alluminio 7075», Lavorazione CNC (ultima revisione 28/10/2024) | https://www.weerg.com/hubfs/Datasheets/Datasheets%202024/ITA/IT_Alluminio7075.pdf | `1826df0816524aa8` |
| UPM-ERGAL | Università Politecnica delle Marche | tesi o articolo tecnico | Tesi di laurea triennale in Ingegneria meccanica, a.a. 2018/2019: «Ruolo degli alliganti nei trattamenti termici di una lega Al-Zn-Cu-Mg» | https://tesi.univpm.it/retrieve/3635655c-26a5-4a03-9202-85bc2542bb29/Ruolo%20degli%20alliganti%20nei%20trattamenti%20termici%20di%20una%20lega%20Al-Zn-Cu-Mg%20.pdf | `9a6fb4cb538877b7` |

Totale: 19 tag in 13 voci (33 prove con documento e pagina), 1 alias.
