# Report fonti – Fase 1, lotto pilota

Letto il 2026-11-13. Questo file è il registro di ciò che è entrato nel database e perché.
La sezione «Dettaglio per voce» è generata dallo stesso programma che costruisce il DB: ogni valore è stato
confrontato con il testo della pagina del documento citato (179 prove, nessuna mancante).

Le copie dei PDF non sono nel repository (è pubblico): l'hash SHA-256 identifica il file letto.

## Esito in sintesi

- **21 voci verificate** su 22 previste (C45 e C45E separate, come richiesto).
- **1 voce esclusa:** C45 (1.0503), vedi sotto.
- Densità: 10 voci con letture concordi, 11 con intervallo (nominale + intervallo + fonti). In 5 dei casi con intervallo la
  differenza è al massimo 0,02 g/cm³ (100Cr6 7,80-7,81; 1.2379 7,67-7,68; 6082 2,7-2,71; stagno 7,29-7,31; titanio grado 2 4,51-4,52).
  Le differenze più ampie sono C45E (7,70-7,85, 0,15), 1.2344 (7,74-7,80), 16MnCr5 (7,80-7,85), Ti-6Al-4V (4,43-4,47), CuZn39Pb3 (8,46-8,50).
  L'Inconel 718 ha un intervallo perché lo stesso documento dà due valori (ricotto e invecchiato).
- Tre voci hanno una sola fonte di densità: S355J2 (Ovako), 11SMnPb30 (Lucefin), Inconel 718 (Special Metals).
- Regola per il nominale quando i documenti discordano: punto medio tra minimo e massimo letti, arrotondato a 3 decimali.
  Non c'è un criterio «migliore» nei documenti: la regola è dichiarata nel DB (`meta.regola_nominale`).

## Escluso dal lotto pilota

### C45 (1.0503) → lotto 2

Nessun documento letto riporta la densità di 1.0503.

- Saarstahl «Material specification sheet C45» (1.0503): designazioni e analisi tipica, nessuna densità.
- Swiss Steel «C45 XTP» (1.0503): designazioni e composizione, nessuna densità.
- thyssenkrupp TK 1191 / TK 1201 riguarda C45E/C45R (1.1191/1.1201), non 1.0503. thyssenkrupp Svizzera
  «Sonderprodukte in Edelbaustahl» e il Werkstoffhandbuch (Schulte) non contengono 1.0503 nel testo.
- La densità di C45E non è stata riusata per 1.0503: nessun documento letto lo consente.

Per sbloccarla serve una scheda di produttore che indichi la densità di C45 / 1.0503 (EN 10083-2).
Non ho un URL candidato da proporre.

## Cosa non è verificato

- **Lucefin e thyssenkrupp Materials: non ho verificato se siano produttori o distributori.** Le loro schede citano
  le norme (ISO/EN) e riportano i limiti; sono state tenute come fonti, e ogni riferimento nel DB ha il campo
  `emittente` per poterle togliere.
  - Lucefin è la fonte principale della composizione e delle designazioni di 11 acciai (C45E, 42CrMo4, 16MnCr5,
    100Cr6, S355J2, 11SMnPb30, 304, 316, 17-4PH, 1.2344, 1.2379).
  - thyssenkrupp Materials è seconda fonte per 42CrMo4 (stesso valore di Lucefin) e il limite inferiore di C45E (7,70).
- **CuZn39Pb3:** composizione limitata ai componenti elencati da Wieland (Cu, Pb, Ni max, Zn resto). I limiti
  completi della EN 12164 non sono stati letti. Diehl riporta solo valori di riferimento (Cu 58,0; Pb 3,0).
- **Titanio grado 2 e Ti-6Al-4V:** i limiti sono i massimi dichiarati sulla pagina prodotto ATI; la scheda
  tecnica ATI dà solo valori tipici. I numeri W.Nr. compaiono solo in schede di Rolled Alloys (distributore,
  non ammesso) e non sono stati inseriti.
- **Designazioni UNI e DIN lasciate vuote** dove nessun documento le riporta (100Cr6, S355J2, 304, 316, 17-4PH,
  UNI di 1.2344 e 1.2379). L'AFNOR «16MC» di Lucefin per 16MnCr5 non è stata inserita (testo troncato).
- **Aubert & Duval 2024:** densità 2,77 senza unità nel documento; coincide con Kaiser 2,77 Mg/m³.
- **Inconel 718:** Special Metals dà la densità solo in lb/in³ (0,296 ricotto; 0,297 ricotto e invecchiato).
  Convertita con 1 lb = 0,45359237 kg e 1 in = 25,4 mm: 8,193 e 8,221 g/cm³.
- **Valori tipici:** molte densità sono dichiarate tipiche dai produttori, non garantite.
- **Wieland (5083, 6082, 7075):** le schede usate sono «information sheet for articles»; indicano la densità come
  valore di letteratura e solo i componenti principali. I limiti completi di 5083, 6082 e 7075 vengono da
  Hydro (EN 573-3:2013 per il 6082; Njørdal H116 per il 5083) e da Kaiser (7075, 2024).

## Documenti non leggibili da qui

Nessuna voce del lotto pilota resta bloccata per questo motivo (tranne C45 per mancanza di densità).
Elenco per un eventuale scaricamento manuale; i primi tre li ho rispettati senza aggirarli:

| Documento | Esito | URL esatto |
|---|---|---|
| Aperam, scheda 304 | HTTP 403 al client automatico | https://www.aperam.com/product/304-1-4301/ |
| Aurubis, Cu-ETP | HTTP 406 (reindirizza a www.aurubis.com/finland/…) | https://www.aurubis.fi/wp-content/uploads/2020/06/CU_ETP.pdf |
| Constellium, ALPLAN 5083 | Il sito risponde con una pagina web invece del PDF | https://www.constellium.com/sites/default/files/tid_product_documents/alplan_5083.pdf |
| BGH, 1.4542 | 404 (anche l'indirizzo in tedesco) | https://bgh.de/media/bb/77/03/1740389214/14542_BGH_de.pdf |
| Wieland, «Datasheets EN AW 7075 / 5083» | L'elenco è caricato da un servizio esterno non raggiungibile | https://www.wieland.com/en/resources/downloads?resource-category=1191 (e `…=1186`) |

## Piano del lotto 2

Richiesti: ferro, ghise, bronzo, S235JR. Proposti in aggiunta: 304L, 316L e C45 (1.0503) se si trova la fonte.
Fonti non ancora cercate: servirà un nuovo censimento e, per i nuovi host, una nuova approvazione.

| Voce | Primo candidato | Punti aperti |
|---|---|---|
| S235JR | Lucefin (host già autorizzato) | scheda da cercare |
| 304L, 316L | Lucefin, Swiss Steel (host già autorizzati) | gradi 1.4307 e 1.4404 |
| Ghise | produttori di getti, norme EN 1561 / EN 1563 (a pagamento) | quali gradi: EN-GJL-250 e EN-GJS-500-7 sono le proposte |
| Bronzo | Wieland, Kemper, Diehl (già autorizzati) | quale lega (CuSn8?) |
| Ferro | NIST per il ferro puro, oppure un acciaio dolce | «ferro» è ambiguo: puro o dolce? |
| C45 (1.0503) | da trovare | vedi sopra |

Plastiche tecniche (POM, PA, PEEK, PTFE), magnesio, zinco e piombo restano dopo, come da accordi.

---

## Documenti letti

| id | Emittente | Documento | URL | SHA-256 |
|---|---|---|---|---|
| LUC-C45E | Lucefin Group | Scheda dati C45E (ISO 683-1:2018), rev. 2024 | https://www.lucefin.com/wp-content/uploads/2025/01/C45E.pdf | `f533ff76d6a2150f6d91298ddca2827e519d542e8554af4017ac5b83ea6fe576` |
| TK-1191 | thyssenkrupp Materials Austria | TK 1191 / TK 1201, Werkstoffdatenblatt Unlegierter Vergütungsstahl | https://ucpcdn.thyssenkrupp.com/_legacy/UCPthyssenkruppBAMXAustria/assets.files/download/baustahl_datenblatt_tk_1191_1201.pdf | `666254be2f1e584c0a791c79f4047ab7bf9579820518f6e30d9cc4fe75d74bf5` |
| LUC-42CRMO4 | Lucefin Group | Technical card 42CrMo4 (ISO 683-2:2018), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/152353604042CrMo4.pdf | `40bad89650e302408b3bad27d7a3715a9c4f737325290b03ef7510bbe01c3b68` |
| TK-42CRMO4 | thyssenkrupp Materials (Schulte) | Werkstoffdatenblatt 42CrMo4 / 42CrMoS4 (1.7225 / 1.7227) | https://ucpcdn.thyssenkrupp.com/_binary/UCPthyssenkruppBAMaterialsSchulte/dc4e3d67-9afe-4b41-8794-a82c0d3ab7bb/42CrMo4-42CrMoS4-1.7225-1.7227.pdf | `1f278a4b784942e8be446775c32b416f67b94b56ea85a6f852be020c1600749d` |
| LUC-16MNCR5 | Lucefin Group | Technical card 16MnCr5 (ISO 683-3:2018), rev. 2024 | https://www.lucefin.com/wp-content/uploads/2025/01/ENG-16MnCr5.pdf | `4990576a2817c3954caf42e9b9a6b51cdc0e5c61807a7b2e5842267a248dd18d` |
| OVA-16MNCR5 | Ovako | Steel Navigator, scheda 16MnCr5 (PDF dal sito) | https://steelnavigator.ovako.com/steel-grades/16mncr5/pdf | `767af42285274365c18815409c914494535e691d3037cac28ac41f9e7277232a` |
| LUC-100CR6 | Lucefin Group | Technical card 100Cr6 (ISO 683-17:2014), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/1523536908100Cr6.pdf | `41d34658509bcd4650d3e2e1c8c8055e52c5d5b142930d4230232535cabf4202` |
| SWI-100CR6 | Swiss Steel Group (Deutsche Edelstahlwerke) | Durapur 3505, Werkstoffdatenblatt 100Cr6 / 1.3505, 16/10/2015 | https://swisssteel-group.com/content-media/documents/Data-Sheets/Engineering-Steel/1.3505_de.pdf | `450024a8c67fccc5530214e320692ca5b39cafb8f1d0f96637a727fd0d35a1f3` |
| OVA-100CR6 | Ovako | Steel Navigator, scheda 100Cr6 (PDF dal sito) | https://steelnavigator.ovako.com/steel-grades/100cr6/pdf | `43eeb928cb93ba8fb3a3552cfeaf4533175bedb637c01fe6f6121043b361e588` |
| LUC-S355J2 | Lucefin Group | Technical card S355J2 (EN 10025-2:2014), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/1522935764S355J2.pdf | `fd5efa158688d5708736192141c1170b9fd3e258cd6abcdf76f610751a91e966` |
| OVA-S355J2 | Ovako | Steel Navigator, scheda S355J2 (PDF dal sito) | https://steelnavigator.ovako.com/steel-grades/s355j2/pdf | `67df1b836c18e28fd55034401b1a038e05b12f77be5064d2e6194570e5f5134a` |
| LUC-11SMNPB30 | Lucefin Group | Technical card 11SMnPb30 (ISO 683-4:2018), rev. 2024 | https://www.lucefin.com/wp-content/uploads/2025/01/ENG-11SMnPb30.pdf | `7a7a8b0a3ad3dd6dc2e5af06baecaaf6047d623ce8cf72562b1cfb5b865e56ee` |
| SWI-E217 | Swiss Steel Group (Steeltec) | Technical Datasheet SwissCut, 28.06.23 Rev. N°1 | https://swisssteel-group.com/content-media/documents/Data-Sheets/Engineering-Steel/E217_SwissCut_Technischesdatenblatt_0715.pdf | `10e713a51f6a4deda4fe83238d01193d768f8d3f547616a80ed2818f7e6b7118` |
| LUC-4301 | Lucefin Group | Technical card 1.4301 X5CrNi18-10 (EN 10088-3:2014), 2018 | https://www.lucefin.com/wp-content/files_mf/15235416291.4301A304.pdf | `bb8fd0e5ee7eb55ec78cab4fbec15b5a00560335845553a4e43c89fafbd2632c` |
| SWI-4301 | Swiss Steel Group (Deutsche Edelstahlwerke) | Datasheet 1.4301 Chromium-nickel austenitic stainless steel | https://www.swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/Datenblatt_4301_UK.pdf | `568e9f66166344c41a26387efc222526523f03c6aa9aad2007357e857523f870` |
| LUC-4401 | Lucefin Group | Technical card 1.4401 X5CrNiMo17-12-2 (EN 10088-3:2014), 2018 | https://www.lucefin.com/wp-content/files_mf/15235422061.4401A316.pdf | `f726339a0062cdad0f7e5172078911930cf7627e0053f854c09d64d1aefff984` |
| SWI-4401 | Swiss Steel Group (Deutsche Edelstahlwerke) | Acidur 4401, Werkstoffdatenblatt 1.4401, 02/12/2015 | https://swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/1.4401_de.pdf | `df492db33101d1f3803e6c7cc59489fa2674e5fb9bda0970355560af3bc2eb75` |
| LUC-4542 | Lucefin Group | Technical card 1.4542 X5CrNiCuNb16-4 17-4 PH (EN 10088-3:2014), 2018 | https://www.lucefin.com/wp-content/files_mf/15235430111.4542Tp630.pdf | `40b991234af5e6e699374f18b59020125a667cc040b47ad30758167bd8fea1e6` |
| FAG-174 | Marcegaglia Specialties, Fagersta Stainless | R565.10 (17-4 PH), ENG 2025, Edition 1 | https://www.fagersta.marcegaglia.com/wp-content/uploads/2023/07/1.4542-17-4PH-R565.10-ENG-2025-Edition-1.pdf | `2c3be6d75db1d6cb75404063483f5252bd7cf9db828ea66f0b8c965618aee474` |
| LUC-12344 | Lucefin Group | Technical card 1.2344 X40CrMoV5-1 (UNI EN ISO 4957:2002), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/15236076191.2344X40CrMoV51.pdf | `9347852d145b3b94373c9ac942172afa2ceba16c8870d15e7d0cc28b19c3aff5` |
| BOE-W302B | voestalpine BÖHLER Edelstahl | Data sheet BÖHLER W302 ISOBLOC | https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w302-isobloc_en_gb.pdf | `f5f449e6291323400bb984e96b9520f2b812b8894b37ccd6d003d0007e150ca5` |
| BOE-W302D | voestalpine BÖHLER Edelstahl | Data sheet BÖHLER W302 ISODISC | https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w302-isodisc_en_gb.pdf | `e0a0a87343baa39b7def9697edd0b72b9ca8cb7a6610902cf7d6974367aaf5bd` |
| SWI-12344 | Swiss Steel Group | Technical datasheet Thermodur 2344 EFS, 10.05.23 Rev.00 | https://swisssteel-group.com/content-media/documents/_import/1.2344_en.pdf | `9b9e7d772c87108ec754052600d46d691f26442dc2a2590a5b9dd86a1d9bc02d` |
| LUC-12379 | Lucefin Group | Technical card 1.2379 X153CrMoV12 (UNI EN ISO 4957:2002), rev. 2018 | https://www.lucefin.com/wp-content/files_mf/15236079471.2379X153CrMoV12.pdf | `40396f425b4d8b3bdd21a1b277744800845e874f5e86f5115f62c654b5646423` |
| BOE-K110 | voestalpine BÖHLER Edelstahl | Data sheet BÖHLER K110 | https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/k110_en_gb.pdf | `cdb5debfb917dd4ce1b65a0202781cf061f04e0e49bad8f644ffed75946389f8` |
| HYD-6082 | Hydro | Technical datasheet, Extruded products, Alloy EN AW-6082 | https://www.hydro.com/globalassets/08-about-hydro/hydro-worldwide/austria/nenzing/alloy-data-sheets/hydro-en-aw-6082.pdf | `32c48123bad42c79abb25aaf963aeea472a73e5aec363d32ed0617bc9c60a2c2` |
| WIE-A32 | Wieland-Werke AG | Information sheet for articles Wieland-A32 (EN AW-6082), 10.11.2020, vers. 5 | https://www.wieland.com/content/download/10451/file/Wieland-A32_EN.pdf | `23ed95bddbb1eefe82d99c51e3f50984918f34a23028000bfd3b7271edd2ca4d` |
| KAI-7075SP | Kaiser Aluminum | Sheet Coil & Plate Alloy 7075, Technical Data, Rev. 05/06 | https://online.kaiseraluminum.com/depot/PublicProductInformation/Document/1017/Kaiser_Aluminum_7075_Sheet_Coil_and_Plate.pdf | `d25360f06b1a0a9b125a36998606c08612aae7c54f1c8d1069dd87cebed2423d` |
| KAI-7075RB | Kaiser Aluminum | Rod & Bar Alloy 7075, Technical Data | https://online.kaiseraluminum.com/depot/PublicProductInformation/Document/1028/Kaiser_Aluminum_7075_Rod_and_Bar.pdf | `2ddcf0676cea2bbbe05e20c69895b4bb82a2e41f09a5ab1300474aae5162e795` |
| WIE-A07 | Wieland-Werke AG | Information sheet for articles Wieland-A07 (EN AW-7075), 15.05.2025, vers. 6 | https://www.wieland.com/content/download/10433/file/Wieland-A07_EN.pdf | `5c134eb2e89ed1d9e7eb136aa9c4f6b6d2653f78f78df2a5d2d22041b395011e` |
| KAI-2024 | Kaiser Aluminum | Sheet Coil & Plate Alloy 2024, Technical Data | https://online.kaiseraluminum.com/depot/PublicProductInformation/Document/1012/Kaiser_Aluminum_2024_Sheet_Coil_and_Plate.pdf | `2509985b39f859cac583e6d037cb7571dfcd8344079baed8c426d5f4531fa86d` |
| AUB-2024 | Aubert & Duval | Aluminium alloy 2024 (Al Cu4Mg1), scheda | https://www.aubertduval.com/wp-content/uploads/2024/12/2024_GB.pdf | `b0e024856813868f75e349289a1f0f5ec12ac6c27499b2513637f10d50d9ceee` |
| HYD-5083 | Hydro | Njørdal™ H116, coil, sheet & plate for marine and offshore | https://www.hydro.com/globalassets/01-products--services/rolled-products/ge_h116_njordal_200514.pdf | `c64f51b4a0720a944cc401ce48b505ca7ccb3a9debd79038591e587f9f979a3c` |
| WIE-A14 | Wieland-Werke AG | Information sheet for articles Wieland-A14 (EN AW-5083), 10.11.2020, vers. 5 | https://www.wieland.com/content/download/10445/file/Wieland-A14_EN.pdf | `6f68238227ebafbae8b2a2d9da335abd5cea18d2ec5403d8e89c758f6481e356` |
| ATI-CP2W | ATI (Allegheny Technologies) | Pagina prodotto «ATI 40, CP Grade 2», sezione Product Specifications By Form | https://www.atimaterials.com/Products/ati-cp2 | `b50307d71e75a1de9312caf0b2f6e0e76a129f717a65b8ffc5ba14be723a47b8` |
| ATI-CP2T | ATI (Allegheny Technologies) | Technical Data Sheet ATI 30, CP Grade 1, ATI 40, CP Grade 2, ATI 55, CP Grade 3, ATI 70, CP Grade 4, version 1 (2/21/2012) | https://www.atimaterials.com/Products/Documents/datasheets/titanium/commerciallypure/ati_cp2_tds_en.pdf | `922952adbd439370b1afbe143e85f6ab163f01e11a05fce15ea32c55ab2fe14f` |
| ATI-64W | ATI (Allegheny Technologies) | Pagina prodotto «ATI 6-4 Titanium», sezione Product Specifications By Form | https://www.atimaterials.com/Products/Pages/ati-6-4-grade5.aspx | `094c694c9e28346f9cfda3a7b4f0ecc50b860ed9bb86b1a112468d1ea727f92c` |
| ATI-64T | ATI (Allegheny Technologies) | Technical Data Sheet ATI Ti-6Al-4V, Grade 5, version 1 (1/31/2012) | https://www.atimaterials.com/Products/Documents/datasheets/titanium/alloyed/ati_6-4_tds_en_v1.pdf | `a882cd75915682f66fffd239b9aa6a1310e45055305ff2ceeb003897e94ca8bc` |
| WIE-Z32 | Wieland-Werke AG | Safety data sheet Wieland-Z32 (CuZn39Pb3), 06/14/2022, vers. 12 | https://www.wieland.com/en/content/download/11066/file/Wieland-Z32-USA_EN.pdf | `4bfb43b4bf19cebb833267da5c4e075e626e589f1baafeb8c3f7d4ced1284499` |
| WIE-Z33 | Wieland-Werke AG | Safety data sheet Wieland-Z33 (CuZn39Pb3), 06/14/2022, vers. 11 | https://www.wieland.com/en/content/download/11067/file/Wieland-Z33-USA_EN.pdf | `b6dc5e48c7ef53d7af6bb1d533fe855ebfd2a3216482ce310052dd5452020de3` |
| DIE-002 | Diehl Brass Solutions | Material Datasheet 002 (CuZn39Pb3) | https://www.diehl.com/cms/files/Diehl_Brass_Solutions_Material_Datasheet_002.pdf | `4e26c5246db2f11b8325770621e624e1d45116fb90a26bb93807a7afb383eb3e` |
| KEM-CUETP | Gebr. Kemper GmbH + Co KG | Datenblatt Cu-ETP / datasheet Cu-ETP, Stand 03/2024 | https://www.kemper-group.com/media/de-at/content/04-produkte/walzprodukte/datenblaetter/cu-etp.pdf | `a7aedf24af52a72cccce9f6089c1ed735d333b273ca4363ac994e5b7bf80f69f` |
| WIE-K32 | Wieland-Werke AG | Safety data sheet Wieland-K32 (Cu-ETP), 05/09/2022, vers. 6 | https://www.wieland.com/en/content/download/10983/file/Wieland-K32-USA_EN.pdf | `b2f9771c17296039285959d1d0742668dd5012ccebc7c8a8817519924cb9edab` |
| NIST-T1 | NIST (National Institute of Standards and Technology) | X-Ray Mass Attenuation Coefficients, Table 1 (costanti dei materiali, Z=50 Sn) | https://physics.nist.gov/PhysRefData/XrayMassCoef/tab1.html | `8c1dc9991ac0e9c266cf23695f875a6ab759ab6c759707681616da01bcef2cb5` |
| IND-SN | Indium Corporation | Product Data Sheet Commercial Tin Metal, Form No. 98803 R0 | https://www.indium.com/wp-content/uploads/2025/03/Commercial-Tin-Metal-PDS-98803-R0-1.pdf | `4f675a76afb1062c171d9b0908b73352e404883c620bf81c2ff066c0fb98b063` |
| SPE-718 | Special Metals Corporation | INCONEL® alloy 718, pubblicazione SMC-045 (Sept 07) | https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-718.pdf | `6c9c60dc272cb4f7275091e02779879760afcb1801fc9bd04fbfca239907da90` |

## Dettaglio per voce

### C45E (`c45e`, Acciai da bonifica)

- **Densità nominale: 7.775 g/cm³**, intervallo 7.7–7.85. Due produttori divergono: Lucefin 7,85 kg/dm³, thyssenkrupp 7,70 kg/dm³ (scheda C45E/C45R).
- LUC-C45E (Lucefin Group):
  - densita, p. 3: «Massa Volumica Kg/dm3 7.85»
  - composizione, p. 1: «0,42-0,50 0,10-0,40 0,50-0,80 0,025 0,035 0,40 0,10 0,40 0,30»
  - designazioni, p. 3: «C45E C45 F1140 Ck45 XC48 080M46 1672 1045»
  - designazioni, p. 1: «Numero 1.1191»
- TK-1191 (thyssenkrupp Materials Austria):
  - densita, p. 1: «Dichte (kg/dm3) 7,70»
  - designazioni, p. 1: «DIN 17200 1.1191 / 1.1201 Ck45 / Cm45»

### 42CrMo4 (`42crmo4`, Acciai da bonifica)

- **Densità: 7.85 g/cm³** (documenti concordi).
- LUC-42CRMO4 (Lucefin Group):
  - densita, p. 2: «Density Kg/dm3 7.85»
  - composizione, p. 1: «0,38-0,45 0,10-0,40 0,60-0,90 0,025 0,035 0,90-1,20 0,15-0,30 0,40»
  - designazioni, p. 2: «42CrMo4 42CrMo4 ML42CrMo 42CrMo4 42CD4 708M40 38ChM 4140»
  - designazioni, p. 1: «Number 1.7225»
- TK-42CRMO4 (thyssenkrupp Materials (Schulte)):
  - densita, p. 2: «Dichte bei Elastizitätsmodul Wärmeleitfähigkeit spez. Wärmekapazität spez. elektrischer 20 °C kN/mm² bei bei 20 °C bei 20 °C Widerstand bei »

### 16MnCr5 (`16mncr5`, Acciai legati)

- **Densità nominale: 7.825 g/cm³**, intervallo 7.8–7.85. Lucefin 7,85 kg/dm³; Ovako 7800 kg/m³ (valore tipico).
- LUC-16MNCR5 (Lucefin Group):
  - densita, p. 2: «Density Kg/dm3 7.85»
  - composizione, p. 1: «0,14-0,19 0,15-0,40 1,00-1,30 0,025 0,035 0,80-1,10 0,40»
  - designazioni, p. 2: «16MnCr5 16MnCr5 15CrMn 16MnCr5 16MC 16HG 5115»
  - designazioni, p. 1: «Number 1.7131»
- OVA-16MNCR5 (Ovako):
  - densita, p. 6: «Density (kg/m3) 210 0.3 80 7800»

### 100Cr6 (`100cr6`, Acciai legati)

- **Densità nominale: 7.805 g/cm³**, intervallo 7.8–7.81. Lucefin 7,81; Swiss Steel 7,8; Ovako 7800 kg/m³: differenze di arrotondamento.
- LUC-100CR6 (Lucefin Group):
  - densita, p. 1: «Density Kg/dm3 7.81»
  - composizione, p. 1: «0,93-1,05 0,15-0,35 0,25-0,45 0,025 0,015 1,35-1,60 0,10 0,050 0,30»
  - designazioni, p. 1: «Number 1.3505»
- SWI-100CR6 (Swiss Steel Group (Deutsche Edelstahlwerke)):
  - densita, p. 2: «Dichte in kg/dm3 7,8»
  - composizione, p. 1: «max. 1,05 0,35 0,45 0,025 0,015 1,6 0,1»
  - designazioni, p. 1: «AISI 52100»
  - designazioni, p. 1: «UNE F.1310»
  - designazioni, p. 1: «B.S. 2S135, 535A99»
  - designazioni, p. 1: «JIS SUJ2»
  - designazioni, p. 1: «AFNOR 100C6»
  - designazioni, p. 1: «SS 2258»
  - nome_commerciale, p. 1: «Durapur 3505 ist ein klassischer Wälzlagerstahl»
- OVA-100CR6 (Ovako):
  - densita, p. 9: «Density (kg/m3) 210 0.3 80 7800»

### S355J2 (`s355j2`, Acciai al carbonio)

- **Densità: 7.8 g/cm³** (documenti concordi).
- LUC-S355J2 (Lucefin Group):
  - composizione, p. 1: «0,20 a) 0,55 1,60 0,025 0,025 0,40»
  - composizione, p. 1: «EN 10025-2: 2014»
  - designazioni, p. 1: «Number 1.0577»
- OVA-S355J2 (Ovako):
  - densita, p. 6: «Density (kg/m3) 210 0.3 80 7800»

### 11SMnPb30 (`11smnpb30`, Acciai al carbonio)

- **Densità: 7.85 g/cm³** (documenti concordi).
- LUC-11SMNPB30 (Lucefin Group):
  - densita, p. 1: «Density Kg/dm3 7.85»
  - composizione, p. 1: «0,14 0,05 0,90-1,30 0,11 0,27-0,33 0,20-0,35»
  - designazioni, p. 1: «11SMnPb30 CF 9SMnPb28 Y15Pb 9SMnPb28 S250Pb (AS14) 12L14»
  - designazioni, p. 1: «Number 1.0718»
- SWI-E217 (Swiss Steel Group (Steeltec)):
  - nome_commerciale, p. 1: «SC30Pb -11SMnPb30 -1.0718»

### Inox 304 (1.4301) (`304`, Acciai inox)

- **Densità: 7.9 g/cm³** (documenti concordi).
- LUC-4301 (Lucefin Group):
  - densita, p. 2: «Density Kg/dm3 7.90»
  - composizione, p. 1: «0,07 1,00 2,00 0,045 0,030 17,5-19,5 8,0-10,5 0,10 EN 10088-3: 2014»
  - designazioni, p. 2: «X5CrNi18-10 S30400 (304)»
  - designazioni, p. 1: «Number 1.4301»
- SWI-4301 (Swiss Steel Group (Deutsche Edelstahlwerke)):
  - densita, p. 1: «density (kg/dm3) 7.90»
  - designazioni, p. 1: «AISI 304»
  - designazioni, p. 1: «UNS S30400»
  - designazioni, p. 1: «BS 304S15 / 304S31»
  - designazioni, p. 1: «JIS SUS304»
  - designazioni, p. 1: «AFNOR Z7CN18-09»
  - designazioni, p. 1: «SIS 2333»

### Inox 316 (1.4401) (`316`, Acciai inox)

- **Densità: 8.0 g/cm³** (documenti concordi).
- LUC-4401 (Lucefin Group):
  - densita, p. 2: «Density Kg/dm3 8.00»
  - composizione, p. 1: «0,07 1,00 2,00 0,045 0,030 16,5-18,5 10,0-13,0 0,10 2,0-2,5 EN 10088-3: 2014»
  - designazioni, p. 2: «X5CrNiMo17-12-2 S31600 316»
  - designazioni, p. 1: «Number 1.4401»
- SWI-4401 (Swiss Steel Group (Deutsche Edelstahlwerke)):
  - densita, p. 2: «Dichte in kg/dm3 8,0»
  - composizione, p. 1: «max. 0,07 1,0 2,0 0,045 0,03 18,5 13,0 2,5 0,1»
  - composizione, p. 1: «min. - - - - - 16,5 10,0 2,0»
  - designazioni, p. 1: «AISI 316»
  - designazioni, p. 1: «UNS S31600»
  - designazioni, p. 1: «B.S. 316S31»
  - designazioni, p. 1: «JIS SUS316»
  - designazioni, p. 1: «AFNOR Z7CND17-11-02 /»
  - designazioni, p. 1: «Z7CND17-12-02»
  - designazioni, p. 1: «SS 2347»
  - designazioni, p. 1: «UNE F.3534»
  - nome_commerciale, p. 1: «Acidur 4401 ist ein nichtrostender»

### Inox 17-4PH (1.4542) (`17-4ph`, Acciai inox)

- **Densità: 7.8 g/cm³** (documenti concordi).
- LUC-4542 (Lucefin Group):
  - densita, p. 2: «Density Kg/dm3 7,80»
  - composizione, p. 1: «0,07 0,70 1,50 0,040 0,030 15,0-17,0 3,0-5,0 0,60 3,0-5,0 5 x C < 0,45 EN 10088-3: 2014»
  - designazioni, p. 2: «X5CrNiCuNb16-4 S17400 Type 630»
  - designazioni, p. 1: «Number 1.4542 (17-4 PH)»
- FAG-174 (Marcegaglia Specialties, Fagersta Stainless):
  - densita, p. 1: «Density 7.8 g / cm3»
  - designazioni, p. 1: «EN: 1.4542»
  - designazioni, p. 1: «Type: 630 17-4 PH»

### Acciaio per utensili 1.2344 (H13) (`1.2344`, Acciai per utensili)

- **Densità nominale: 7.77 g/cm³**, intervallo 7.74–7.8. Lucefin 7,74 kg/dm³; Böhler 7,8 kg/dm³ (W302 ISOBLOC e ISODISC).
- LUC-12344 (Lucefin Group):
  - densita, p. 1: «Density Kg/dm3 7.74»
  - composizione, p. 1: «0,35-0,42 0,80-1,20 0,25-0,50 0,030 0,020 4,80-5,50 1,20-1,50 0,85-1,15»
  - composizione, p. 1: «UNI EN ISO 4957: 2002»
  - designazioni, p. 1: «X40CrMoV5-1 X40CrMoV5-1 4Cr5MoSiV1 SKD 61 XT35Cr5MoV1 STD 61 4Ch4VMFS H 13»
  - designazioni, p. 1: «Number 1.2344»
- BOE-W302B (voestalpine BÖHLER Edelstahl):
  - densita, p. 6: «Density (kg/dm³) 7.8»
  - designazioni, p. 2: «1.2344 SEL 4957 EN ISO X40CrMoV5-1 EN #207 NADCA T20813 UNS G4404 JIS H13 AISI B1885 NADCA SKD61 JIS»
  - nome_commerciale, p. 1: «BÖHLER W302 ISOBLOC is a 5% chromium steel and corresponds to material number 1.2344 (X40CrMoV5-1)»
- BOE-W302D (voestalpine BÖHLER Edelstahl):
  - densita, p. 5: «Density (kg/dm³) 7.8»
  - nome_commerciale, p. 1: «BÖHLER W302 ISODISC is a 5% chromium steel and corresponds to material number 1.2344 (X40CrMoV5-1)»
- SWI-12344 (Swiss Steel Group):
  - designazioni, p. 1: «X40CrMoV5-1 1.2344 H13 BH13 Z40CDV5 SKD61 4Ch5MF1S F.5318 2242»
  - nome_commerciale, p. 1: «Thermodur®2344 EFS»

### Acciaio per utensili 1.2379 (D2) (`1.2379`, Acciai per utensili)

- **Densità nominale: 7.675 g/cm³**, intervallo 7.67–7.68. Lucefin 7,68 kg/dm³; Böhler 7,67 kg/dm³.
- LUC-12379 (Lucefin Group):
  - densita, p. 1: «Density Kg/dm3 7.68»
  - composizione, p. 1: «1,45-1,60 0,10-0,60 0,20-0,60 0,030 0,030 11,0-13,0 0,70-1,00 0,70-1,00»
  - composizione, p. 1: «UNI EN ISO 4957: 2002»
  - designazioni, p. 1: «X153CrMoV12 X155CrVMo12-1 Cr12MoV SK 10 STD 10 Ch12MF A681 D 2»
  - designazioni, p. 1: «Number 1.2379»
- BOE-K110 (voestalpine BÖHLER Edelstahl):
  - densita, p. 6: «Density (kg/dm³) 7.67»
  - designazioni, p. 2: «1.2379 SEL 4957 EN ISO X153CrMoV12 EN ~T30402 UNS D2 AISI»
  - nome_commerciale, p. 1: «BÖHLER K110 is a 12% ledeburitic chromium steel and corresponds to material number 1.2379 (X153CrMoV12, D2)»

### Alluminio 6082 (`6082`, Alluminio e leghe)

- **Densità nominale: 2.705 g/cm³**, intervallo 2.7–2.71. Wieland 2,7 g/cm³ (una cifra decimale); Hydro 2,71 g/cm³ (valore tipico).
- HYD-6082 (Hydro):
  - composizione, p. 1: «0.70 1.30 0.50 0.10 0.40 1.00 0.60 1.20 0.25 0.20 0.10 0.05 0.15»
  - composizione, p. 1: «according to EN-573-3:2013»
  - densita, p. 2: «575 - 650 2.71»
  - designazioni, p. 1: «Alloy EN AW-6082 [AlSi1MgMn]»
- WIE-A32 (Wieland-Werke AG):
  - densita, p. 4: «Density at 20 °C: 2.7 g/cm³ (Lit.)»
  - designazioni, p. 2: «EN AW-Al Si1MgMn · Material number (DIN EN 573-1): EN AW-6082»

### Alluminio 7075 (`7075`, Alluminio e leghe)

- **Densità: 2.8 g/cm³** (documenti concordi).
- KAI-7075SP (Kaiser Aluminum):
  - composizione, p. 2: «Minimum - - 1.2 - 2.1 0.18 5.1»
  - composizione, p. 2: «Maximum 0.40 0.50 2.0 0.30 2.9 0.28 6.1 0.20 0.05 0.15»
  - densita, p. 2: «Nominal Density (68 °F/20 °C) 0.101 lbs./in.3 2.80 Mg/m3»
  - designazioni, p. 2: «Alloy 7075»
- KAI-7075RB (Kaiser Aluminum):
  - composizione, p. 2: «Maximum 0.40 0.50 2.00 0.30 2.90 0.28 6.10 0.20 0.05 0.15»
  - densita, p. 2: «Nominal Density (68 ºF / 20 ºC) 0.101 lbs./in. 3 2.80 Mg/m3»
- WIE-A07 (Wieland-Werke AG):
  - densita, p. 5: «Density at 20 °C: 2.8 g/cm³ (Lit.)»
  - designazioni, p. 2: «EN AW-Al Zn5,5MgCu · Material number (DIN EN 573-3): EN AW-7075»

### Alluminio 2024 (`2024`, Alluminio e leghe)

- **Densità: 2.77 g/cm³** (documenti concordi).
- KAI-2024 (Kaiser Aluminum):
  - composizione, p. 2: «Minimum - - 3.8 0.30 1.2»
  - composizione, p. 2: «Maximum 0.50 0.50 4.9 0.9 1.8 0.10 0.25 0.15 0.05 0.15»
  - densita, p. 2: «Nominal Density (68 °F/20 °C) 0.100 lbs./in.3 2.77 Mg/m3»
  - designazioni, p. 1: «Alloy 2024»
- AUB-2024 (Aubert & Duval):
  - densita, p. 2: «Density: 2.77»
  - designazioni, p. 1: «EN AW-2024 (Al Cu4Mg1)»
  - designazioni, p. 1: «UNS : A92024»
  - designazioni, p. 1: «AU4G1»

### Alluminio 5083 (`5083`, Alluminio e leghe)

- **Densità: 2.66 g/cm³** (documenti concordi).
- HYD-5083 (Hydro):
  - composizione, p. 1: «Min. 0.40 4.00 0.05»
  - composizione, p. 1: «Max. 0.40 0.40 0.10 1.00 4.90 0.25 0.25 0.15 0.05 0.15»
  - densita, p. 1: «2.66 69.20 25.80»
  - designazioni, p. 1: «International designation conforms AA 5083 – EN AW 5083 – AlMg4,5Mn0,7»
  - nome_commerciale, p. 1: «Njørdal™ H116»
- WIE-A14 (Wieland-Werke AG):
  - densita, p. 4: «Density at 20 °C: 2.66 g/cm³ (Lit.)»
  - designazioni, p. 2: «EN AW-Al Mg4.5Mn0.7 · Material number (DIN EN 573-1): EN AW-5083»

### Titanio grado 2 (CP) (`ti-gr2`, Titanio)

- **Densità nominale: 4.515 g/cm³**, intervallo 4.51–4.52. ATI: 4,51 g/cm³ per barra e billetta e 4,52 g/cm³ per lamiera, nastro e piatto (pagina prodotto); scheda tecnica 4,51.
- ATI-CP2W (ATI (Allegheny Technologies)):
  - composizione, pagina web: «Fe 0.30 O 0.25 C 0.08 N 0.03 H 0.015 Ti Balance Density lb/in 3 g/cm 3 0.163 4.51»
  - densita, pagina web: «Fe 0.30 O 0.25 C 0.08 N 0.03 H 0.015 Ti Balance Density lb/in 3 g/cm 3 0.163 4.52»
  - designazioni, pagina web: «ASTM B-265, ASME SB-265, AMS 4902, ASTM F-67»
- ATI-CP2T (ATI (Allegheny Technologies)):
  - densita, p. 1: «Density: 0.163 lbs/in ; 4.51 gm/cm»
  - designazioni, p. 1: «ATI 40, CP Grade 2»
  - designazioni, p. 1: «UNS R50250, R50400, R50550, R50700»
  - designazioni, p. 1: «ASTM Grades I, II, III, IV»

### Titanio Ti-6Al-4V (grado 5) (`ti-6al-4v`, Titanio)

- **Densità nominale: 4.45 g/cm³**, intervallo 4.43–4.47. ATI: 4,43 g/cm³ (pagina prodotto, 0,160 lb/in³) e 4,47 g/cm³ (scheda tecnica 2012, 0,160 lb/in³): valori diversi per la stessa densità in lb/in³.
- ATI-64W (ATI (Allegheny Technologies)):
  - composizione, pagina web: «Al 5.5 6.75 V 3.5 4.5 Fe 0.40 O 0.20 C 0.08 N 0.05 H 0.015 Ti Balance Density lb/in 3 g/cm 3 0.160 4.43»
  - composizione, pagina web: «Fe 0.30 O 0.20 C 0.08 N 0.05 H 0.015»
  - densita, pagina web: «Density lb/in 3 g/cm 3 0.160 4.43»
  - designazioni, pagina web: «ASTM B265, ASME SB-265, MIL-T-9046, AMS 4911»
- ATI-64T (ATI (Allegheny Technologies)):
  - densita, p. 1: «Density: 0.160 lbs/cu. in.; 4.47 gm/cc»
  - designazioni, p. 1: «(UNS R56400)»
  - designazioni, p. 1: «ATI Ti-6Al-4V, Grade 5»

### Ottone CuZn39Pb3 (CW614N) (`cuzn39pb3`, Rame, ottone, bronzo)

- **Densità nominale: 8.48 g/cm³**, intervallo 8.46–8.5. Wieland 8,46 g/cm³; Diehl 8,5 g/cm³.
- WIE-Z32 (Wieland-Werke AG):
  - composizione, p. 2: «copper 57.0-59.0% 7440-66-6 zinc Balance% 7439-92-1 lead 2.5-3.5%»
  - composizione, p. 2: «nickel max. 0.3%»
  - densita, p. 5: «Density at 20 °C (68 °F): 8.46 g/cm³»
  - designazioni, p. 2: «Material Code (CEN/TS 13388): CuZn39Pb3»
  - designazioni, p. 2: «Material number (CEN/TS 13388): CW614N»
  - designazioni, p. 2: «UNS-number: C38500»
  - nome_commerciale, p. 1: «Trade name: Wieland-Z32»
- WIE-Z33 (Wieland-Werke AG):
  - densita, p. 5: «Density at 20 °C (68 °F): 8.46 g/cm³»
  - nome_commerciale, p. 1: «Trade name: Wieland-Z33»
- DIE-002 (Diehl Brass Solutions):
  - densita, p. 1: «Density g/cm³ 8.5»
  - designazioni, p. 1: «DIN EN symbol CuZn39Pb3»
  - designazioni, p. 1: «DIN EN CW614N»
  - designazioni, p. 1: «UNS C38500»
  - nome_commerciale, p. 1: «Diehl Brass Solutions 002»

### Rame Cu-ETP (CW004A) (`cu-etp`, Rame, ottone, bronzo)

- **Densità: 8.9 g/cm³** (documenti concordi).
- KEM-CUETP (Gebr. Kemper GmbH + Co KG):
  - composizione, p. 1: «Cu [%] O [%] min. 99,9 max. 0,04»
  - densita, p. 1: «Dichte 8,9 g/cm³»
  - designazioni, p. 1: «EN CW004A / UNS C11000»
- WIE-K32 (Wieland-Werke AG):
  - densita, p. 4: «Density at 20 °C (68 °F): 8.9 g/cm³»
  - composizione, p. 1: «copper min. 99.90%»
  - designazioni, p. 1: «Material Code (CEN/TS 13388): Cu-ETP»
  - designazioni, p. 1: «Material number (CEN/TS 13388): CW004A»
  - nome_commerciale, p. 1: «Trade name: Wieland-K32»

### Stagno (Sn) (`sn`, Stagno)

- **Densità nominale: 7.3 g/cm³**, intervallo 7.29–7.31. NIST 7,310 g/cm³ (costante usata nei calcoli); Indium 7,29 g/cm³ (β-stagno). Lo stagno grigio α (5,77 g/cm³, Indium) non è considerato.
- NIST-T1 (NIST (National Institute of Standards and Technology)):
  - densita, pagina web: «50 Sn Tin 0.42120 488.0 7.310E+00»
  - designazioni, pagina web: «50 Sn Tin»
- IND-SN (Indium Corporation):
  - densita, p. 2: «7.29g/cm 3 β tin»

### Inconel 718 (`inconel718`, Altri)

- **Densità nominale: 8.207 g/cm³**, intervallo 8.193–8.221. Special Metals riporta solo lb/in³: 0,296 (ricotto) = 8,193 g/cm³ e 0,297 (ricotto e invecchiato) = 8,221 g/cm³, convertiti con 1 lb = 0,45359237 kg e 1 in = 25,4 mm.
- SPE-718 (Special Metals Corporation):
  - composizione, p. 1: «Nickel (plus Cobalt) .......................................................50.00-55.00»
  - composizione, p. 1: «Chromium......................................................................17.00-21.00»
  - composizione, p. 1: «Niobium (plus Tantalum)....................................................4.75-5.50»
  - composizione, p. 1: «Molybdenum .....................................................................2.80-3.30»
  - composizione, p. 1: «Titanium.............................................................................0.65-1.15»
  - composizione, p. 1: «Aluminum ..........................................................................0.20-0.80»
  - composizione, p. 1: «Cobalt ...............................................................................1.00 max.»
  - composizione, p. 1: «Carbon ..............................................................................0.08 max.»
  - composizione, p. 1: «Manganese .......................................................................0.35 max.»
  - composizione, p. 1: «Silicon ...............................................................................0.35 max.»
  - composizione, p. 1: «Phosphorus.....................................................................0.015 max.»
  - composizione, p. 1: «Sulfur...............................................................................0.015 max.»
  - composizione, p. 1: «Boron ..............................................................................0.006 max.»
  - composizione, p. 1: «Copper..............................................................................0.30 max.»
  - composizione, p. 1: «Iron .....................................................................................Balance»
  - densita, p. 1: «Annealed..............................................................................0.296»
  - densita, p. 1: «Annealed and Aged .............................................................0.297»
  - designazioni, p. 1: «INCONEL® alloy 718 (UNS N07718/W.Nr. 2.4668)»
  - nome_commerciale, p. 1: «INCONEL® alloy 718»
