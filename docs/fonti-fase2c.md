# Fonti – Fase 2c (nuovi materiali e alias)

Letto il 2026-11-14. Registro di ogni documento letto per la Fase 2c: URL, SHA-256 completo, pagine e frasi o celle. Generato da `tools/genera-registro-fonti-2c.py` a partire dal dump di `tools/costruisci_db.py`.
Le pagine sono quelle del PDF (non quelle stampate), tranne dove indicato. Ogni prova è stata cercata nel testo della pagina citata; l'unica eccezione è il catalogo IMS, un PDF fotografico senza testo, letto a vista.

## Regole applicate

- Nessun valore a memoria: ogni valore ha pagina e frase o tabella; ciò che non si verifica non entra.
- **Fonti indipendenti** = documenti di produttori o enti diversi. Due schede dello stesso ente (per esempio Lucefin in italiano e in inglese) contano come UNA fonte.
- I due PDF forniti da Luca (IMS e Moretti) valgono solo come fonte di alias e di corrispondenze indicative, non di densità, tag o composizione.
- Un alias con un solo documento non-aggregatore entra con l'etichetta «una sola fonte» (uso personale, decisione di Luca); la regola vale solo per gli alias.
- **Valore tipico**: una lettura di densità porta `tipico: true` solo se il documento la dichiara tale (dal DB v4: vedi la sezione «Valore tipico» più sotto). L'app scrive «valore tipico» solo se tutte le letture della voce lo sono.

## Documenti usati

| id | Emittente | Documento | URL | SHA-256 |
|---|---|---|---|---|
| LUC-39NI-IT | Lucefin Group | Scheda dati 39NiCrMo3 (EN 10083-3:2006), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/152353575939NiCrMo3.pdf | `779f0d8b41b866b765b3f75adc9c8a23b927f5b6d37a2efeabea2ca221755a5a` |
| LUC-39NI-EN | Lucefin Group | Technical card 39NiCrMo3 (EN 10083-3:2006), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/152353577239NiCrMo3.pdf | `4051113e566789955cd1139bf254476a3577a6c793e7dc180165656abe2f2796` |
| IMS-NCM2 | IMS S.p.A. | Catalogo IMS S.p.A. acciai speciali, pag. 61-62, scheda 39NiCrMo3 (foto del catalogo fornita da Luca) | nessun URL: copia fornita da Luca | `da15e58b86da4924bfe01b0e49ec4d36f76413b0b5209ba7ac0171d6174d5981` |
| LUC-4462-IT | Lucefin Group | Scheda dati 1.4462 X2CrNiMoN22-5-3 (EN 10088-3:2014), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/15235426851.4462Tp2205.pdf | `4d9bdc7292589a12c1a15655174fa9fd3979e009821366c1e6f583b9429f2656` |
| LUC-4462-EN | Lucefin Group | Technical card 1.4462 X2CrNiMoN22-5-3 (EN 10088-3:2014), 2018 | https://www.lucefin.com/wp-content/files_mf/15235426741.4462Tp2205.pdf | `70728194ead6d460fbeff6a55efef0751a177d1d21489af81e4621bf80f8a49a` |
| SWI-4462 | Swiss Steel Group (Deutsche Edelstahlwerke) | Datasheet 1.4462 Stainless duplex austenitic-ferritic, chromium nickel molybdenum steel | https://swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/Datenblatt_4462_UK.pdf | `af254aac1bc79f1385b53a6f0ee40520a3b5bea41c58029351b0f63e870ec85c` |
| ALL-2205 | Alleima | SAF™ 2205 Billets, Datasheet (aggiornato 09.05.2025) | https://www.alleima.com/contentassets/ec1159b850fd417195a24799c0c0bab5/datasheet-saf-2205-en-v2025-05-09-0638-version-1.pdf/download | `148ac37d845e9bbd0ee638b849cb010ae2f6f9e25e29042b12c0b75784dac244` |
| LUC-12343 | Lucefin Group | Technical card 1.2343 X37CrMoV5-1 (UNI EN ISO 4957:2002), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/15236074671.2343X37CrMoV51.pdf | `16f46c74c0dc70b832c1604f93ade3f3ec4493fe9273851349be1a030df16d69` |
| BOE-W300B | voestalpine BÖHLER Edelstahl | Data sheet BÖHLER W300 ISOBLOC | https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w300-isobloc_en_gb.pdf | `ab2f5a4b61ad99818b40f8e0f51327ad2b4976f08a681f03c340baae05d9e808` |
| BOE-W300D | voestalpine BÖHLER Edelstahl | Data sheet BÖHLER W300 ISODISC | https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w300-isodisc_en_gb.pdf | `166b02130553f82c433d409a3eb1b4888d2f0ab31f43df64b5366faca07d3f48` |
| SWI-2343 | Swiss Steel Group | Technical datasheet Thermodur 2343 EFS, 10.05.23 Rev.00 | https://swisssteel-group.com/content-media/documents/_import/1.2343_en.pdf | `b58af96865a1abdf73e34ea5e06e7b7bc7019131d4d9a5c3fa12bdaf539e0ef0` |
| LUC-12311 | Lucefin Group | Technical card 1.2311 40CrMnMo7, rev. 2018 | https://www.lucefin.com/wp-content/files_mf/15236072261.231140CrMnMo7.pdf | `e0bcb81dfd1f1f2abd030ce3b3fd8df18afa3002d942efd0f341d24184b5ff1a` |
| SWI-2311 | Swiss Steel Group | Data Sheet Formadur 2311, 28.04.26 REV.2 | https://swisssteel-group.com/content-media/documents/_import/20260428_SSG_DataSheets_Formadur2311_en_02.pdf | `04bcb829718929f533eebe777404c67ac4fe9c2bd3d36d4b8da8b05c97dbd9a1` |
| OVA-S235 | Ovako | Steel Navigator, scheda S235JR (PDF dal sito, rev. 31 Jan 2025) | https://steelnavigator.ovako.com/steel-grades/s235/pdf | `ba996a03822437ebbd9c4b1ce146fae0f8fabcb5caf3e4877f4d3e077ab1be14` |
| LUC-S235JR | Lucefin Group | Scheda dati S235JR (EN 10025-2:2004), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/1522934592S235JR.pdf | `1c4db093c8af9a774c25375313304e0b5a567c25362b752c30eace9fc1e798ab` |
| OVA-C45 | Ovako | Steel Navigator, scheda C45 (PDF dal sito, rev. 30 Jan 2025) | https://steelnavigator.ovako.com/steel-grades/c45/pdf | `ff224f8fd5cea4b689a8995955ceda01f132b54ee5df33fc52baba084ce8e97e` |
| MAR-BON | Marcegaglia Plates | Brochure «Steels for quenching and tempering / Acciai da bonifica», Marcegaglia Plates, April 2026 EN-IT | https://www.publications.marcegaglia.com/wp-content/uploads/2026/04/Marcegaglia-Plates-Bonifica.pdf | `3bdaded4068f932749098ad276bd7107b4f8a6234070c22390f31ea9df2c6810` |
| MOR-CWS | Moretti Acciai S.p.A. | Scheda «CWS 1.2379 Cold Working Steel», Moretti Acciai S.p.A. (PDF del 14.12.2018, fornita da Luca) | nessun URL: copia fornita da Luca | `5bfa00348f185e75efeb6f2f0859655313c2bbf9de86f42b87e26f207547eee4` |

## Prove per documento

### LUC-39NI-IT — Lucefin Group

Scheda dati 39NiCrMo3 (EN 10083-3:2006), rev. 2018

- voce `39nicrmo3`, densità, pag. 2: Massa Volumica Kg/dm3 7.85
- voce `39nicrmo3`, composizione, pag. 1: 0,35-0,43 0,40 0,50-0,80 0,025 0,035 0,60-1,00 0,15-0,25 0,70-1,00
- voce `39nicrmo3`, composizione, pag. 1: EN 10083-3: 2006
- voce `39nicrmo3`, designazioni, pag. 1: Numero 1.6510
- voce `39nicrmo3`, designazioni, pag. 2: EN UNI UNE DIN AFNOR B.S. SS AISI/SAE 39NiCrMo3 39NiCrMo3 F1282 36CrNiMo4 40NCD3 9840
- voce `39nicrmo3`, corrispondenze indicative, pag. 2: EN UNI UNE DIN AFNOR B.S. SS AISI/SAE 39NiCrMo3 39NiCrMo3 F1282 36CrNiMo4
- voce `39nicrmo3`, tag, pag. 1: «Acciaio da bonifica» (intestazione della scheda)

### LUC-39NI-EN — Lucefin Group

Technical card 39NiCrMo3 (EN 10083-3:2006), rev. 2018

- voce `39nicrmo3`, densità, pag. 2: Density Kg/dm3 7.85
- voce `39nicrmo3`, designazioni, pag. 1: Number 1.6510
- voce `39nicrmo3`, designazioni, pag. 2: EN UNI GB DIN AFNOR B.S. GOST AISI/SAE 39NiCrMo3 39NiCrMo3 36CrNiMo4 40NCD3 39HNM 9840
- voce `39nicrmo3`, tag, pag. 1: «Quenching and Tempering Steel» (intestazione della scheda)

### IMS-NCM2 — IMS S.p.A.

Catalogo IMS S.p.A. acciai speciali, pag. 61-62, scheda 39NiCrMo3 (foto del catalogo fornita da Luca) (lettura a vista: PDF fotografico senza testo)

- voce `39nicrmo3`, alias, pag. 1: pag. 61 del catalogo (pagina 1 del PDF), tabella «Corrispondenze / Comparable standards»: colonna SIAU, cella «NCM2» (lettura a vista: PDF fotografico senza testo)
- voce `39nicrmo3`, corrispondenze indicative, pag. 1: pag. 61, tabella «Corrispondenze»: DIN «(36CrNiMo4)», W.N. «(1.6511)», AFNOR «(40NCD3)», AISI/SAE «(9840)», tutti scritti tra parentesi (lettura a vista)

### LUC-4462-IT — Lucefin Group

Scheda dati 1.4462 X2CrNiMoN22-5-3 (EN 10088-3:2014), rev. 2018

- voce `1.4462`, densità, pag. 2: Densità Kg/dm3 7.80
- voce `1.4462`, designazioni, pag. 1: Numero 1.4462
- voce `1.4462`, designazioni, pag. 2: EN UNS ASTM GB GOST JIS IS KS X2CrNiMoN22-5-3 S31803 Type 2205
- voce `1.4462`, tag, pag. 1: «Acciaio Inossidabile … Austenitico-Ferritico (Duplex)» (intestazione della scheda)
- voce `1.4462`, tag, pag. 1: «Austenitico-Ferritico (Duplex)» (intestazione della scheda)

### LUC-4462-EN — Lucefin Group

Technical card 1.4462 X2CrNiMoN22-5-3 (EN 10088-3:2014), 2018

- voce `1.4462`, densità, pag. 2: Density Kg/dm3 7.80
- voce `1.4462`, composizione, pag. 1: 0,03 1,00 2,00 0,035 0,015 21,0-23,0 4,5-6,5 0,10-0,22 2,5-3,5 EN 10088-3: 2014
- voce `1.4462`, designazioni, pag. 1: Number 1.4462
- voce `1.4462`, designazioni, pag. 2: EN UNS ASTM GB GOST JIS IS KS X2CrNiMoN22-5-3 S31803 Type 2205
- voce `1.4462`, tag, pag. 1: «Austenitic-Ferritic Stainless Steel (Duplex)» (intestazione della scheda)

### SWI-4462 — Swiss Steel Group (Deutsche Edelstahlwerke)

Datasheet 1.4462 Stainless duplex austenitic-ferritic, chromium nickel molybdenum steel

- voce `1.4462`, densità, pag. 1: density (kg/dm3) 7.80
- voce `1.4462`, composizione, pag. 1: C max. 0.03 Cr 21.00 – 23.00 Ni 4.50 – 6.50 Mo 2.50 – 3.50 N 0.12 – 0.22
- voce `1.4462`, designazioni, pag. 1: ASTM A182F51
- voce `1.4462`, designazioni, pag. 1: UNS S31803
- voce `1.4462`, designazioni, pag. 1: BS 318S13
- voce `1.4462`, designazioni, pag. 1: JIS 329J3L
- voce `1.4462`, designazioni, pag. 1: AFNOR Z3CND 22-05 Az
- voce `1.4462`, designazioni, pag. 1: SIS 2377
- voce `1.4462`, tag, pag. 1: «1.4462 Stainless duplex austenitic-ferritic, chromium nickel molybdenum steel»
- voce `1.4462`, tag, pag. 1: «Stainless duplex austenitic-ferritic»

### ALL-2205 — Alleima

SAF™ 2205 Billets, Datasheet (aggiornato 09.05.2025)

- voce `1.4462`, densità, pag. 11: Density: 7.8 g/cm3
- voce `1.4462`, designazioni, pag. 1: UNS: S31803
- voce `1.4462`, designazioni, pag. 1: EN Number: 1.4462
- voce `1.4462`, designazioni, pag. 1: ﬂanges etc. according to ASTM A-182 Grade F51 Analysis according to ASTM A-479, UNS S31803
- voce `1.4462`, nome commerciale, pag. 1: SAF™ 2205 is a duplex (austenitic-ferritic) stainless steel
- voce `1.4462`, tag, pag. 1: «SAF 2205 is a duplex (austenitic-ferritic) stainless steel»

### LUC-12343 — Lucefin Group

Technical card 1.2343 X37CrMoV5-1 (UNI EN ISO 4957:2002), rev. 2018

- voce `1.2343`, densità, pag. 1: Density Kg/dm 3 7.80 7.64 7.60
- voce `1.2343`, composizione, pag. 1: 0,33-0,41 0,80-1,20 0,25-0,50 0,030 0,020 4,80-5,50 1,10-1,50 0,30-0,50
- voce `1.2343`, composizione, pag. 1: UNI EN ISO 4957: 2002
- voce `1.2343`, designazioni, pag. 1: Number 1.2343
- voce `1.2343`, designazioni, pag. 1: EN DIN GB JIS IS KS GOST AISI/SAE X37CrMoV5-1 X38CrMoV5-1 4Cr5MoSiV SKD 6 XT35Cr5Mo1V3 STD 6 4Ch5MFS H 11
- voce `1.2343`, tag, pag. 1: tabella «Tempering table after quenching at 1020 °C in oil»: HRC 54 53 52,5 52 52 52,5 53,5 54,5 55,5 56 52 46 39 30 (rinvenimento a 50…700 °C)

### BOE-W300B — voestalpine BÖHLER Edelstahl

Data sheet BÖHLER W300 ISOBLOC

- voce `1.2343`, densità, pag. 5: Density (kg/dm³) 7.8
- voce `1.2343`, designazioni, pag. 2: 1.2343 SEL 4957 EN ISO X37CrMoV5-1 EN #207 NADCA T20811 UNS G4404 JIS H11 AISI D1830 NADCA SKD6 JIS
- voce `1.2343`, nome commerciale, pag. 1: BÖHLER W300 ISOBLOC is a 5% chromium steel and corresponds to material number 1.2343 (X37CrMoV5-1)
- voce `1.2343`, tag, pag. 1: «HOT WORK TOOL STEELS» (W300 ISOBLOC)
- voce `1.2343`, tag, pag. 2: «Hardness (HRC) 40 to 55 | bars hardened and tempered (BHT)»

### BOE-W300D — voestalpine BÖHLER Edelstahl

Data sheet BÖHLER W300 ISODISC

- voce `1.2343`, densità, pag. 5: Density (kg/dm³) 7.8
- voce `1.2343`, nome commerciale, pag. 1: BÖHLER W300 ISODISC is a 5% chromium steel and corresponds to material number 1.2343 (X37CrMoV5-1)
- voce `1.2343`, tag, pag. 1: «HOT WORK TOOL STEELS» (W300 ISODISC)

### SWI-2343 — Swiss Steel Group

Technical datasheet Thermodur 2343 EFS, 10.05.23 Rev.00

- voce `1.2343`, designazioni, pag. 1: X37CrMoV5-1 1.2343 H11 BH11 Z38CDV5 SKD6 4Ch5MFS F.520.G
- voce `1.2343`, nome commerciale, pag. 1: Thermodur®2343 EFS
- voce `1.2343`, tag, pag. 1: «Hot work tool steel for universal application»
- voce `1.2343`, tag, pag. 2: «Hardening 1010 – 1030 °C … 54 HRC (after quenching)»

### LUC-12311 — Lucefin Group

Technical card 1.2311 40CrMnMo7, rev. 2018

- voce `1.2311`, densità, pag. 1: Density Kg/dm3 7.83
- voce `1.2311`, composizione, pag. 1: 0,35-0,45 0,20-0,40 1,30-1,60 0,035 0,035 1,80-2,10 0,15-0,25
- voce `1.2311`, designazioni, pag. 1: Number 1.2311
- voce `1.2311`, designazioni, pag. 1: EN DIN GB JIS IS KS GOST AISI/SAE 40CrMnMo7 5CrMnMo ~
- voce `1.2311`, tag, pag. 1: «Supply conditions: … Quenched and Tempered HB 280-330»

### SWI-2311 — Swiss Steel Group

Data Sheet Formadur 2311, 28.04.26 REV.2

- voce `1.2311`, designazioni, pag. 1: 40CrMnMo7 Plastic Mould Steel 28.04.26 REV.2. AISI P20 / AFNOR 40CMD8
- voce `1.2311`, nome commerciale, pag. 1: Formadur ® 2311
- voce `1.2311`, tag, pag. 1: «Quenched and tempered» (intestazioni delle proprietà fisiche); durezza alla consegna 280-325 HB

### OVA-S235 — Ovako

Steel Navigator, scheda S235JR (PDF dal sito, rev. 31 Jan 2025)

- voce `s235jr`, densità, pag. 3: Other properties (typical values) Youngs module (GPa) Poisson´s ratio (-) Shear module (GPa) Density (kg/m3) 210 0.3 80 7800
- voce `s235jr`, composizione, pag. 1: S235JR EN10025-2 (ref) Std Pcm 0.25max Max 0.17 1.40 0.035 0.035 0.55 0.0120
- voce `s235jr`, designazioni, pag. 1: Similar designations SS 1312, S235JR, 1.0038, Fe 360 BFN, RSt37-2, 40 B, SB1312, IM2191
- voce `s235jr`, tag, pag. 1: «Soft structural steel easy to weld and bend»

### LUC-S235JR — Lucefin Group

Scheda dati S235JR (EN 10025-2:2004), rev. 2018

- voce `s235jr`, composizione, pag. 1: 0,17 c) - 1,40 0,035 0,035 0,012 a) 0,55
- voce `s235jr`, composizione, pag. 1: EN 10025-2: 2004
- voce `s235jr`, designazioni, pag. 1: Numero 1.0038
- voce `s235jr`, tag, pag. 1: «Acciaio da costruzione» (intestazione della scheda)

### OVA-C45 — Ovako

Steel Navigator, scheda C45 (PDF dal sito, rev. 30 Jan 2025)

- voce `c45`, densità, pag. 6: Other properties (typical values) Youngs module (GPa) Poisson´s ratio (-) Shear module (GPa) Density (kg/m3) 210 0.3 80 7800
- voce `c45`, composizione, pag. 1: C45 EN CEV max Min 0.42 0.10 0.50 - - - - - - - - - - Std ISO 683-1 Pcm max Max 0.50 0.40 0.80 0.045 0.045 0.40 0.40 0.10 - - 0.30
- voce `c45`, designazioni, pag. 1: Similar designations C43, C44, C45R - 1.1201, C45E - 1.1191, Ck45, St70-2, SAE 1045, 080A42, SS 1672, XC 48, C 45, S 45 C, GOST 45, AISI/SAE

### MAR-BON — Marcegaglia Plates

Brochure «Steels for quenching and tempering / Acciai da bonifica», Marcegaglia Plates, April 2026 EN-IT

- voce `c45`, tag, pag. 3: «Non-alloy grades such as C40, C45 and C45E» tra gli «Steels for quenching and tempering / Acciai da bonifica»
- voce `c45`, tag, pag. 4: tabella «EN 683-1 · Non-alloy quenched steels · C40, C45 (+A/+N/+S), C45E (+N/+S)» (C45 e C45E elencate separatamente)

### MOR-CWS — Moretti Acciai S.p.A.

Scheda «CWS 1.2379 Cold Working Steel», Moretti Acciai S.p.A. (PDF del 14.12.2018, fornita da Luca)

- voce `1.2379`, alias, pag. 1: griglia delle corrispondenze in alto a sinistra: «Z160CDV12 · AISI D2 · W. nr 1.2379» sopra «KORV · BD2 · X155CrVMo12-1»; cella «KORV» senza etichetta di colonna

## Valore tipico (DB v4)

Letture di densità che il documento dichiara «valore tipico» (campo `tipico: true` nel DB). Elenco ricavato dal DB (blocco `db-materiali` di `index.html`): ogni voce con il flag ha qui documento, pagina e frase. L'app scrive «valore tipico» solo se lo sono tutte le letture della voce.

### S355J2 — OVA-S355J2 (Ovako)

Steel Navigator, scheda S355J2 (PDF dal sito). https://steelnavigator.ovako.com/steel-grades/s355j2/pdf — SHA-256 `67df1b836c18e28fd55034401b1a038e05b12f77be5064d2e6194570e5f5134a`

Letture nel DB: 7800 kg/m³ (tipico).

- densità, pag. 6: Other properties (typical values) Youngs module (GPa) Poisson´s ratio (-) Shear module (GPa) Density (kg/m3) 210 0.3 80 7800

### Inconel 718 — SPE-718 (Special Metals Corporation)

INCONEL® alloy 718, pubblicazione SMC-045 (Sept 07). https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-718.pdf — SHA-256 `6c9c60dc272cb4f7275091e02779879760afcb1801fc9bd04fbfca239907da90`

Letture nel DB: 0.296 lb/in³ (tipico); 0.297 lb/in³ (tipico).

- densità, pag. 1: Annealed..............................................................................0.296
- densità, pag. 1: Annealed and Aged .............................................................0.297
- densità, pag. 1: «Some physical constants of INCONEL alloy 718 are shown in Table 2. Modulus data appear in Tables 3 and 4, and thermal properties in Table 5. The values in these tables will vary slightly, depending on the composition and condition of the specimen tested. They are typical but are not suitable for specification purposes.» (sotto «Table 2 - Physical Constants»; il testo sta nella colonna di sinistra, intercalato alle celle della tabella)

### S235JR — OVA-S235 (Ovako)

Steel Navigator, scheda S235JR (PDF dal sito, rev. 31 Jan 2025). https://steelnavigator.ovako.com/steel-grades/s235/pdf — SHA-256 `ba996a03822437ebbd9c4b1ce146fae0f8fabcb5caf3e4877f4d3e077ab1be14`

Letture nel DB: 7800 kg/m³ (tipico).

- densità, pag. 3: Other properties (typical values) Youngs module (GPa) Poisson´s ratio (-) Shear module (GPa) Density (kg/m3) 210 0.3 80 7800

### C45 (1.0503) — OVA-C45 (Ovako)

Steel Navigator, scheda C45 (PDF dal sito, rev. 30 Jan 2025). https://steelnavigator.ovako.com/steel-grades/c45/pdf — SHA-256 `ff224f8fd5cea4b689a8995955ceda01f132b54ee5df33fc52baba084ce8e97e`

Letture nel DB: 7800 kg/m³ (tipico).

- densità, pag. 6: Other properties (typical values) Youngs module (GPa) Poisson´s ratio (-) Shear module (GPa) Density (kg/m3) 210 0.3 80 7800

## Letti e non usati

- **Lucefin Group**, Scheda SAE 1045 (rev. 2018): https://www.lucefin.com/wp-content/files_mf/1528727530SAE1045.pdf (SHA-256 `ea0ff86b8ac795033a3a82acc385a38bc58b19bedc3dd1b0284d57a029dd78fc`). Nessuna densità. La riga delle corrispondenze elenca insieme C45, Ck45 e C45E: non è stata usata per C45.
- **Trevigiana Metalli**, Scheda tecnica W. 1.2379: https://trevigianametalli.it/wp-content/uploads/pdf/scheda-tecnica-w-1.2379.pdf (SHA-256 `1fb5751f54d8eb4539fc1eaaab2773afb33d228d654cc0ef886aa6fc167c705e`). Il testo non contiene «KORV» (tabella «Corrispondenze approssimative»: UNI X155CrVMo121KU, DIN X155CrVMo121, WERK 1.2379, AFNOR Z160CDV12, AISI D2).
- **Trevigiana Metalli**, Pagina prodotto 1.2379 (piatto laminato a caldo): https://trevigianametalli.it/prodotto/acciaio-uni-x155crvmo12-1-ku-w-1-2379-piatto-laminato-a-caldo/ (SHA-256 `f55cf5b09d6ae20e41324bf8ebfda9e340e0fdfa74f176298ba49b9d7210d6d4`). Il testo non contiene «KORV».
- **Rives**, Catalogo piatti di precisione 12379: https://www.rivessrl.com/allegati/12379_1624528834.pdf (SHA-256 `d207a72da8b90865890bed17f24f6487704b9111cbb01eb95af7e4c4a5b9577f`). Il testo non contiene «KORV»: riporta solo 1.2379 e X155CrVMo12-1.
- **Marcegaglia Plates**, Brochure generale Heavy Plates, giugno 2022 EN-IT (17 pagine): https://www.publications.marcegaglia.com/wp-content/uploads/2023/07/Marcegaglia-Heavy-Plates-Giugno-2022-EN-IT.pdf (SHA-256 `8839d84625a54393ad9c5fd8e56998d8f8b4cab3875a05881658263a7a5b5795`). A pag. 9 elenca «C45/C45E» insieme: non distingue C45 da C45E, quindi non è stata usata per il tag. Nessuna composizione né W.Nr. 1.0503.
- **Marcegaglia Plates**, Pagine web «Quenching and case-hardening» (IT e EN): https://www.heavyplates.marcegaglia.com/settori-applicativi/bonifica-e-cementazione/ (SHA-256 `ddbbeb4da32ae23cafb614a0b05f16d0ec49b9592a0eb806f395a079070fbcfd`). Elencano C45 e C45E separatamente tra gli acciai non legati da bonifica (stessa informazione del PDF di aprile 2026); non usate come fonte, il PDF è un documento datato e con hash.

## Non raggiungibili o non trovati

- `https://www.heavyplates.marcegaglia.com/pdf/Marcegaglia-Plates-acciai-da-bonifica_EN-IT_Giugno_2022.pdf` (PDF indicato per C45): risponde 404 su quel sito; la brochure attuale è quella di aprile 2026 sul sito delle pubblicazioni (MAR-BON). Composizione e W.Nr. 1.0503 non compaiono in nessuna versione letta.
- `https://www.2c2m.it/…/1_2379.html` (pagina citata dalla ricerca web per «KORV»): il server chiude la connessione; non letta.
- I percorsi `/oaleekso/files_mf/…` di Lucefin danno 404 da qui: gli stessi file sono su `/wp-content/files_mf/…` (usato nel DB). La scheda inglese del 39NiCrMo3 è `…152353577239NiCrMo3.pdf`; `…152353577739…` non esiste.
- Böhler M200: non scaricabile (l'URL restituisce una pagina HTML); la ricerca lo indica come 1.2312 SEL, non 1.2311. Non usato.
