#!/usr/bin/env python3
"""Costruisce il blocco DB e il report delle fonti, verificando ogni prova contro il testo del documento.
Uso: python3 -I costruisci_db.py <cartella-fonti> <out-json> <out-report-md> [--solo-verifica]
Ogni 'prova' è (campo, regex): la regex deve comparire nel testo del documento; la pagina viene registrata.
"""
import sys, os, re, json, hashlib, subprocess, html

BASE, OUT_JSON, OUT_MD = sys.argv[1], sys.argv[2], sys.argv[3]
SOLO = '--solo-verifica' in sys.argv
OGGI = '2026-11-13'
OGGI_2C = '2026-11-14'
# Etichetta del DB: ogni modifica ai dati dopo una versione pubblicata alza la versione (e aggiorna la data); mai due contenuti con la stessa etichetta.
#   v3 = 6 nuove voci e alias della Fase 2c (27 voci, 2026-11-14)
#   v4 = Fase 2d: flag «tipico» sulla densità di C45, S355J2, S235JR (Ovako) e Inconel 718 (Special Metals SMC-045): letture dichiarate tipiche dal documento
DB_VERSIONE = '4'
DB_DATA = '2026-11-14'
TOCCATE_V4 = {'c45', 's355j2', 's235jr', 'inconel718'}   # voci i cui dati sono cambiati nella v4: data_verifica = DB_DATA
TOCCATE_2C = {'39nicrmo3', '1.4462', '1.2343', '1.2311', 's235jr', 'c45', '1.2379'}

# ---------------------------------------------------------------- documenti
D = {}
def doc(id, path, emittente, titolo, url, utente=False):
    D[id] = dict(id=id, path=path, emittente=emittente, titolo=titolo, url=url, utente=utente)

LUC = 'https://www.lucefin.com/wp-content/'
doc('LUC-C45E',  'c45e/lucefin_C45E.pdf', 'Lucefin Group', 'Scheda dati C45E (ISO 683-1:2018), rev. 2024', LUC+'uploads/2025/01/C45E.pdf')
doc('TK-1191',   'c45e/thyssenkrupp_1191_1201.pdf', 'thyssenkrupp Materials Austria', 'TK 1191 / TK 1201, Werkstoffdatenblatt Unlegierter Vergütungsstahl', 'https://ucpcdn.thyssenkrupp.com/_legacy/UCPthyssenkruppBAMXAustria/assets.files/download/baustahl_datenblatt_tk_1191_1201.pdf')
doc('LUC-42CRMO4','42crmo4/lucefin_42CrMo4.pdf', 'Lucefin Group', 'Technical card 42CrMo4 (ISO 683-2:2018), rev. 2018', LUC+'files_mf/152353604042CrMo4.pdf')
doc('TK-42CRMO4','42crmo4/thyssenkrupp_42CrMo4.pdf', 'thyssenkrupp Materials (Schulte)', 'Werkstoffdatenblatt 42CrMo4 / 42CrMoS4 (1.7225 / 1.7227)', 'https://ucpcdn.thyssenkrupp.com/_binary/UCPthyssenkruppBAMaterialsSchulte/dc4e3d67-9afe-4b41-8794-a82c0d3ab7bb/42CrMo4-42CrMoS4-1.7225-1.7227.pdf')
doc('LUC-16MNCR5','16mncr5/lucefin_16MnCr5.pdf', 'Lucefin Group', 'Technical card 16MnCr5 (ISO 683-3:2018), rev. 2024', LUC+'uploads/2025/01/ENG-16MnCr5.pdf')
doc('OVA-16MNCR5','16mncr5/ovako_16MnCr5.pdf', 'Ovako', 'Steel Navigator, scheda 16MnCr5 (PDF dal sito)', 'https://steelnavigator.ovako.com/steel-grades/16mncr5/pdf')
doc('LUC-100CR6','100cr6/lucefin_100Cr6.pdf', 'Lucefin Group', 'Technical card 100Cr6 (ISO 683-17:2014), rev. 2018', LUC+'files_mf/1523536908100Cr6.pdf')
doc('SWI-100CR6','100cr6/swisssteel_1.3505.pdf', 'Swiss Steel Group (Deutsche Edelstahlwerke)', 'Durapur 3505, Werkstoffdatenblatt 100Cr6 / 1.3505, 16/10/2015', 'https://swisssteel-group.com/content-media/documents/Data-Sheets/Engineering-Steel/1.3505_de.pdf')
doc('OVA-100CR6','100cr6/ovako_100Cr6.pdf', 'Ovako', 'Steel Navigator, scheda 100Cr6 (PDF dal sito)', 'https://steelnavigator.ovako.com/steel-grades/100cr6/pdf')
doc('LUC-S355J2','s355j2/lucefin_S355J2.pdf', 'Lucefin Group', 'Technical card S355J2 (EN 10025-2:2014), rev. 2018', LUC+'files_mf/1522935764S355J2.pdf')
doc('OVA-S355J2','s355j2/ovako_S355J2.pdf', 'Ovako', 'Steel Navigator, scheda S355J2 (PDF dal sito)', 'https://steelnavigator.ovako.com/steel-grades/s355j2/pdf')
doc('LUC-11SMNPB30','11smnpb30/lucefin_11SMnPb30.pdf', 'Lucefin Group', 'Technical card 11SMnPb30 (ISO 683-4:2018), rev. 2024', LUC+'uploads/2025/01/ENG-11SMnPb30.pdf')
doc('SWI-E217',  '11smnpb30/swisssteel_E217.pdf', 'Swiss Steel Group (Steeltec)', 'Technical Datasheet SwissCut, 28.06.23 Rev. N°1', 'https://swisssteel-group.com/content-media/documents/Data-Sheets/Engineering-Steel/E217_SwissCut_Technischesdatenblatt_0715.pdf')
doc('LUC-4301',  '304/lucefin_4301.pdf', 'Lucefin Group', 'Technical card 1.4301 X5CrNi18-10 (EN 10088-3:2014), 2018', LUC+'files_mf/15235416291.4301A304.pdf')
doc('SWI-4301',  '304/swisssteel_4301.pdf', 'Swiss Steel Group (Deutsche Edelstahlwerke)', 'Datasheet 1.4301 Chromium-nickel austenitic stainless steel', 'https://www.swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/Datenblatt_4301_UK.pdf')
doc('LUC-4401',  '316/lucefin_1.4401.pdf', 'Lucefin Group', 'Technical card 1.4401 X5CrNiMo17-12-2 (EN 10088-3:2014), 2018', LUC+'files_mf/15235422061.4401A316.pdf')
doc('SWI-4401',  '316/swisssteel_1.4401.pdf', 'Swiss Steel Group (Deutsche Edelstahlwerke)', 'Acidur 4401, Werkstoffdatenblatt 1.4401, 02/12/2015', 'https://swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/1.4401_de.pdf')
doc('LUC-4542',  '17-4ph/lucefin_1.4542.pdf', 'Lucefin Group', 'Technical card 1.4542 X5CrNiCuNb16-4 17-4 PH (EN 10088-3:2014), 2018', LUC+'files_mf/15235430111.4542Tp630.pdf')
doc('FAG-174',   '17-4ph/fagersta_17-4PH.pdf', 'Marcegaglia Specialties, Fagersta Stainless', 'R565.10 (17-4 PH), ENG 2025, Edition 1', 'https://www.fagersta.marcegaglia.com/wp-content/uploads/2023/07/1.4542-17-4PH-R565.10-ENG-2025-Edition-1.pdf')
doc('LUC-12344', '1.2344/lucefin_1.2344.pdf', 'Lucefin Group', 'Technical card 1.2344 X40CrMoV5-1 (UNI EN ISO 4957:2002), rev. 2018', LUC+'files_mf/15236076191.2344X40CrMoV51.pdf')
doc('BOE-W302B', '1.2344/boehler_W302_isobloc.pdf', 'voestalpine BÖHLER Edelstahl', 'Data sheet BÖHLER W302 ISOBLOC', 'https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w302-isobloc_en_gb.pdf')
doc('BOE-W302D', '1.2344/boehler_W302_isodisc.pdf', 'voestalpine BÖHLER Edelstahl', 'Data sheet BÖHLER W302 ISODISC', 'https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w302-isodisc_en_gb.pdf')
doc('SWI-12344', '1.2344/swisssteel_1.2344.pdf', 'Swiss Steel Group', 'Technical datasheet Thermodur 2344 EFS, 10.05.23 Rev.00', 'https://swisssteel-group.com/content-media/documents/_import/1.2344_en.pdf')
doc('LUC-12379', '1.2379/lucefin_1.2379.pdf', 'Lucefin Group', 'Technical card 1.2379 X153CrMoV12 (UNI EN ISO 4957:2002), rev. 2018', LUC+'files_mf/15236079471.2379X153CrMoV12.pdf')
doc('BOE-K110',  '1.2379/boehler_K110.pdf', 'voestalpine BÖHLER Edelstahl', 'Data sheet BÖHLER K110', 'https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/k110_en_gb.pdf')
doc('HYD-6082',  '6082/hydro_6082.pdf', 'Hydro', 'Technical datasheet, Extruded products, Alloy EN AW-6082', 'https://www.hydro.com/globalassets/08-about-hydro/hydro-worldwide/austria/nenzing/alloy-data-sheets/hydro-en-aw-6082.pdf')
doc('WIE-A32',   '6082/wieland_A32_info.pdf', 'Wieland-Werke AG', 'Information sheet for articles Wieland-A32 (EN AW-6082), 10.11.2020, vers. 5', 'https://www.wieland.com/content/download/10451/file/Wieland-A32_EN.pdf')
doc('KAI-7075SP','7075/kaiser_7075_sheet_plate.pdf', 'Kaiser Aluminum', 'Sheet Coil & Plate Alloy 7075, Technical Data, Rev. 05/06', 'https://online.kaiseraluminum.com/depot/PublicProductInformation/Document/1017/Kaiser_Aluminum_7075_Sheet_Coil_and_Plate.pdf')
doc('KAI-7075RB','7075/kaiser_7075_rod_bar.pdf', 'Kaiser Aluminum', 'Rod & Bar Alloy 7075, Technical Data', 'https://online.kaiseraluminum.com/depot/PublicProductInformation/Document/1028/Kaiser_Aluminum_7075_Rod_and_Bar.pdf')
doc('WIE-A07',   '7075/wieland_A07_info.pdf', 'Wieland-Werke AG', 'Information sheet for articles Wieland-A07 (EN AW-7075), 15.05.2025, vers. 6', 'https://www.wieland.com/content/download/10433/file/Wieland-A07_EN.pdf')
doc('KAI-2024',  '2024/kaiser_2024_sheet_plate.pdf', 'Kaiser Aluminum', 'Sheet Coil & Plate Alloy 2024, Technical Data', 'https://online.kaiseraluminum.com/depot/PublicProductInformation/Document/1012/Kaiser_Aluminum_2024_Sheet_Coil_and_Plate.pdf')
doc('AUB-2024',  '2024/aubertduval_2024.pdf', 'Aubert & Duval', 'Aluminium alloy 2024 (Al Cu4Mg1), scheda', 'https://www.aubertduval.com/wp-content/uploads/2024/12/2024_GB.pdf')
doc('HYD-5083',  '5083/hydro_H116_njordal.pdf', 'Hydro', 'Njørdal™ H116, coil, sheet & plate for marine and offshore', 'https://www.hydro.com/globalassets/01-products--services/rolled-products/ge_h116_njordal_200514.pdf')
doc('WIE-A14',   '5083/wieland_A14_info.pdf', 'Wieland-Werke AG', 'Information sheet for articles Wieland-A14 (EN AW-5083), 10.11.2020, vers. 5', 'https://www.wieland.com/content/download/10445/file/Wieland-A14_EN.pdf')
doc('ATI-CP2T',  'ti-gr2/ati_cp2_tds.pdf', 'ATI (Allegheny Technologies)', 'Technical Data Sheet ATI 30, CP Grade 1, ATI 40, CP Grade 2, ATI 55, CP Grade 3, ATI 70, CP Grade 4, version 1 (2/21/2012)', 'https://www.atimaterials.com/Products/Documents/datasheets/titanium/commerciallypure/ati_cp2_tds_en.pdf')
doc('ATI-CP2W',  'ti-gr2/ati_cp2_pagina.html', 'ATI (Allegheny Technologies)', 'Pagina prodotto «ATI 40, CP Grade 2», sezione Product Specifications By Form', 'https://www.atimaterials.com/Products/ati-cp2')
doc('ATI-64T',   'ti-6al-4v/ati_6-4_tds.pdf', 'ATI (Allegheny Technologies)', 'Technical Data Sheet ATI Ti-6Al-4V, Grade 5, version 1 (1/31/2012)', 'https://www.atimaterials.com/Products/Documents/datasheets/titanium/alloyed/ati_6-4_tds_en_v1.pdf')
doc('ATI-64W',   'ti-6al-4v/ati_6-4_pagina.html', 'ATI (Allegheny Technologies)', 'Pagina prodotto «ATI 6-4 Titanium», sezione Product Specifications By Form', 'https://www.atimaterials.com/Products/Pages/ati-6-4-grade5.aspx')
doc('DIE-002',   'cuzn39pb3/diehl_EN_002.pdf', 'Diehl Brass Solutions', 'Material Datasheet 002 (CuZn39Pb3)', 'https://www.diehl.com/cms/files/Diehl_Brass_Solutions_Material_Datasheet_002.pdf')
doc('WIE-Z32',   'cuzn39pb3/wieland_Z32.pdf', 'Wieland-Werke AG', 'Safety data sheet Wieland-Z32 (CuZn39Pb3), 06/14/2022, vers. 12', 'https://www.wieland.com/en/content/download/11066/file/Wieland-Z32-USA_EN.pdf')
doc('WIE-Z33',   'cuzn39pb3/wieland_Z33.pdf', 'Wieland-Werke AG', 'Safety data sheet Wieland-Z33 (CuZn39Pb3), 06/14/2022, vers. 11', 'https://www.wieland.com/en/content/download/11067/file/Wieland-Z33-USA_EN.pdf')
doc('KEM-CUETP', 'cu-etp/kemper_cu-etp_DE.pdf', 'Gebr. Kemper GmbH + Co KG', 'Datenblatt Cu-ETP / datasheet Cu-ETP, Stand 03/2024', 'https://www.kemper-group.com/media/de-at/content/04-produkte/walzprodukte/datenblaetter/cu-etp.pdf')
doc('WIE-K32',   'cu-etp/wieland_K32.pdf', 'Wieland-Werke AG', 'Safety data sheet Wieland-K32 (Cu-ETP), 05/09/2022, vers. 6', 'https://www.wieland.com/en/content/download/10983/file/Wieland-K32-USA_EN.pdf')
doc('NIST-T1',   'sn/nist_tab1.html', 'NIST (National Institute of Standards and Technology)', 'X-Ray Mass Attenuation Coefficients, Table 1 (costanti dei materiali, Z=50 Sn)', 'https://physics.nist.gov/PhysRefData/XrayMassCoef/tab1.html')
doc('IND-SN',    'sn/indium_Commercial-Tin-PDS.pdf', 'Indium Corporation', 'Product Data Sheet Commercial Tin Metal, Form No. 98803 R0', 'https://www.indium.com/wp-content/uploads/2025/03/Commercial-Tin-Metal-PDS-98803-R0-1.pdf')
doc('SPE-718',   'inconel718/specialmetals_718.pdf', 'Special Metals Corporation', 'INCONEL® alloy 718, pubblicazione SMC-045 (Sept 07)', 'https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-718.pdf')

doc('WEE-7075',  'alias-ergal/weerg_IT_Alluminio7075.pdf', 'Weerg', 'Scheda tecnica v2.1 «Alluminio 7075», Lavorazione CNC (ultima revisione 28/10/2024)', 'https://www.weerg.com/hubfs/Datasheets/Datasheets%202024/ITA/IT_Alluminio7075.pdf')
doc('UPM-ERGAL', 'alias-ergal/univpm_tesi_AlZnCuMg.pdf', 'Università Politecnica delle Marche', 'Tesi di laurea triennale in Ingegneria meccanica, a.a. 2018/2019: «Ruolo degli alliganti nei trattamenti termici di una lega Al-Zn-Cu-Mg»', 'https://tesi.univpm.it/retrieve/3635655c-26a5-4a03-9202-85bc2542bb29/Ruolo%20degli%20alliganti%20nei%20trattamenti%20termici%20di%20una%20lega%20Al-Zn-Cu-Mg%20.pdf')

# ---------------------------------------------------------------- lettura documenti
_cache = {}
def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 16), b''):
            h.update(b)
    return h.hexdigest()

def pagine(id):
    if id in _cache: return _cache[id]
    p = os.path.join(BASE, D[id]['path'])
    if p.endswith('.html'):
        t = open(p, encoding='utf8', errors='replace').read()
        t = re.sub(r'<script.*?</script>|<style.*?</style>', '', t, flags=re.S)
        t = html.unescape(re.sub(r'<[^>]+>', '\n', t))
        L = [l.strip() for l in t.split('\n') if l.strip()]
        pg = [' '.join(L)]
    else:
        out = subprocess.run(['pdftotext', '-layout', p, '-'], capture_output=True, text=True, errors='replace').stdout
        pg = out.split('\f')
        if pg and not pg[-1].strip(): pg = pg[:-1]
    _cache[id] = pg
    D[id]['sha256'] = sha(p)
    return pg

ERRORI = []
def prova(docid, campo, rx):
    pg = pagine(docid)
    for i, t in enumerate(pg, 1):
        m = re.search(rx, t, re.S)
        if m:
            ex = re.sub(r'\s+', ' ', m.group(0)).strip()
            return dict(campo=campo, pagina=i, estratto=ex[:140], _full=ex)
    ERRORI.append(f'PROVA NON TROVATA: {docid} [{campo}] /{rx}/')
    return dict(campo=campo, pagina=0, estratto='?')

def fonte(docid, prove, densita=None):
    # ogni prova è (campo, regex) oppure (campo, regex, frase): con la frase, quella è mostrata nel registro al posto del taglio automatico
    # a 140 caratteri (serve quando il testo estratto dal PDF è intercalato alle celle di una tabella); la regex resta la verifica sul testo.
    ps = []
    for t in prove:
        pr = prova(docid, t[0], t[1])
        ps.append(dict(pr, estratto=t[2]) if len(t) > 2 else pr)
    f = dict(id=docid, prove=ps, campi=sorted({t[0] for t in prove}))
    if densita: f['densita_letta'] = densita if isinstance(densita, list) else [densita]
    return f

def g(val, unita='g/cm³'):  # densità letta già in g/cm³ o kg/dm³ (=g/cm³) o Mg/m³ (=g/cm³)
    return dict(valore=val, unita=unita, g_cm3=float(val.replace(',', '.')))

LB_IN3 = 453.59237 / (2.54 ** 3)  # g/cm³ per 1 lb/in³, dalle costanti definite
def lb(val, tipico=False):   # tipico=True solo se il documento dichiara quella lettura come «valore tipico» (la prova deve includere la dichiarazione)
    d = dict(valore=val, unita='lb/in³', g_cm3=round(float(val) * LB_IN3, 3))
    if tipico: d['tipico'] = True
    return d

# ---------------------------------------------------------------- voci
def el(**k): return k
E = []
FAM = ['Acciai al carbonio', 'Acciai da bonifica', 'Acciai legati', 'Acciai per utensili', 'Acciai inox', 'Acciai speciali',
       'Ghise', 'Ferro', 'Alluminio e leghe', 'Rame, ottone, bronzo', 'Stagno', 'Titanio', 'Altri']

def voce(id, nome, famiglia, des, nome_comm, comp, fonti, nota_int=''):
    E.append(dict(id=id, nome=nome, famiglia=famiglia, designazioni=des, nome_commerciale=nome_comm,
                  composizione=comp, fonti=fonti, nota_intervallo=nota_int))

def lega(rif, elementi, nota='', parziale=False):
    c = dict(tipo='lega', riferimento=rif, elementi=elementi)
    if parziale: c['parziale'] = True
    if nota: c['nota'] = nota
    return c

# 1. C45E
voce('c45e', 'C45E', 'Acciai da bonifica',
     dict(EN='C45E', WNr='1.1191', UNI='C45', AISI_SAE='1045', DIN='Ck45', altre=['UNE F1140', 'AFNOR XC48', 'BS 080M46', 'SS 1672']), '',
     lega('ISO 683-1:2018, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(min=0.42, max=0.50), Si=dict(min=0.10, max=0.40), Mn=dict(min=0.50, max=0.80), P=dict(max=0.025), S=dict(max=0.035),
               Cr=dict(max=0.40), Mo=dict(max=0.10), Ni=dict(max=0.40), Cu=dict(max=0.30), Fe='resto'),
          'Cr+Mo+Ni max 0,63 %.'),
     [fonte('LUC-C45E', [('densita', r'Massa Volumica\s+Kg/dm3\s+7\.85'),
                         ('composizione', r'0,42-0,50\s+0,10-0,40\s+0,50-0,80\s+0,025\s+0,035\s+0,40\s+0,10\s+0,40\s+0,30'),
                         ('designazioni', r'C45E\s+C45\s+F1140\s+Ck45\s+XC48\s+080M46\s+1672\s+1045'),
                         ('designazioni', r'Numero\s+1\.1191')], g('7.85', 'kg/dm³'))])

# 2. 42CrMo4
voce('42crmo4', '42CrMo4', 'Acciai da bonifica',
     dict(EN='42CrMo4', WNr='1.7225', UNI='42CrMo4', AISI_SAE='4140', DIN='42CrMo4', altre=['BS 708M40', 'AFNOR 42CD4']), '',
     lega('ISO 683-2:2018, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(min=0.38, max=0.45), Si=dict(min=0.10, max=0.40), Mn=dict(min=0.60, max=0.90), P=dict(max=0.025), S=dict(max=0.035),
               Cr=dict(min=0.90, max=1.20), Mo=dict(min=0.15, max=0.30), Cu=dict(max=0.40), Fe='resto'),
          'Il silicio può essere fornito più basso (nota a della scheda).'),
     [fonte('LUC-42CRMO4', [('densita', r'Density\s+Kg/dm3\s+7\.85'),
                            ('composizione', r'0,38-0,45\s+0,10-0,40\s+0,60-0,90\s+0,025\s+0,035\s+0,90-1,20\s+0,15-0,30\s+0,40'),
                            ('designazioni', r'42CrMo4\s+42CrMo4\s+ML42CrMo\s+42CrMo4\s+42CD4\s+708M40\s+38ChM\s+4140'),
                            ('designazioni', r'Number\s+1\.7225')], g('7.85', 'kg/dm³'))])

# 3. 16MnCr5
voce('16mncr5', '16MnCr5', 'Acciai legati',
     dict(EN='16MnCr5', WNr='1.7131', UNI='16MnCr5', AISI_SAE='5115', DIN='16MnCr5', altre=[]), '',
     lega('ISO 683-3:2018, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(min=0.14, max=0.19), Si=dict(min=0.15, max=0.40), Mn=dict(min=1.00, max=1.30), P=dict(max=0.025), S=dict(max=0.035),
               Cr=dict(min=0.80, max=1.10), Cu=dict(max=0.40), Fe='resto')),
     [fonte('LUC-16MNCR5', [('densita', r'Density\s+Kg/dm3\s+7\.85'),
                            ('composizione', r'0,14-0,19\s+0,15-0,40\s+1,00-1,30\s+0,025\s+0,035\s+0,80-1,10\s+0,40'),
                            ('designazioni', r'16MnCr5\s+16MnCr5\s+15CrMn\s+16MnCr5\s+16MC\s+16HG\s+5115'),
                            ('designazioni', r'Number\s+1\.7131')], g('7.85', 'kg/dm³')),
      fonte('OVA-16MNCR5', [('densita', r'Density \(kg/m3\)\s+210\s+0\.3\s+80\s+7800')], dict(valore='7800', unita='kg/m³', g_cm3=7.8))],
     'Lucefin 7,85 kg/dm³; Ovako 7800 kg/m³ (valore tipico).')

# 4. 100Cr6
voce('100cr6', '100Cr6', 'Acciai legati',
     dict(EN='100Cr6', WNr='1.3505', UNI='', AISI_SAE='52100', DIN='', altre=['UNE F.1310', 'BS 2S135 / 535A99', 'JIS SUJ2', 'AFNOR 100C6', 'SS 2258']),
     'Durapur 3505',
     lega('ISO 683-17:2014, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(min=0.93, max=1.05), Si=dict(min=0.15, max=0.35), Mn=dict(min=0.25, max=0.45), P=dict(max=0.025), S=dict(max=0.015),
               Cr=dict(min=1.35, max=1.60), Mo=dict(max=0.10), Al=dict(max=0.050), Cu=dict(max=0.30), Fe='resto'),
          'Ossigeno max 0,0015 a discrezione del produttore.'),
     [fonte('LUC-100CR6', [('densita', r'Density\s+Kg/dm3\s+7\.81'),
                           ('composizione', r'0,93-1,05\s+0,15-0,35\s+0,25-0,45\s+0,025\s+0,015\s+1,35-1,60\s+0,10\s+0,050\s+0,30'),
                           ('designazioni', r'Number\s+1\.3505')], g('7.81', 'kg/dm³')),
      fonte('SWI-100CR6', [('densita', r'Dichte in kg/dm3\s+7,8\b'),
                           ('composizione', r'max\.\s+1,05\s+0,35\s+0,45\s+0,025\s+0,015\s+1,6\s+0,1'),
                           ('designazioni', r'AISI\s+52100'), ('designazioni', r'UNE\s+F\.1310'), ('designazioni', r'B\.S\.\s+2S135, 535A99'),
                           ('designazioni', r'JIS\s+SUJ2'), ('designazioni', r'AFNOR\s+100C6'), ('designazioni', r'SS\s+2258'),
                           ('nome_commerciale', r'Durapur 3505 ist ein klassischer Wälzlagerstahl')], g('7,8', 'kg/dm³')),
      fonte('OVA-100CR6', [('densita', r'Density \(kg/m3\)\s+210\s+0\.3\s+80\s+7800')], dict(valore='7800', unita='kg/m³', g_cm3=7.8))],
     'Lucefin 7,81; Swiss Steel 7,8; Ovako 7800 kg/m³: differenze di arrotondamento.')

# 5. S355J2
voce('s355j2', 'S355J2', 'Acciai al carbonio',
     dict(EN='S355J2', WNr='1.0577', UNI='', AISI_SAE='', DIN='', altre=[]), '',
     lega('EN 10025-2:2014, analisi di colata, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(max=0.20), Si=dict(max=0.55), Mn=dict(max=1.60), P=dict(max=0.025), S=dict(max=0.025), Cu=dict(max=0.40), Fe='resto'),
          'C max 0,22 % su analisi di colata e 0,24 % sul prodotto per spessori >30 mm fino a 100 mm; oltre 100 mm da concordare (nota a della scheda). Nessun valore N riportato per l\'analisi di colata.'),
     [fonte('LUC-S355J2', [('composizione', r'0,20 a\)\s+0,55\s+1,60\s+0,025\s+0,025\s+0,40'),
                           ('composizione', r'EN 10025-2: 2014'),
                           ('designazioni', r'Number\s+1\.0577')]),
      fonte('OVA-S355J2', [('densita', r'Other properties \(typical values\)\s+Youngs module \(GPa\)\s+Poisson.s ratio \(-\)\s+Shear module \(GPa\)\s+Density \(kg/m3\)\s+210\s+0\.3\s+80\s+7800')], dict(valore='7800', unita='kg/m³', g_cm3=7.8, tipico=True))],
     '')

# 6. 11SMnPb30
voce('11smnpb30', '11SMnPb30', 'Acciai al carbonio',
     dict(EN='11SMnPb30', WNr='1.0718', UNI='CF 9SMnPb28', AISI_SAE='12L14', DIN='9SMnPb28', altre=['AFNOR S250Pb', 'GB Y15Pb']),
     'SwissCut SC30Pb',
     lega('ISO 683-4:2018, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(max=0.14), Si=dict(max=0.05), Mn=dict(min=0.90, max=1.30), P=dict(max=0.11), S=dict(min=0.27, max=0.33), Pb=dict(min=0.20, max=0.35), Fe='resto'),
          'Silicio non aggiunto intenzionalmente; con ossidi speciali si può concordare 0,10-0,40 %.'),
     [fonte('LUC-11SMNPB30', [('densita', r'Density\s+Kg/dm3\s+7\.85'),
                              ('composizione', r'0,14\s+0,05\s+0,90-1,30\s+0,11\s+0,27-0,33\s+0,20-0,35'),
                              ('designazioni', r'11SMnPb30\s+CF 9SMnPb28\s+Y15Pb\s+9SMnPb28\s+S250Pb\s+\(AS14\)\s+12L14'),
                              ('designazioni', r'Number\s+1\.0718')], g('7.85', 'kg/dm³')),
      fonte('SWI-E217', [('nome_commerciale', r'SC30Pb\s+-11SMnPb30\s+-1\.0718')])])

# 7. 304
voce('304', 'Inox 304 (1.4301)', 'Acciai inox',
     dict(EN='X5CrNi18-10', WNr='1.4301', UNI='', AISI_SAE='304', DIN='', altre=['UNS S30400', 'BS 304S15 / 304S31', 'JIS SUS304', 'AFNOR Z7CN18-09', 'SIS 2333']), '',
     lega('EN 10088-3:2014, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(max=0.07), Si=dict(max=1.00), Mn=dict(max=2.00), P=dict(max=0.045), S=dict(max=0.030), Cr=dict(min=17.5, max=19.5), Ni=dict(min=8.0, max=10.5), N=dict(max=0.10), Fe='resto'),
          'Zolfo controllato 0,015-0,030 % ammesso per la lavorabilità.'),
     [fonte('LUC-4301', [('densita', r'Density\s+Kg/dm3\s+7\.90'),
                         ('composizione', r'0,07\s+1,00\s+2,00\s+0,045\s+0,030\s+17,5-19,5\s+8,0-10,5\s+0,10\s+EN 10088-3: 2014'),
                         ('designazioni', r'X5CrNi18-10\s+S30400\s+\(304\)'), ('designazioni', r'Number\s+1\.4301')], g('7.90', 'kg/dm³')),
      fonte('SWI-4301', [('densita', r'density \(kg/dm3\)\s+7\.90'),
                         ('designazioni', r'AISI\s+304'), ('designazioni', r'UNS\s+S30400'), ('designazioni', r'BS\s+304S15 / 304S31'),
                         ('designazioni', r'JIS\s+SUS304'), ('designazioni', r'AFNOR\s+Z7CN18-09'), ('designazioni', r'SIS\s+2333')], g('7.90', 'kg/dm³'))])

# 8. 316
voce('316', 'Inox 316 (1.4401)', 'Acciai inox',
     dict(EN='X5CrNiMo17-12-2', WNr='1.4401', UNI='', AISI_SAE='316', DIN='', altre=['UNS S31600', 'BS 316S31', 'JIS SUS316', 'AFNOR Z7CND17-11-02 / Z7CND17-12-02', 'SS 2347', 'UNE F.3534']),
     'Acidur 4401',
     lega('EN 10088-3:2014, % in massa (norma citata sulle schede Lucefin e Swiss Steel)',
          dict(C=dict(max=0.07), Si=dict(max=1.0), Mn=dict(max=2.0), P=dict(max=0.045), S=dict(max=0.03), Cr=dict(min=16.5, max=18.5), Ni=dict(min=10.0, max=13.0), Mo=dict(min=2.0, max=2.5), N=dict(max=0.1), Fe='resto')),
     [fonte('LUC-4401', [('densita', r'Density\s+Kg/dm3\s+8\.00'),
                         ('composizione', r'0,07\s+1,00\s+2,00\s+0,045\s+0,030\s+16,5-18,5\s+10,0-13,0\s+0,10\s+2,0-2,5\s+EN 10088-3: 2014'),
                         ('designazioni', r'X5CrNiMo17-12-2\s+S31600\s+316'), ('designazioni', r'Number\s+1\.4401')], g('8.00', 'kg/dm³')),
      fonte('SWI-4401', [('densita', r'Dichte in kg/dm3\s+8,0\b'),
                         ('composizione', r'max\.\s+0,07\s+1,0\s+2,0\s+0,045\s+0,03\s+18,5\s+13,0\s+2,5\s+0,1'),
                         ('composizione', r'min\.\s+-\s+-\s+-\s+-\s+-\s+16,5\s+10,0\s+2,0'),
                         ('designazioni', r'AISI\s+316'), ('designazioni', r'UNS\s+S31600'), ('designazioni', r'B\.S\.\s+316S31'),
                         ('designazioni', r'JIS\s+SUS316'), ('designazioni', r'AFNOR\s+Z7CND17-11-02 /'), ('designazioni', r'Z7CND17-12-02'),
                         ('designazioni', r'SS\s+2347'), ('designazioni', r'UNE\s+F\.3534'),
                         ('nome_commerciale', r'Acidur 4401 ist ein nichtrostender')], g('8,0', 'kg/dm³'))])

# 9. 17-4PH
voce('17-4ph', 'Inox 17-4PH (1.4542)', 'Acciai inox',
     dict(EN='X5CrNiCuNb16-4', WNr='1.4542', UNI='', AISI_SAE='', DIN='', altre=['17-4 PH', 'ASTM Type 630', 'UNS S17400', 'JIS SUS 630']), '',
     lega('EN 10088-3:2014, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(max=0.07), Si=dict(max=0.70), Mn=dict(max=1.50), P=dict(max=0.040), S=dict(max=0.030), Cr=dict(min=15.0, max=17.0), Ni=dict(min=3.0, max=5.0), Mo=dict(max=0.60), Cu=dict(min=3.0, max=5.0), Nb=dict(max=0.45), Fe='resto'),
          'Nb: minimo 5 x C, massimo 0,45 %.'),
     [fonte('LUC-4542', [('densita', r'Density\s+Kg/dm3\s+7,80'),
                         ('composizione', r'0,07\s+0,70\s+1,50\s+0,040\s+0,030\s+15,0-17,0\s+3,0-5,0\s+0,60\s+3,0-5,0\s+5 x C < 0,45\s+EN 10088-3: 2014'),
                         ('designazioni', r'X5CrNiCuNb16-4\s+S17400\s+Type 630'), ('designazioni', r'Number\s+1\.4542 \(17-4 PH\)')], g('7,80', 'kg/dm³')),
      fonte('FAG-174', [('densita', r'Density\s+7\.8 g / cm3'), ('designazioni', r'EN:\s+1\.4542'), ('designazioni', r'Type:\s+630\s+17-4 PH')], g('7.8', 'g/cm³'))])

# 10. 1.2344
voce('1.2344', 'Acciaio per utensili 1.2344 (H13)', 'Acciai per utensili',
     dict(EN='X40CrMoV5-1', WNr='1.2344', UNI='', AISI_SAE='H13', DIN='X40CrMoV5-1', altre=['UNS T20813', 'JIS SKD61', 'AFNOR Z40CDV5', 'BS BH13', 'UNE F.5318', 'SS 2242', 'NADCA #207']),
     'BÖHLER W302 (ISODISC, ISOBLOC); Thermodur 2344 EFS',
     lega('UNI EN ISO 4957:2002, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(min=0.35, max=0.42), Si=dict(min=0.80, max=1.20), Mn=dict(min=0.25, max=0.50), P=dict(max=0.030), S=dict(max=0.020), Cr=dict(min=4.80, max=5.50), Mo=dict(min=1.20, max=1.50), V=dict(min=0.85, max=1.15), Fe='resto')),
     [fonte('LUC-12344', [('densita', r'Density\s+Kg/dm3\s+7\.74'),
                          ('composizione', r'0,35-0,42\s+0,80-1,20\s+0,25-0,50\s+0,030\s+0,020\s+4,80-5,50\s+1,20-1,50\s+0,85-1,15'),
                          ('composizione', r'UNI EN ISO 4957: 2002'),
                          ('designazioni', r'X40CrMoV5-1\s+X40CrMoV5-1\s+4Cr5MoSiV1\s+SKD 61\s+XT35Cr5MoV1 STD 61\s+4Ch4VMFS\s+H 13'),
                          ('designazioni', r'Number\s+1\.2344')], g('7.74', 'kg/dm³')),
      fonte('BOE-W302B', [('densita', r'Density \(kg/dm³\)\s+7\.8\b'),
                          ('designazioni', r'1\.2344 SEL\s+4957 EN ISO\s+X40CrMoV5-1 EN\s+#207 NADCA\s+T20813 UNS\s+G4404 JIS\s+H13 AISI\s+B1885 NADCA\s+SKD61 JIS'),
                          ('nome_commerciale', r'BÖHLER W302 ISOBLOC is a 5% chromium steel and corresponds to material number 1\.2344 \(X40CrMoV5-1\)')], g('7.8', 'kg/dm³')),
      fonte('BOE-W302D', [('densita', r'Density \(kg/dm³\)\s+7\.8\b'),
                          ('nome_commerciale', r'BÖHLER W302 ISODISC is a 5% chromium steel and corresponds to material number 1\.2344 \(X40CrMoV5-1\)')], g('7.8', 'kg/dm³')),
      fonte('SWI-12344', [('designazioni', r'X40CrMoV5-1\s+1\.2344\s+H13\s+BH13\s+Z40CDV5\s+SKD61\s+4Ch5MF1S\s+F\.5318\s+2242'),
                          ('nome_commerciale', r'Thermodur.{0,3}2344 EFS')])],
     'Lucefin 7,74 kg/dm³; Böhler 7,8 kg/dm³ (W302 ISOBLOC e ISODISC).')

# 11. 1.2379
voce('1.2379', 'Acciaio per utensili 1.2379 (D2)', 'Acciai per utensili',
     dict(EN='X153CrMoV12', WNr='1.2379', UNI='', AISI_SAE='D2', DIN='X155CrVMo12-1', altre=['UNS ~T30402']),
     'BÖHLER K110',
     lega('UNI EN ISO 4957:2002, % in massa (norma citata sulla scheda Lucefin)',
          dict(C=dict(min=1.45, max=1.60), Si=dict(min=0.10, max=0.60), Mn=dict(min=0.20, max=0.60), P=dict(max=0.030), S=dict(max=0.030), Cr=dict(min=11.0, max=13.0), Mo=dict(min=0.70, max=1.00), V=dict(min=0.70, max=1.00), Fe='resto')),
     [fonte('LUC-12379', [('densita', r'Density\s+Kg/dm3\s+7\.68'),
                          ('composizione', r'1,45-1,60\s+0,10-0,60\s+0,20-0,60\s+0,030\s+0,030\s+11,0-13,0\s+0,70-1,00\s+0,70-1,00'),
                          ('composizione', r'UNI EN ISO 4957: 2002'),
                          ('designazioni', r'X153CrMoV12\s+X155CrVMo12-1\s+Cr12MoV\s+SK 10\s+STD 10\s+Ch12MF\s+A681 D 2'),
                          ('designazioni', r'Number\s+1\.2379')], g('7.68', 'kg/dm³')),
      fonte('BOE-K110', [('densita', r'Density \(kg/dm³\)\s+7\.67'),
                         ('designazioni', r'1\.2379 SEL\s+4957 EN ISO\s+X153CrMoV12 EN\s+~T30402 UNS\s+D2 AISI'),
                         ('nome_commerciale', r'BÖHLER K110 is a 12% ledeburitic chromium steel and corresponds to material number 1\.2379 \(X153CrMoV12, D2\)')], g('7.67', 'kg/dm³'))],
     'Lucefin 7,68 kg/dm³; Böhler 7,67 kg/dm³.')

# 12. 6082
voce('6082', 'Alluminio 6082', 'Alluminio e leghe',
     dict(EN='EN AW-6082 (AlSi1MgMn)', WNr='', UNI='', AISI_SAE='', DIN='', altre=[]), '',
     lega('EN 573-3:2013, % in massa (riportata da Hydro)',
          dict(Si=dict(min=0.70, max=1.30), Fe=dict(max=0.50), Cu=dict(max=0.10), Mn=dict(min=0.40, max=1.00), Mg=dict(min=0.60, max=1.20), Cr=dict(max=0.25), Zn=dict(max=0.20), Ti=dict(max=0.10), Altri_ciascuno=dict(max=0.05), Altri_totale=dict(max=0.15), Al='resto'),
          'Hydro dichiara limiti interni più stretti della norma; qui i limiti di norma riportati nella tabella.'),
     [fonte('HYD-6082', [('composizione', r'0\.70\s+1\.30\s+0\.50\s+0\.10\s+0\.40\s+1\.00\s+0\.60\s+1\.20\s+0\.25\s+0\.20\s+0\.10\s+0\.05\s+0\.15'),
                         ('composizione', r'according to EN-573-3:2013'),
                         ('densita', r'575 - 650\s+2\.71'), ('designazioni', r'Alloy EN AW-6082 \[AlSi1MgMn\]')], g('2.71')),
      fonte('WIE-A32', [('densita', r'Density at 20 °C:\s+2\.7 g/cm³ \(Lit\.\)'),
                        ('designazioni', r'EN AW-Al Si1MgMn.{0,80}EN AW-6082')], g('2.7'))],
     'Wieland 2,7 g/cm³ (una cifra decimale); Hydro 2,71 g/cm³ (valore tipico).')

# 13. 7075
voce('7075', 'Alluminio 7075', 'Alluminio e leghe',
     dict(EN='EN AW-7075 (AlZn5,5MgCu)', WNr='', UNI='', AISI_SAE='', DIN='', altre=['7075']), '',
     lega('Limiti di composizione dichiarati da Kaiser Aluminum, % in massa',
          dict(Si=dict(max=0.40), Fe=dict(max=0.50), Cu=dict(min=1.2, max=2.0), Mn=dict(max=0.30), Mg=dict(min=2.1, max=2.9), Cr=dict(min=0.18, max=0.28), Zn=dict(min=5.1, max=6.1), Ti=dict(max=0.20), Altri_ciascuno=dict(max=0.05), Altri_totale=dict(max=0.15), Al='resto')),
     [fonte('KAI-7075SP', [('composizione', r'Minimum\s+-\s+-\s+1\.2\s+-\s+2\.1\s+0\.18\s+5\.1'),
                           ('composizione', r'Maximum\s+0\.40\s+0\.50\s+2\.0\s+0\.30\s+2\.9\s+0\.28\s+6\.1\s+0\.20\s+0\.05\s+0\.15'),
                           ('densita', r'Nominal Density \(68 °F/20 °C\)\s+0\.101 lbs\./in\.3\s+2\.80 Mg/m3'),
                           ('designazioni', r'Alloy 7075')], g('2.80', 'Mg/m³')),
      fonte('KAI-7075RB', [('composizione', r'Maximum\s+0\.40\s+0\.50\s+2\.00\s+0\.30\s+2\.90\s+0\.28\s+6\.10\s+0\.20\s+0\.05\s+0\.15'),
                           ('densita', r'Nominal Density.{0,600}?2\.80 Mg/m3')], g('2.80', 'Mg/m³')),
      fonte('WIE-A07', [('densita', r'Density at 20 °C:\s+2\.8 g/cm³ \(Lit\.\)'),
                        ('designazioni', r'EN AW-Al Zn5,5MgCu.{0,80}EN AW-7075')], g('2.8'))])

# 14. 2024
voce('2024', 'Alluminio 2024', 'Alluminio e leghe',
     dict(EN='EN AW-2024 (AlCu4Mg1)', WNr='', UNI='', AISI_SAE='', DIN='', altre=['2024', 'UNS A92024', 'AFNOR AU4G1 (designazione precedente)']), '',
     lega('Limiti di composizione dichiarati da Kaiser Aluminum, % in massa',
          dict(Si=dict(max=0.50), Fe=dict(max=0.50), Cu=dict(min=3.8, max=4.9), Mn=dict(min=0.30, max=0.9), Mg=dict(min=1.2, max=1.8), Cr=dict(max=0.10), Zn=dict(max=0.25), Ti=dict(max=0.15), Altri_ciascuno=dict(max=0.05), Altri_totale=dict(max=0.15), Al='resto')),
     [fonte('KAI-2024', [('composizione', r'Minimum\s+-\s+-\s+3\.8\s+0\.30\s+1\.2'),
                         ('composizione', r'Maximum\s+0\.50\s+0\.50\s+4\.9\s+0\.9\s+1\.8\s+0\.10\s+0\.25\s+0\.15\s+0\.05\s+0\.15'),
                         ('densita', r'Nominal Density \(68 °F/20 °C\)\s+0\.100 lbs\./in\.3\s+2\.77 Mg/m3'),
                         ('designazioni', r'Alloy 2024')], g('2.77', 'Mg/m³')),
      fonte('AUB-2024', [('densita', r'Density:\s+2\.77'),
                         ('designazioni', r'EN AW-2024 \(Al Cu4Mg1\)'), ('designazioni', r'UNS\s+: A92024'), ('designazioni', r'AU4G1')], g('2.77', 'non indicata nel documento'))],
     'Aubert & Duval non indica l\'unità: il valore coincide con quello Kaiser in Mg/m³.')

# 15. 5083
voce('5083', 'Alluminio 5083', 'Alluminio e leghe',
     dict(EN='EN AW-5083 (AlMg4,5Mn0,7)', WNr='', UNI='', AISI_SAE='', DIN='', altre=['AA 5083']),
     'Njørdal H116 (Hydro)',
     lega('Limiti di composizione dichiarati da Hydro (Njørdal H116), % in massa',
          dict(Si=dict(max=0.40), Fe=dict(max=0.40), Cu=dict(max=0.10), Mn=dict(min=0.40, max=1.00), Mg=dict(min=4.00, max=4.90), Cr=dict(min=0.05, max=0.25), Zn=dict(max=0.25), Ti=dict(max=0.15), Altri_ciascuno=dict(max=0.05), Altri_totale=dict(max=0.15), Al='resto')),
     [fonte('HYD-5083', [('composizione', r'Min\.\s+0\.40\s+4\.00\s+0\.05'),
                         ('composizione', r'Max\.\s+0\.40\s+0\.40\s+0\.10\s+1\.00\s+4\.90\s+0\.25\s+0\.25\s+0\.15\s+0\.05\s+0\.15'),
                         ('densita', r'2\.66\s+69\.20\s+25\.80'),
                         ('designazioni', r'International designation conforms AA 5083 . EN AW 5083 . AlMg4,5Mn0,7'),
                         ('nome_commerciale', r'Nj.{1,2}rdal.{0,3} H116')], g('2.66')),
      fonte('WIE-A14', [('densita', r'Density at 20 °C:\s+2\.66 g/cm³ \(Lit\.\)'),
                        ('designazioni', r'EN AW-Al Mg4\.5Mn0\.7.{0,80}EN AW-5083')], g('2.66'))])

# 16. Titanio grado 2
voce('ti-gr2', 'Titanio grado 2 (CP)', 'Titanio',
     dict(EN='', WNr='', UNI='', AISI_SAE='', DIN='', altre=['UNS R50400', 'ASTM Grade II', 'CP Grade 2', 'ATI 40']), '',
     lega('Limiti massimi riportati da ATI (specifiche ASTM B265, F67), % in massa',
          dict(Fe=dict(max=0.30), O=dict(max=0.25), C=dict(max=0.08), N=dict(max=0.03), H=dict(max=0.015), Ti='resto'),
          'Valori massimi dalla pagina prodotto ATI; la scheda tecnica ATI riporta solo valori tipici.', parziale=True),
     [fonte('ATI-CP2W', [('composizione', r'Fe 0\.30 O 0\.25 C 0\.08 N 0\.03 H 0\.015 Ti Balance Density lb/in 3 g/cm 3 0\.163 4\.51'),
                         ('densita', r'Fe 0\.30 O 0\.25 C 0\.08 N 0\.03 H 0\.015 Ti Balance Density lb/in 3 g/cm 3 0\.163 4\.52'),
                         ('designazioni', r'ASTM B-265, ASME SB-265, AMS 4902, ASTM F-67')], [g('4.51'), g('4.52')]),
      fonte('ATI-CP2T', [('densita', r'Density: 0\.163 lbs/in\s*;\s*4\.51 gm/cm'),
                         ('designazioni', r'ATI 40, CP Grade 2'), ('designazioni', r'UNS R50250, R50400, R50550, R50700'),
                         ('designazioni', r'ASTM Grades I, II, III, IV')], g('4.51', 'g/cm³'))],
     'ATI: 4,51 g/cm³ per barra e billetta e 4,52 g/cm³ per lamiera, nastro e piatto (pagina prodotto); scheda tecnica 4,51.')

# 17. Ti-6Al-4V
voce('ti-6al-4v', 'Titanio Ti-6Al-4V (grado 5)', 'Titanio',
     dict(EN='', WNr='', UNI='', AISI_SAE='', DIN='', altre=['UNS R56400', 'Grade 5', 'ATI 6-4']), '',
     lega('Limiti riportati da ATI per forma (specifiche ASTM B265, AMS 4911), % in massa',
          dict(Al=dict(min=5.5, max=6.75), V=dict(min=3.5, max=4.5), Fe=dict(max=0.40), O=dict(max=0.20), C=dict(max=0.08), N=dict(max=0.05), H=dict(max=0.015), Ti='resto'),
          'Fe max 0,40 % per barra e billetta, 0,30 % per lamiera (pagina prodotto ATI).', parziale=True),
     [fonte('ATI-64W', [('composizione', r'Al 5\.5 6\.75 V 3\.5 4\.5 Fe 0\.40 O 0\.20 C 0\.08 N 0\.05 H 0\.015 Ti Balance Density lb/in 3 g/cm 3 0\.160 4\.43'),
                        ('composizione', r'Fe 0\.30 O 0\.20 C 0\.08 N 0\.05 H 0\.015'),
                        ('densita', r'Density lb/in 3 g/cm 3 0\.160 4\.43'),
                        ('designazioni', r'ASTM B265, ASME SB-265, MIL-T-9046, AMS 4911')], g('4.43')),
      fonte('ATI-64T', [('densita', r'Density: 0\.160 lbs/cu\. in\.; 4\.47 gm/cc'), ('designazioni', r'\(UNS R56400\)'), ('designazioni', r'ATI Ti-6Al-4V, Grade 5')], g('4.47', 'g/cm³'))],
     'ATI: 4,43 g/cm³ (pagina prodotto, 0,160 lb/in³) e 4,47 g/cm³ (scheda tecnica 2012, 0,160 lb/in³): valori diversi per la stessa densità in lb/in³.')

# 18. CuZn39Pb3
voce('cuzn39pb3', 'Ottone CuZn39Pb3 (CW614N)', 'Rame, ottone, bronzo',
     dict(EN='CuZn39Pb3 (CW614N)', WNr='', UNI='', AISI_SAE='', DIN='', altre=['UNS C38500']),
     'Wieland-Z32, Wieland-Z33; Diehl Brass Solutions 002',
     lega('Componenti principali riportati da Wieland (info sheet), % in massa',
          dict(Cu=dict(min=57.0, max=59.0), Pb=dict(min=2.5, max=3.5), Ni=dict(max=0.3), Zn='resto'),
          'Solo i componenti elencati nella scheda Wieland; limiti completi EN 12164 non verificati. Diehl riporta solo valori di riferimento (Cu 58,0; Pb 3,0).', parziale=True),
     [fonte('WIE-Z32', [('composizione', r'copper\s+57\.0-59\.0%.{0,200}?lead\s+2\.5-3\.5%'),
                        ('composizione', r'nickel\s+max\. 0\.3%'),
                        ('densita', r'Density at 20 °C \(68 °F\):\s+8\.46 g/cm³'),
                        ('designazioni', r'Material Code \(CEN/TS 13388\): CuZn39Pb3'), ('designazioni', r'Material number \(CEN/TS 13388\): CW614N'),
                        ('designazioni', r'UNS-number: C38500'), ('nome_commerciale', r'Trade name: Wieland-Z32')], g('8.46')),
      fonte('WIE-Z33', [('densita', r'Density at 20 °C \(68 °F\):\s+8\.46 g/cm³'), ('nome_commerciale', r'Trade name: Wieland-Z33')], g('8.46')),
      fonte('DIE-002', [('densita', r'Density\s+g/cm³\s+8\.5\b'), ('designazioni', r'DIN EN symbol\s+CuZn39Pb3'), ('designazioni', r'DIN EN\s+CW614N'),
                        ('designazioni', r'UNS\s+C38500'), ('nome_commerciale', r'Diehl Brass Solutions\s+002')], g('8.5'))],
     'Wieland 8,46 g/cm³; Diehl 8,5 g/cm³.')

# 19. Cu-ETP
voce('cu-etp', 'Rame Cu-ETP (CW004A)', 'Rame, ottone, bronzo',
     dict(EN='Cu-ETP (CW004A)', WNr='', UNI='', AISI_SAE='', DIN='', altre=['UNS C11000']),
     'Wieland-K32',
     lega('Composizione riportata da Kemper (datasheet), % in massa',
          dict(Cu=dict(min=99.9), O=dict(max=0.04)),
          'Il datasheet Kemper riporta solo Cu (minimo) e O (massimo).', parziale=True),
     [fonte('KEM-CUETP', [('composizione', r'Cu \[%\]\s+O \[%\]\s+min\. 99,9\s+max\. 0,04'), ('densita', r'Dichte\s+8,9 g/cm³'),
                          ('designazioni', r'EN CW004A / UNS C11000')], g('8,9')),
      fonte('WIE-K32', [('densita', r'Density at 20 °C \(68 °F\):\s+8\.9 g/cm³'), ('composizione', r'copper\s+min\. 99\.90%'),
                        ('designazioni', r'Material Code \(CEN/TS 13388\): Cu-ETP'), ('designazioni', r'Material number \(CEN/TS 13388\): CW004A'),
                        ('nome_commerciale', r'Trade name: Wieland-K32')], g('8.9'))])

# 20. Stagno
voce('sn', 'Stagno (Sn)', 'Stagno',
     dict(EN='', WNr='', UNI='', AISI_SAE='', DIN='', altre=['Sn']), '',
     dict(tipo='elemento', simbolo='Sn', riferimento='Elemento puro (simbolo); densità dello stagno bianco β a temperatura ambiente'),
     [fonte('NIST-T1', [('densita', r'50 Sn Tin 0\.42120 488\.0 7\.310E\+00'), ('designazioni', r'50 Sn Tin')], g('7.310')),
      fonte('IND-SN', [('densita', r'7\.29g/cm 3 β tin')], g('7.29'))],
     'NIST 7,310 g/cm³ (costante usata nei calcoli); Indium 7,29 g/cm³ (β-stagno). Lo stagno grigio α (5,77 g/cm³, Indium) non è considerato.')

# 21. Inconel 718
voce('inconel718', 'Inconel 718', 'Altri',
     dict(EN='', WNr='2.4668', UNI='', AISI_SAE='', DIN='', altre=['UNS N07718']),
     'INCONEL® alloy 718',
     lega('Table 1, Limiting Chemical Composition (Special Metals SMC-045), % in massa',
          dict(Ni=dict(min=50.00, max=55.00, nota='più Co'), Cr=dict(min=17.00, max=21.00), Nb=dict(min=4.75, max=5.50, nota='più Ta'), Mo=dict(min=2.80, max=3.30),
               Ti=dict(min=0.65, max=1.15), Al=dict(min=0.20, max=0.80), Co=dict(max=1.00), C=dict(max=0.08), Mn=dict(max=0.35), Si=dict(max=0.35),
               P=dict(max=0.015), S=dict(max=0.015), B=dict(max=0.006), Cu=dict(max=0.30), Fe='resto')),
     [fonte('SPE-718', [('composizione', r'Nickel \(plus Cobalt\) \.+50\.00-55\.00'), ('composizione', r'Chromium\.+17\.00-21\.00'),
                        ('composizione', r'Niobium \(plus Tantalum\)\.+4\.75-5\.50'), ('composizione', r'Molybdenum \.+2\.80-3\.30'),
                        ('composizione', r'Titanium\.+0\.65-1\.15'), ('composizione', r'Aluminum \.+0\.20-0\.80'),
                        ('composizione', r'Cobalt \.+1\.00 max\.'), ('composizione', r'Carbon \.+0\.08 max\.'),
                        ('composizione', r'Manganese \.+0\.35 max\.'), ('composizione', r'Silicon \.+0\.35 max\.'),
                        ('composizione', r'Phosphorus\.+0\.015 max\.'), ('composizione', r'Sulfur\.+0\.015 max\.'),
                        ('composizione', r'Boron \.+0\.006 max\.'), ('composizione', r'Copper\.+0\.30 max\.'), ('composizione', r'Iron \.+Balance'),
                        ('densita', r'Annealed\.+0\.296'), ('densita', r'Annealed and Aged \.+0\.297'),
                        ('densita', r'Some physical constants of INCONEL alloy 718 are shown\s+in Table 2\. Modulus data appear in Tables 3 and 4, and.{0,300}?thermal properties in Table 5\. The values in these tables will.{0,500}?vary slightly, depending on the composition and condition.{0,500}?of the specimen tested\. They are typical but are not suitable.{0,500}?for specification purposes\.',
                         '«Some physical constants of INCONEL alloy 718 are shown in Table 2. Modulus data appear in Tables 3 and 4, and thermal properties in Table 5. The values in these tables will vary slightly, depending on the composition and condition of the specimen tested. They are typical but are not suitable for specification purposes.» (sotto «Table 2 - Physical Constants»; il testo sta nella colonna di sinistra, intercalato alle celle della tabella)'),
                        ('designazioni', r'INCONEL® alloy 718 \(UNS N07718/W\.Nr\. 2\.4668\)'),
                        ('nome_commerciale', r'INCONEL® alloy 718')], [lb('0.296', tipico=True), lb('0.297', tipico=True)])],
     'Special Metals riporta solo lb/in³: 0,296 (ricotto) = 8,193 g/cm³ e 0,297 (ricotto e invecchiato) = 8,221 g/cm³, convertiti con 1 lb = 0,45359237 kg e 1 in = 25,4 mm.')


# ================================================================ FASE 2c: nuovi materiali (solo con FASE2C=1)
FASE2C = os.environ.get('FASE2C') != '0'   # la Fase 2c è ora parte del DB (FASE2C=0 ricostruisce il DB v3 della 2b)
def kgm3(val, tipico=False):  # densità letta in kg/m³ (valore del documento) e il suo equivalente in g/cm³
    # tipico=True solo se il documento dichiara quella riga come «valore tipico» (la prova deve includere la dichiarazione)
    d = dict(valore=val, unita='kg/m³', g_cm3=float(val) / 1000)
    if tipico: d['tipico'] = True
    return d
if FASE2C:
    LUCW = 'https://www.lucefin.com/wp-content/files_mf/'
    doc('LUC-39NI-IT', '2c/39nicrmo3/lucefin_39NiCrMo3_A.pdf', 'Lucefin Group', 'Scheda dati 39NiCrMo3 (EN 10083-3:2006), rev. 2018', LUCW+'152353575939NiCrMo3.pdf')
    doc('LUC-39NI-EN', '2c/39nicrmo3/lucefin_39NiCrMo3_B.pdf', 'Lucefin Group', 'Technical card 39NiCrMo3 (EN 10083-3:2006), rev. 2018', LUCW+'152353577239NiCrMo3.pdf')
    doc('LUC-4462-IT', '2c/f51/lucefin_1.4462_A.pdf', 'Lucefin Group', 'Scheda dati 1.4462 X2CrNiMoN22-5-3 (EN 10088-3:2014), rev. 2018', LUCW+'15235426851.4462Tp2205.pdf')
    doc('LUC-4462-EN', '2c/f51/lucefin_1.4462_B.pdf', 'Lucefin Group', 'Technical card 1.4462 X2CrNiMoN22-5-3 (EN 10088-3:2014), 2018', LUCW+'15235426741.4462Tp2205.pdf')
    doc('SWI-4462', '2c/f51/swiss_4462_UK.pdf', 'Swiss Steel Group (Deutsche Edelstahlwerke)', 'Datasheet 1.4462 Stainless duplex austenitic-ferritic, chromium nickel molybdenum steel', 'https://swisssteel-group.com/content-media/documents/Data-Sheets/Stainless-Steel/Datenblatt_4462_UK.pdf')
    doc('ALL-2205', '2c/f51/alleima_SAF2205_billets.pdf', 'Alleima', 'SAF™ 2205 Billets, Datasheet (aggiornato 09.05.2025)', 'https://www.alleima.com/contentassets/ec1159b850fd417195a24799c0c0bab5/datasheet-saf-2205-en-v2025-05-09-0638-version-1.pdf/download')
    doc('LUC-12343', '2c/1.2343/lucefin_1.2343.pdf', 'Lucefin Group', 'Technical card 1.2343 X37CrMoV5-1 (UNI EN ISO 4957:2002), rev. 2018', LUCW+'15236074671.2343X37CrMoV51.pdf')
    doc('BOE-W300B', '2c/1.2343/boehler_W300_isobloc.pdf', 'voestalpine BÖHLER Edelstahl', 'Data sheet BÖHLER W300 ISOBLOC', 'https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w300-isobloc_en_gb.pdf')
    doc('BOE-W300D', '2c/1.2343/boehler_W300_isodisc.pdf', 'voestalpine BÖHLER Edelstahl', 'Data sheet BÖHLER W300 ISODISC', 'https://www.bohler-edelstahl.com/app/uploads/sites/248/productdb/api/w300-isodisc_en_gb.pdf')
    doc('SWI-2343', '2c/1.2343/swisssteel_1.2343_en.pdf', 'Swiss Steel Group', 'Technical datasheet Thermodur 2343 EFS, 10.05.23 Rev.00', 'https://swisssteel-group.com/content-media/documents/_import/1.2343_en.pdf')
    doc('LUC-12311', '2c/1.2311/lucefin_1.2311.pdf', 'Lucefin Group', 'Technical card 1.2311 40CrMnMo7, rev. 2018', LUCW+'15236072261.231140CrMnMo7.pdf')
    doc('SWI-2311', '2c/1.2311/swisssteel_formadur2311.pdf', 'Swiss Steel Group', 'Data Sheet Formadur 2311, 28.04.26 REV.2', 'https://swisssteel-group.com/content-media/documents/_import/20260428_SSG_DataSheets_Formadur2311_en_02.pdf')
    doc('OVA-S235', '2c/s235jr/ovako_s235.pdf', 'Ovako', 'Steel Navigator, scheda S235JR (PDF dal sito, rev. 31 Jan 2025)', 'https://steelnavigator.ovako.com/steel-grades/s235/pdf')
    doc('LUC-S235JR', '2c/s235jr/lucefin_S235JR.pdf', 'Lucefin Group', 'Scheda dati S235JR (EN 10025-2:2004), rev. 2018', LUCW+'1522934592S235JR.pdf')
    doc('OVA-C45', '2c/c45/ovako_c45.pdf', 'Ovako', 'Steel Navigator, scheda C45 (PDF dal sito, rev. 30 Jan 2025)', 'https://steelnavigator.ovako.com/steel-grades/c45/pdf')
    doc('MAR-BON', '2c/c45/marcegaglia_plates_bonifica_2026-04.pdf', 'Marcegaglia Plates', 'Brochure «Steels for quenching and tempering / Acciai da bonifica», Marcegaglia Plates, April 2026 EN-IT', 'https://www.publications.marcegaglia.com/wp-content/uploads/2026/04/Marcegaglia-Plates-Bonifica.pdf')
    doc('IMS-NCM2', '2c/utente/Acciaio-NCM2.pdf', 'IMS S.p.A.', 'Catalogo IMS S.p.A. acciai speciali, pag. 61-62, scheda 39NiCrMo3 (foto del catalogo fornita da Luca)', None, utente=True)
    doc('MOR-CWS', '2c/utente/Acciaio-CWS-1.2379-Cold-Working-Steel.pdf', 'Moretti Acciai S.p.A.', 'Scheda «CWS 1.2379 Cold Working Steel», Moretti Acciai S.p.A. (PDF del 14.12.2018, fornita da Luca)', None, utente=True)
    D['IMS-NCM2']['rif_extra'] = 'pag. 61 del catalogo IMS'

    # 39NiCrMo3
    voce('39nicrmo3', '39NiCrMo3', 'Acciai da bonifica',
         dict(EN='39NiCrMo3', WNr='1.6510', UNI='39NiCrMo3', AISI_SAE='9840', DIN='', altre=['UNE F1282', 'AFNOR 40NCD3', 'GOST 39HNM'],
              indicative=['36CrNiMo4', '1.6511']), '',
         lega('EN 10083-3:2006, % in massa (norma citata sulle schede Lucefin)',
              dict(C=dict(min=0.35, max=0.43), Si=dict(max=0.40), Mn=dict(min=0.50, max=0.80), P=dict(max=0.025), S=dict(max=0.035), Cr=dict(min=0.60, max=1.00), Mo=dict(min=0.15, max=0.25), Ni=dict(min=0.70, max=1.00), Fe='resto'),
              'Può essere fornito con Pb 0,15-0,35 %, S controllato 0,020-0,040 % o Bi 0,030-0,080 %, o con trattamento al calcio (scheda Lucefin).'),
         [fonte('LUC-39NI-IT', [('densita', r'Massa Volumica\s+Kg/dm3\s+7\.85'),
                                ('composizione', r'0,35-0,43\s+0,40\s+0,50-0,80\s+0,025\s+0,035\s+0,60-1,00\s+0,15-0,25\s+0,70-1,00'),
                                ('composizione', r'EN 10083-3: 2006'),
                                ('designazioni', r'Numero\s+1\.6510'),
                                ('designazioni', r'EN\s+UNI\s+UNE\s+DIN\s+AFNOR\s+B\.S\.\s+SS\s+AISI/SAE\s+39NiCrMo3\s+39NiCrMo3\s+F1282\s+36CrNiMo4\s+40NCD3\s+9840'),
                                ('corrispondenze', r'EN\s+UNI\s+UNE\s+DIN\s+AFNOR\s+B\.S\.\s+SS\s+AISI/SAE\s+39NiCrMo3\s+39NiCrMo3\s+F1282\s+36CrNiMo4')], g('7.85', 'kg/dm³')),
          fonte('LUC-39NI-EN', [('densita', r'Density\s+Kg/dm3\s+7\.85'),
                                ('designazioni', r'Number\s+1\.6510'),
                                ('designazioni', r'EN\s+UNI\s+GB\s+DIN\s+AFNOR\s+B\.S\.\s+GOST\s+AISI/SAE\s+39NiCrMo3\s+39NiCrMo3\s+36CrNiMo4\s+40NCD3\s+39HNM\s+9840')], g('7.85', 'kg/dm³'))],
         'Le due schede Lucefin (italiano e inglese) sono lo stesso documento in due lingue: una sola fonte indipendente, 7,85 kg/dm³.')

    # Inox duplex 1.4462 (F51)
    voce('1.4462', 'Inox duplex 1.4462 (F51)', 'Acciai inox',
         dict(EN='X2CrNiMoN22-5-3', WNr='1.4462', UNI='', AISI_SAE='', DIN='', altre=['UNS S31803', 'ASTM A182 F51', 'ASTM Type 2205', 'BS 318S13', 'JIS 329J3L', 'AFNOR Z3CND 22-05 Az', 'SIS 2377']),
         'SAF 2205 (Alleima)',
         lega('EN 10088-3:2014, % in massa (norma citata sulle schede Lucefin)',
              dict(C=dict(max=0.03), Si=dict(max=1.00), Mn=dict(max=2.00), P=dict(max=0.035), S=dict(max=0.015), Cr=dict(min=21.0, max=23.0), Ni=dict(min=4.5, max=6.5), Mo=dict(min=2.5, max=3.5), N=dict(min=0.10, max=0.22), Fe='resto'),
              'Swiss Steel indica N 0,12-0,22 % (Lucefin, secondo EN 10088-3: 0,10-0,22 %).'),
         [fonte('LUC-4462-EN', [('densita', r'Density\s+Kg/dm3\s+7\.80'),
                                ('composizione', r'0,03\s+1,00\s+2,00\s+0,035\s+0,015\s+21,0-23,0\s+4,5-6,5\s+0,10-0,22\s+2,5-3,5\s+EN 10088-3: 2014'),
                                ('designazioni', r'Number\s+1\.4462'),
                                ('designazioni', r'EN\s+UNS\s+ASTM\s+GB\s+GOST\s+JIS\s+IS\s+KS\s+X2CrNiMoN22-5-3\s+S31803\s+Type 2205')], g('7.80', 'kg/dm³')),
          fonte('LUC-4462-IT', [('densita', r'Densità\s+Kg/dm3\s+7\.80'),
                                ('designazioni', r'Numero\s+1\.4462'),
                                ('designazioni', r'EN\s+UNS\s+ASTM\s+GB\s+GOST\s+JIS\s+IS\s+KS\s+X2CrNiMoN22-5-3\s+S31803\s+Type 2205')], g('7.80', 'kg/dm³')),
          fonte('SWI-4462', [('densita', r'density \(kg/dm3\)\s+7\.80'),
                             ('composizione', r'C max\. 0\.03 Cr 21\.00 . 23\.00 Ni 4\.50 . 6\.50 Mo 2\.50 . 3\.50 N 0\.12 . 0\.22'),
                             ('designazioni', r'ASTM\s+A182F51'), ('designazioni', r'UNS\s+S31803'), ('designazioni', r'BS\s+318S13'),
                             ('designazioni', r'JIS\s+329J3L'), ('designazioni', r'AFNOR\s+Z3CND 22-05 Az'), ('designazioni', r'SIS\s+2377')], g('7.80', 'kg/dm³')),
          fonte('ALL-2205', [('densita', r'Density: 7\.8 g/cm3'),
                             ('designazioni', r'UNS: S31803'), ('designazioni', r'EN Number: 1\.4462'),
                             ('designazioni', r'ﬂanges etc\. according to ASTM A-182 Grade F51\s+Analysis according to ASTM A-479, UNS S31803'),
                             ('nome_commerciale', r'SAF.{0,2}2205 is a duplex \(austenitic-ferritic\) stainless steel')], g('7.8', 'g/cm³'))],
         'Tutte e quattro le letture sono 7,8 g/cm³ (7,80 kg/dm³).')

    # 1.2343
    voce('1.2343', 'Acciaio per utensili 1.2343 (H11)', 'Acciai per utensili',
         dict(EN='X37CrMoV5-1', WNr='1.2343', UNI='', AISI_SAE='H11', DIN='X38CrMoV5-1', altre=['UNS T20811', 'JIS SKD6', 'AFNOR Z38CDV5', 'BS BH11', 'UNE F.520.G']),
         'BÖHLER W300 (ISODISC, ISOBLOC); Thermodur 2343 EFS',
         lega('UNI EN ISO 4957:2002, % in massa (norma citata sulla scheda Lucefin)',
              dict(C=dict(min=0.33, max=0.41), Si=dict(min=0.80, max=1.20), Mn=dict(min=0.25, max=0.50), P=dict(max=0.030), S=dict(max=0.020), Cr=dict(min=4.80, max=5.50), Mo=dict(min=1.10, max=1.50), V=dict(min=0.30, max=0.50), Fe='resto')),
         [fonte('LUC-12343', [('densita', r'Density\s+Kg/dm\s+3\s+7\.80\s+7\.64\s+7\.60'),
                              ('composizione', r'0,33-0,41\s+0,80-1,20\s+0,25-0,50\s+0,030\s+0,020\s+4,80-5,50\s+1,10-1,50\s+0,30-0,50'),
                              ('composizione', r'UNI EN ISO 4957: 2002'),
                              ('designazioni', r'Number\s+1\.2343'),
                              ('designazioni', r'EN\s+DIN\s+GB\s+JIS\s+IS\s+KS\s+GOST\s+AISI/SAE\s+X37CrMoV5-1\s+X38CrMoV5-1\s+4Cr5MoSiV\s+SKD 6\s+XT35Cr5Mo1V3\s+STD 6\s+4Ch5MFS\s+H 11')], g('7.80', 'kg/dm³')),
          fonte('BOE-W300B', [('densita', r'Density \(kg/dm³\)\s+7\.8\b'),
                              ('designazioni', r'1\.2343 SEL\s+4957 EN ISO\s+X37CrMoV5-1 EN\s+#207 NADCA\s+T20811 UNS\s+G4404 JIS\s+H11 AISI\s+D1830 NADCA\s+SKD6 JIS'),
                              ('nome_commerciale', r'BÖHLER W300 ISOBLOC is a 5% chromium steel and corresponds to material number 1\.2343 \(X37CrMoV5-1\)')], g('7.8', 'kg/dm³')),
          fonte('BOE-W300D', [('densita', r'Density \(kg/dm³\)\s+7\.8\b'),
                              ('nome_commerciale', r'BÖHLER W300 ISODISC is a 5% chromium steel and corresponds to material number 1\.2343 \(X37CrMoV5-1\)')], g('7.8', 'kg/dm³')),
          fonte('SWI-2343', [('designazioni', r'X37CrMoV5-1\s+1\.2343\s+H11\s+BH11\s+Z38CDV5\s+SKD6\s+4Ch5MFS\s+F\.520\.G'),
                             ('nome_commerciale', r'Thermodur.{0,3}2343 EFS')])],
         'Lucefin 7,80 kg/dm³; Böhler 7,8 kg/dm³ (W300 ISOBLOC e ISODISC): letture concordi.')

    # 1.2311
    voce('1.2311', 'Acciaio per utensili 1.2311 (P20)', 'Acciai per utensili',
         dict(EN='', WNr='1.2311', UNI='', AISI_SAE='P20', DIN='40CrMnMo7', altre=['AFNOR 40CMD8']),
         'Formadur 2311',
         lega('Scheda Lucefin rev. 2018 (norma di riferimento indicata: «Werkstoff»), % in massa',
              dict(C=dict(min=0.35, max=0.45), Si=dict(min=0.20, max=0.40), Mn=dict(min=1.30, max=1.60), P=dict(max=0.035), S=dict(max=0.035), Cr=dict(min=1.80, max=2.10), Mo=dict(min=0.15, max=0.25), Fe='resto')),
         [fonte('LUC-12311', [('densita', r'Density\s+Kg/dm3\s+7\.83'),
                              ('composizione', r'0,35-0,45\s+0,20-0,40\s+1,30-1,60\s+0,035\s+0,035\s+1,80-2,10\s+0,15-0,25'),
                              ('designazioni', r'Number\s+1\.2311'),
                              ('designazioni', r'EN\s+DIN\s+GB\s+JIS\s+IS\s+KS\s+GOST\s+AISI/SAE\s+40CrMnMo7\s+5CrMnMo ~')], g('7.83', 'kg/dm³')),
          fonte('SWI-2311', [('designazioni', r'40CrMnMo7.{0,300}?AISI P20 / AFNOR 40CMD8'),
                             ('nome_commerciale', r'Formadur.{0,3}2311')])])

    # S235JR
    voce('s235jr', 'S235JR', 'Acciai al carbonio',
         dict(EN='S235JR', WNr='1.0038', UNI='', AISI_SAE='', DIN='', altre=['SS 1312', 'Fe 360 BFN', 'RSt37-2']), '',
         lega('EN 10025-2:2004, % in massa, analisi di colata (norma citata sulle schede Lucefin e Ovako)',
              dict(C=dict(max=0.17), Mn=dict(max=1.40), P=dict(max=0.035), S=dict(max=0.035), N=dict(max=0.012), Cu=dict(max=0.55), Fe='resto'),
              'C max 0,20 % per spessori oltre 40 mm; il silicio non è specificato.'),
         [fonte('OVA-S235', [('densita', r'Other properties \(typical values\)\s+Youngs module \(GPa\)\s+Poisson.s ratio \(-\)\s+Shear module \(GPa\)\s+Density \(kg/m3\)\s+210\s+0\.3\s+80\s+7800'),
                             ('composizione', r'S235JR EN10025-2 \(ref\)\s+Std\s+Pcm 0\.25max\s+Max\s+0\.17\s+1\.40\s+0\.035\s+0\.035\s+0\.55\s+0\.0120'),
                             ('designazioni', r'Similar designations\s+SS 1312, S235JR, 1\.0038, Fe 360 BFN, RSt37-2, 40 B, SB1312, IM2191')], kgm3('7800', tipico=True)),
          fonte('LUC-S235JR', [('composizione', r'0,17 c\)\s+-\s+1,40\s+0,035\s+0,035\s+0,012 a\)\s+0,55'),
                               ('composizione', r'EN 10025-2: 2004'),
                               ('designazioni', r'Numero\s+1\.0038')])],
         'La scheda Lucefin non riporta la densità: una sola fonte di densità (Ovako).')

    # C45 (1.0503)
    voce('c45', 'C45 (1.0503)', 'Acciai al carbonio',
         dict(EN='C45', WNr='1.0503', UNI='', AISI_SAE='1045', DIN='', altre=[]), '',
         lega('ISO 683-1, % in massa (riga «C45 EN ISO 683-1» della scheda Ovako)',
              dict(C=dict(min=0.42, max=0.50), Si=dict(min=0.10, max=0.40), Mn=dict(min=0.50, max=0.80), P=dict(max=0.045), S=dict(max=0.045), Cr=dict(max=0.40), Ni=dict(max=0.40), Mo=dict(max=0.10), Cu=dict(max=0.30), Fe='resto')),
         [fonte('OVA-C45', [('densita', r'Other properties \(typical values\)\s+Youngs module \(GPa\)\s+Poisson.s ratio \(-\)\s+Shear module \(GPa\)\s+Density \(kg/m3\)\s+210\s+0\.3\s+80\s+7800'),
                            ('composizione', r'C45 EN\s+CEV max\s+Min\s+0\.42\s+0\.10\s+0\.50.{0,300}?Std\s+ISO 683-1\s+Pcm max\s+Max\s+0\.50\s+0\.40\s+0\.80\s+0\.045\s+0\.045\s+0\.40\s+0\.40\s+0\.10\s+-\s+-\s+0\.30'),
                            ('designazioni', r'Similar designations\s+C43, C44, C45R - 1\.1201, C45E - 1\.1191, Ck45, St70-2, SAE 1045, 080A42, SS 1672, XC 48, C 45, S 45\s+C, GOST 45, AISI/SAE/ASTM 1045, 1\.0503')], kgm3('7800', tipico=True)),
          fonte('MAR-BON', [])],
         'Una sola fonte di densità (Ovako, valore tipico per la sigla C45). Marcegaglia Plates conferma il tag «da bonifica» ma non riporta composizione né W.Nr.')

# ---------------------------------------------------------------- densità: letture per documento Inconel (seconda lettura)


# ---------------------------------------------------------------- tag di trattamento/uso (ognuno con frase e pagina del documento)
TAG_VOCAB = ['da bonifica', 'da cementazione', 'da tempra', 'per cuscinetti', 'per utensili a caldo', 'per utensili a freddo',
             'automatico', 'inox', 'austenitico', 'indurente per precipitazione', 'da costruzione'] + (['duplex'] if FASE2C else [])
# (voce, tag, [(documento, regex, estratto)])
TAGS = [
 ('c45e', 'da bonifica', [('LUC-C45E', r'Acciaio da\s+Scheda Dati.{0,300}?bonifica', '«Acciaio da bonifica» (intestazione della scheda)')]),
 ('42crmo4', 'da bonifica', [('LUC-42CRMO4', r'Quenching and\s+Technical card.{0,200}?Tempering Steel', '«Quenching and Tempering Steel» (intestazione della scheda)')]),
 ('16mncr5', 'da cementazione', [('LUC-16MNCR5', r'Case-hardening\s+Technical card.{0,200}?Steel', '«Case-hardening Steel» (intestazione della scheda)'),
                                 ('OVA-16MNCR5', r'alloyed case hardening steel', '«16MnCr5 is an alloyed case hardening steel»')]),
 ('100cr6', 'per cuscinetti', [('LUC-100CR6', r'Bearing\s+Technical card.{0,200}?Steel', '«Bearing Steel» (intestazione della scheda)'),
                               ('SWI-100CR6', r'WÄLZLAGERSTAHL', '«WÄLZLAGERSTAHL» (intestazione della scheda)'),
                               ('OVA-100CR6', r'through hardening bearing steels', '«100Cr6 is a through hardening bearing steels»')]),
 ('100cr6', 'da tempra', [('LUC-100CR6', r'Table of tempering values obtained at room temperature on round of Ø 10 mm after quenching at 840 °C in oil\s+HV 30[^\n]*\n\s*HRC\s+65\s+64\s+63\s+62\s+59\s+57\s+54\s+51\s+47\s+44',
                           'tabella «Table of tempering values … after quenching at 840 °C in oil»: HRC 65 64 63 62 59 57 54 51 47 44 (rinvenimento a 50…500 °C)'),
                          ('OVA-100CR6', r'\+Q/T\(m\)\s+-\s+1700\s+2300 typical\s+2\s+61 HRC typical', 'tabella delle varianti: «+Q/T(m) … 61 HRC typical» (temprato e rinvenuto)')]),
 ('s355j2', 'da costruzione', [('OVA-S355J2', r'micro alloyed structural steel', '«S355J2 is a micro alloyed structural steel»'),
                               ('LUC-S355J2', r'Steel for general\s+Technical card.{0,200}?engineering', '«Steel for general engineering» (intestazione della scheda)')]),
 ('11smnpb30', 'automatico', [('LUC-11SMNPB30', r'Free-cutting\s+Technical card.{0,200}?Steel', '«Free-cutting Steel» (intestazione della scheda)'),
                              ('SWI-E217', r'Special Free-Cutting Steels', '«Special Free-Cutting Steels»')]),
 ('cuzn39pb3', 'automatico', [('DIE-002', r'Standard material for automated machining', '«Standard material for automated machining»')]),
 ('304', 'inox', [('LUC-4301', r'Austenitic\s+Technical card.{0,150}?Stainless Steel', '«Austenitic Stainless Steel» (intestazione della scheda)'),
                  ('SWI-4301', r'Chromium-nickel austenitic stainless steel', '«Chromium-nickel austenitic stainless steel»')]),
 ('304', 'austenitico', [('LUC-4301', r'Austenitic\s+Technical card.{0,150}?Stainless Steel', '«Austenitic Stainless Steel» (intestazione della scheda)'),
                         ('SWI-4301', r'Chromium-nickel austenitic stainless steel', '«Chromium-nickel austenitic stainless steel»')]),
 ('316', 'inox', [('LUC-4401', r'Austenitic\s+Technical card.{0,150}?Stainless Steel', '«Austenitic Stainless Steel» (intestazione della scheda)'),
                  ('SWI-4401', r'NICHTROSTENDER AUSTENITISCHER STAHL', '«NICHTROSTENDER AUSTENITISCHER STAHL»')]),
 ('316', 'austenitico', [('LUC-4401', r'Austenitic\s+Technical card.{0,150}?Stainless Steel', '«Austenitic Stainless Steel» (intestazione della scheda)'),
                         ('SWI-4401', r'NICHTROSTENDER AUSTENITISCHER STAHL', '«NICHTROSTENDER AUSTENITISCHER STAHL»')]),
 ('17-4ph', 'inox', [('LUC-4542', r'Precipitation hardening\s+Technical card.{0,150}?Stainless Steel', '«Precipitation hardening Stainless Steel» (intestazione della scheda)')]),
 ('17-4ph', 'indurente per precipitazione', [('LUC-4542', r'Precipitation hardening\s+Technical card.{0,150}?Stainless Steel', '«Precipitation hardening Stainless Steel» (intestazione della scheda)'),
                                              ('FAG-174', r'martensitic precipitation-hardening steel', '«a martensitic precipitation-hardening steel»')]),
 ('inconel718', 'indurente per precipitazione', [('SPE-718', r'The age-hardenable alloy can be readily fabricated', '«The age-hardenable alloy can be readily fabricated»')]),
 ('1.2344', 'per utensili a caldo', [('BOE-W302B', r'HOT WORK TOOL STEELS', '«HOT WORK TOOL STEELS» (W302 ISOBLOC)'),
                                      ('BOE-W302D', r'HOT WORK TOOL STEELS', '«HOT WORK TOOL STEELS» (W302 ISODISC)')]),
 ('1.2344', 'da tempra', [('LUC-12344', r'Tempering table after quenching at 1040 °C in oil\. Values on Ø 20 mm\s+HB[^\n]*\n\s*HRC\s+55\s+54\s+53\s+52\s+51\.5\s+52\s+53\s+54\s+56\s+56\s+52\s+48\s+42\s+32',
                          'tabella «Tempering table after quenching at 1040 °C in oil»: HRC 55 54 53 52 51,5 52 53 54 56 56 52 48 42 32 (rinvenimento a 50…700 °C)'),
                         ('BOE-W302B', r'Hardness \(HRC\)\s+40 to 55 \| bars hardened and tempered \(BHT\)', '«Hardness (HRC) 40 to 55 | bars hardened and tempered (BHT)»'),
                         ('SWI-12344', r'Hardening\s+1010\s*\S\s*1030\s*°C.{0,150}?54 HRC \(after quenching\)', '«Hardening 1010 – 1030 °C … 54 HRC (after quenching)»')]),
 ('1.2379', 'per utensili a freddo', [('BOE-K110', r'COLD WORK TOOL STEELS', '«COLD WORK TOOL STEELS»')]),
 ('1.2379', 'da tempra', [('LUC-12379', r'Table of tempering after quenching at 1020 °C in oil\s+HB[^\n]*\n\s*HRC\s+64\s+63\.5\s+63\s+62\s+61\s+60\s+58\.5\s+58\.5\s+59\.5\s+59\.5\s+57\.5\s+50\s+36',
                          'tabella «Table of tempering after quenching at 1020 °C in oil»: HRC 64 63,5 63 62 61 60 58,5 58,5 59,5 59,5 57,5 50 36 (rinvenimento a 50…700 °C)')]),
]

if FASE2C:
    TAGS += [
     ('39nicrmo3', 'da bonifica', [('LUC-39NI-IT', r'Acciaio da\s+Scheda Dati.{0,300}?bonifica', '«Acciaio da bonifica» (intestazione della scheda)'),
                                   ('LUC-39NI-EN', r'Quenching and\s+Technical card.{0,200}?Tempering Steel', '«Quenching and Tempering Steel» (intestazione della scheda)')]),
     ('1.4462', 'inox', [('LUC-4462-IT', r'Acciaio Inossidabile\s+Scheda Dati', '«Acciaio Inossidabile … Austenitico-Ferritico (Duplex)» (intestazione della scheda)'),
                         ('LUC-4462-EN', r'Stainless Steel \(Duplex\)', '«Austenitic-Ferritic Stainless Steel (Duplex)» (intestazione della scheda)'),
                         ('SWI-4462', r'Stainless duplex austenitic-ferritic', '«1.4462 Stainless duplex austenitic-ferritic, chromium nickel molybdenum steel»')]),
     ('1.4462', 'duplex', [('LUC-4462-IT', r'Austenitico-Ferritico \(Duplex\)', '«Austenitico-Ferritico (Duplex)» (intestazione della scheda)'),
                           ('LUC-4462-EN', r'Austenitic-Ferritic\s+Technical card 2018.{0,150}?Stainless Steel \(Duplex\)', '«Austenitic-Ferritic Stainless Steel (Duplex)» (intestazione della scheda)'),
                           ('SWI-4462', r'Stainless duplex austenitic-ferritic', '«Stainless duplex austenitic-ferritic»'),
                           ('ALL-2205', r'SAF.{0,2}2205 is a duplex \(austenitic-ferritic\) stainless steel', '«SAF 2205 is a duplex (austenitic-ferritic) stainless steel»')]),
     ('1.2343', 'per utensili a caldo', [('BOE-W300B', r'HOT WORK TOOL STEELS', '«HOT WORK TOOL STEELS» (W300 ISOBLOC)'),
                                         ('BOE-W300D', r'HOT WORK TOOL STEELS', '«HOT WORK TOOL STEELS» (W300 ISODISC)'),
                                         ('SWI-2343', r'Hot work tool steel for universal application', '«Hot work tool steel for universal application»')]),
     ('1.2343', 'da tempra', [('LUC-12343', r'Tempering table after quenching at 1020 °C in oil\. Values on test Ø 20 mm\s+HB[^\n]*\n\s*HRC\s+54\s+53\s+52\.5\s+52\s+52\s+52\.5\s+53\.5\s+54\.5\s+55\.5\s+56\s+52\s+46\s+39\s+30',
                              'tabella «Tempering table after quenching at 1020 °C in oil»: HRC 54 53 52,5 52 52 52,5 53,5 54,5 55,5 56 52 46 39 30 (rinvenimento a 50…700 °C)'),
                             ('BOE-W300B', r'Hardness \(HRC\)\s+40 to 55 \| bars hardened and tempered \(BHT\)', '«Hardness (HRC) 40 to 55 | bars hardened and tempered (BHT)»'),
                             ('SWI-2343', r'Hardening\s+1010\s*\S\s*1030\s*°C.{0,150}?54 HRC \(after quenching\)', '«Hardening 1010 – 1030 °C … 54 HRC (after quenching)»')]),
     ('1.2311', 'da bonifica', [('LUC-12311', r'Quenched and Tempered HB 280-330', '«Supply conditions: … Quenched and Tempered HB 280-330»'),
                                ('SWI-2311', r'Quenched and tempered\s+Quenched and tempered', '«Quenched and tempered» (intestazioni delle proprietà fisiche); durezza alla consegna 280-325 HB')]),
     ('c45', 'da bonifica', [('MAR-BON', r'Non-alloy grades such as C40, C45 and C45E\s+non legate come C40, C45 e C45E', '«Non-alloy grades such as C40, C45 and C45E» tra gli «Steels for quenching and tempering / Acciai da bonifica»'),
                             ('MAR-BON', r'EN 683-1\s+Non-alloy quenched steels\s+C40, C45 \(\+A/\+N/\+S\), C45E \(\+N/\+S\)', 'tabella «EN 683-1 · Non-alloy quenched steels · C40, C45 (+A/+N/+S), C45E (+N/+S)» (C45 e C45E elencate separatamente)')]),
     ('s235jr', 'da costruzione', [('OVA-S235', r'Soft structural steel easy to weld and bend', '«Soft structural steel easy to weld and bend»'),
                                   ('LUC-S235JR', r'Acciaio da\s+Scheda Dati.{0,300}?costruzione', '«Acciaio da costruzione» (intestazione della scheda)')]),
    ]

for v in E:
    v['tag'] = []
for (vid, tag, specs) in TAGS:
    if tag not in TAG_VOCAB:
        ERRORI.append(f'tag fuori vocabolario: {tag}'); continue
    v = next((x for x in E if x['id'] == vid), None)
    if v is None:
        ERRORI.append(f'voce inesistente per il tag: {vid}'); continue
    prove_tag = []
    for (docid, rx, estratto) in specs:
        f = next((x for x in v['fonti'] if x['id'] == docid), None)
        if f is None:
            ERRORI.append(f'{vid}: il documento {docid} del tag «{tag}» non è tra le fonti della voce'); continue
        pr = prova(docid, 'tag', rx)
        pr = dict(pr, estratto=estratto)
        f['prove'].append(pr)
        f['campi'] = sorted(set(f['campi']) | {'tag'})
        prove_tag.append(dict(fonte=docid, pagina=pr['pagina'], estratto=estratto))
    v['tag'].append(dict(tag=tag, prove=prove_tag))

# ---------------------------------------------------------------- alias (ognuno con documenti, pagine e frasi)
# (voce, alias, origine, [(documento, regex, estratto)]). Per origine «non da produttore» servono >= 2 emittenti indipendenti.
RUOLI_ALIAS = {'Weerg': 'fornitore di lavorazioni (lavorazioni CNC)', 'Università Politecnica delle Marche': 'tesi o articolo tecnico',
               'IMS S.p.A.': 'catalogo commerciale (ruolo non dichiarato nel documento)',
               'Moretti Acciai S.p.A.': 'distributore (il documento presenta un «STOCK PROGRAM» e tagli su misura; non si dichiara produttore)'}
ALIAS = [
 dict(voce='7075', alias='Ergal', origine='non da produttore', specs=[
    ('WEE-7075', r'Alluminio 7075\s+Ergal / 9007/2 / AlZnMgCu1\.5 / 3\.4365 / 2L95/L160 / A-ZGU /\s+P-AlZn5\.8MgCu',
     '«Alluminio 7075» e, sotto, «Ergal / 9007/2 / AlZnMgCu1.5 / 3.4365 / 2L95/L160 / A-ZGU / P-AlZn5.8MgCu» (elenco delle designazioni della lega)'),
    ('UPM-ERGAL', r'Nel 1936 fu introdotta la 7075, chiamata Ergal', '«Nel 1936 fu introdotta la 7075, chiamata Ergal»'),
    ('UPM-ERGAL', r'invecchiamento è minimo; ciò è anche vero per la 7075 \(Ergal\)', '«… ciò è anche vero per la 7075 (Ergal) …»'),
    ('UPM-ERGAL', r'ERGAL\s+Leghe Al-Zn-Mg-Cu\s+L\.L\.L\.-Italia\s+ERGAL 55=7075\s+Alluminio Italia-Italia\s+ERGAL 65=7049',
     'tabella dei nomi commerciali: «ERGAL, Leghe Al-Zn-Mg-Cu … ERGAL 55=7075 … ERGAL 65=7049»')],
    nota='La tesi (pag. 17) elenca «Ergal» anche come nome di una famiglia di leghe Al-Zn-Mg-Cu: ERGAL 55 = 7075, ERGAL 65 = 7049. Negli altri passaggi, e nella scheda Weerg, «Ergal» indica la 7075.'),
]
if FASE2C:
    ALIAS += [
     dict(voce='39nicrmo3', alias='NCM2', origine='non da produttore', una_sola_fonte=True, specs=[
        ('IMS-NCM2', None, 'pag. 61 del catalogo (pagina 1 del PDF), tabella «Corrispondenze / Comparable standards»: colonna SIAU, cella «NCM2» (lettura a vista: PDF fotografico senza testo)', 1)],
        nota='Colonna SIAU, catalogo IMS (UNI 7845).'),
     dict(voce='1.2379', alias='KORV', origine='non da produttore', una_sola_fonte=True, specs=[
        ('MOR-CWS', r'Z160CDV12\s+AISI D2\s+W\. nr 1\.2379.{0,200}?KORV\s+BD2\s+X155CrVMo12-1',
         'griglia delle corrispondenze in alto a sinistra: «Z160CDV12 · AISI D2 · W. nr 1.2379» sopra «KORV · BD2 · X155CrVMo12-1»; cella «KORV» senza etichetta di colonna')],
        nota='Cella senza etichetta di colonna; scheda con dati indicativi.'),
    ]
for v in E:
    v['alias'] = []
for al in ALIAS:
    v = next((x for x in E if x['id'] == al['voce']), None)
    if v is None:
        ERRORI.append(f"voce inesistente per l'alias: {al['voce']}"); continue
    prove_a, fonti_a = [], []
    for spec in al['specs']:
        docid, rx, estratto = spec[0], spec[1], spec[2]
        f = next((x for x in v['fonti'] if x['id'] == docid), None)
        if f is None:
            f = dict(id=docid, prove=[], campi=[])
            v['fonti'].append(f)
        if rx is None:   # PDF fotografico senza testo: lettura a vista, pagina indicata a mano
            D[docid]['sha256'] = sha(os.path.join(BASE, D[docid]['path']))
            D[docid]['visiva'] = True
            pr = dict(campo='alias', pagina=spec[3], estratto=estratto, _full=estratto)
        else:
            pr = dict(prova(docid, 'alias', rx), estratto=estratto)
        f['prove'].append(pr)
        f['campi'] = sorted(set(f['campi']) | {'alias'})
        prove_a.append(dict(fonte=docid, pagina=pr['pagina'], estratto=estratto))
        fonti_a.append(docid)
    a_ = dict(alias=al['alias'], origine=al['origine'], fonti=sorted(set(fonti_a)), prove=prove_a)
    if al.get('una_sola_fonte'): a_['una_sola_fonte'] = True
    if al.get('nota'): a_['nota'] = al['nota']
    v['alias'].append(a_)

if FASE2C:  # corrispondenze indicative del 39NiCrMo3 riportate dal catalogo IMS (valori tra parentesi nella tabella)
    v = next(x for x in E if x['id'] == '39nicrmo3')
    f = next(x for x in v['fonti'] if x['id'] == 'IMS-NCM2')
    D['IMS-NCM2']['visiva'] = True
    f['prove'].append(dict(campo='corrispondenze', pagina=1, _full='', estratto='pag. 61, tabella «Corrispondenze»: DIN «(36CrNiMo4)», W.N. «(1.6511)», AFNOR «(40NCD3)», AISI/SAE «(9840)», tutti scritti tra parentesi (lettura a vista)'))
    f['campi'] = sorted(set(f['campi']) | {'corrispondenze'})

# ---------------------------------------------------------------- controllo incrociato dei numeri di composizione
NUM = re.compile(r'\d+(?:[.,]\d+)?')
def numeri(testo):
    return {round(float(x.replace(',', '.')), 6) for x in NUM.findall(testo)}
for v in E:
    c = v['composizione']
    if c.get('tipo') != 'lega':
        continue
    visti = set()
    for f in v['fonti']:
        for pr in f['prove']:
            if pr['campo'] == 'composizione':
                visti |= numeri(pr['_full'])
    for el_, x in c['elementi'].items():
        if x == 'resto':
            continue
        for k in ('min', 'max'):
            if k in x and round(float(x[k]), 6) not in visti:
                ERRORI.append(f"{v['id']}: {el_}.{k}={x[k]} non compare nel testo letto per la composizione")

# ---------------------------------------------------------------- calcolo densità nominale/intervallo
def r3(x):
    return float(f'{x:.3f}')

for v in E:
    letture = [x['g_cm3'] for f in v['fonti'] for x in f.get('densita_letta', [])]
    if not letture:
        ERRORI.append(f"nessuna densità letta per {v['id']}")
        continue
    lo, hi = min(letture), max(letture)
    v['densita_letture_g_cm3'] = sorted(set(letture))
    if lo == hi:
        v['densita_g_cm3'] = lo
        v['densita_intervallo_g_cm3'] = None
        v['nota_intervallo'] = ''
    else:
        v['densita_g_cm3'] = r3((lo + hi) / 2)
        v['densita_intervallo_g_cm3'] = [lo, hi]
    v['data_verifica'] = DB_DATA if v['id'] in TOCCATE_V4 else (OGGI_2C if (FASE2C and v['id'] in TOCCATE_2C) else OGGI)

# ---------------------------------------------------------------- uscita
if ERRORI:
    print('\n'.join(ERRORI))
    print(f'\n{len(ERRORI)} ERRORI: costruzione interrotta')
    sys.exit(1)

n_prove = sum(len(f['prove']) for v in E for f in v['fonti'])
print(f'OK: {len(E)} voci, {len(D)} documenti, {n_prove} prove verificate nel testo dei documenti')
if SOLO:
    sys.exit(0)

# JSON
RUOLI = {'Lucefin Group': 'produttore e distributore (barre trafilate, pelate e rettificate)',
         'Indium Corporation': 'fornitore',
         'NIST (National Institute of Standards and Technology)': 'riferimento scientifico'}
RUOLI.update(RUOLI_ALIAS) if 'RUOLI_ALIAS' in globals() else None
def pulisci(v):
    fonti = []
    for f in v['fonti']:
        d = D[f['id']]
        riferimento = '; '.join(f"{p['campo']}: p. {p['pagina']}" if d['path'].endswith('.pdf') else f"{p['campo']}: pagina web" for p in f['prove'])
        # riferimento compatto: un'indicazione per campo con le pagine
        per_campo = {}
        for p in f['prove']:
            per_campo.setdefault(p['campo'], []).append(p['pagina'])
        parti = []
        for c, pgs in per_campo.items():
            if d['path'].endswith('.pdf'):
                parti.append(f"{c} p. " + ','.join(str(x) for x in sorted(set(pgs))))
            else:
                parti.append(f"{c} (pagina web)")
        rif = '; '.join(parti) + (' (' + d['rif_extra'] + ')' if d.get('rif_extra') else '')
        out = dict(id=f['id'], emittente=d['emittente'], ruolo=RUOLI.get(d['emittente'], 'produttore'), documento=d['titolo'], riferimento=rif, url=d['url'], sha256=d['sha256'][:16], campi=f['campi'])
        if d.get('utente'):
            out['fornito_da_utente'] = True
        if 'densita_letta' in f: out['densita_letta'] = f['densita_letta']
        fonti.append(out)
    r = dict(id=v['id'], nome=v['nome'], famiglia=v['famiglia'], designazioni=v['designazioni'], nome_commerciale=v['nome_commerciale'],
             composizione=v['composizione'], densita_g_cm3=v['densita_g_cm3'], densita_intervallo_g_cm3=v['densita_intervallo_g_cm3'],
             nota_intervallo=v['nota_intervallo'], tag=v['tag'], alias=v.get('alias', []), fonti=fonti, data_verifica=v['data_verifica'])
    return r

DB = dict(meta=dict(schema=1, versione=DB_VERSIONE, data=DB_DATA, tag=TAG_VOCAB,
                    regola_nominale='Se i documenti letti concordano: valore comune. Se discordano: densità nominale = punto medio tra minimo e massimo letti (arrotondato a 3 decimali), con intervallo e fonti.',
                    famiglie=FAM),
          materiali=[pulisci(v) for v in E])
open(OUT_JSON, 'w', encoding='utf8').write(json.dumps(DB, ensure_ascii=False, indent=1))

# dump dei documenti letti e delle prove, per docs/fonti-fase2c.md
_doc_dump = {}
for v in E:
    for f in v['fonti']:
        d = D[f['id']]
        e = _doc_dump.setdefault(f['id'], dict(id=f['id'], emittente=d['emittente'], titolo=d['titolo'], url=d['url'], utente=d.get('utente', False), visiva=d.get('visiva', False),
                                            sha256=d.get('sha256') or sha(os.path.join(BASE, d['path'])), path=d['path'], voci=[], prove=[]))
        e['voci'].append(v['id'])
        for pr in f['prove']:
            e['prove'].append(dict(voce=v['id'], campo=pr['campo'], pagina=pr['pagina'], estratto=pr['estratto']))
open(OUT_JSON.replace('.json', '_docs.json'), 'w', encoding='utf8').write(json.dumps(_doc_dump, ensure_ascii=False, indent=1))


# Report markdown
md = []
md.append('# Report fonti – Fase 1, lotto pilota\n')
md.append(f'Documenti letti il {OGGI}. Ogni valore del DB è stato confrontato con il testo della pagina del documento citato (verifica automatica: {n_prove} prove, nessuna mancante).\n')
md.append('Regola per la densità nominale: se i documenti concordano, valore comune; se discordano, punto medio tra minimo e massimo letti (3 decimali), con intervallo e fonti.\n')
md.append('Le copie dei PDF non sono nel repository (il repository è pubblico): l\'hash SHA-256 identifica il file letto.\n')
md.append('## Documenti letti\n')
md.append('| id | Emittente | Documento | URL | SHA-256 |\n|---|---|---|---|---|')
usati = []
for v in E:
    for f in v['fonti']:
        if f['id'] not in usati: usati.append(f['id'])
for i in usati:
    d = D[i]
    md.append(f"| {i} | {d['emittente']} | {d['titolo']} | {d['url']} | `{d['sha256']}` |")
md.append('\n## Voci\n')
for v in E:
    md.append(f"### {v['nome']} (`{v['id']}`, {v['famiglia']})\n")
    dn = v['densita_g_cm3']
    if v['densita_intervallo_g_cm3']:
        md.append(f"- **Densità nominale: {dn} g/cm³**, intervallo {v['densita_intervallo_g_cm3'][0]}–{v['densita_intervallo_g_cm3'][1]}. {v['nota_intervallo']}")
    else:
        md.append(f"- **Densità: {dn} g/cm³** (documenti concordi).")
    for f in v['fonti']:
        d = D[f['id']]
        md.append(f"- {f['id']} ({d['emittente']}):")
        for p in f['prove']:
            pg = f"p. {p['pagina']}" if d['path'].endswith('.pdf') else 'pagina web'
            md.append(f"  - {p['campo']}, {pg}: «{p['estratto']}»")
    for t in v['tag']:
        md.append(f"- **Tag «{t['tag']}»**")
        for pr in t['prove']:
            md.append(f"  - {pr['fonte']}, p. {pr['pagina']}: {pr['estratto']}")
    md.append('')
open(OUT_MD, 'w', encoding='utf8').write('\n'.join(md))
print('scritti:', OUT_JSON, OUT_MD)
