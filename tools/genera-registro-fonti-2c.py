#!/usr/bin/env python3
"""Genera docs/fonti-fase2c.md dal dump dei documenti prodotto da costruisci_db.py (<out>_docs.json).
Uso: python3 -I tools/genera-registro-fonti-2c.py <out_db_docs.json> <cartella-fonti> > docs/fonti-fase2c.md
I PDF non sono nel repository (è pubblico): l'hash SHA-256 completo identifica il file letto."""
import json, sys, os, hashlib

docs = json.load(open(sys.argv[1], encoding='utf8'))
BASE = sys.argv[2]
IDS_2C = ['LUC-39NI-IT', 'LUC-39NI-EN', 'IMS-NCM2', 'LUC-4462-IT', 'LUC-4462-EN', 'SWI-4462', 'ALL-2205', 'LUC-12343', 'BOE-W300B', 'BOE-W300D', 'SWI-2343',
          'LUC-12311', 'SWI-2311', 'OVA-S235', 'LUC-S235JR', 'OVA-C45', 'MAR-BON', 'MOR-CWS']
NOMI_CAMPO = {'densita': 'densità', 'composizione': 'composizione', 'designazioni': 'designazioni', 'nome_commerciale': 'nome commerciale',
              'tag': 'tag', 'alias': 'alias', 'corrispondenze': 'corrispondenze indicative'}

def sha_file(rel):
    h = hashlib.sha256()
    with open(os.path.join(BASE, rel), 'rb') as f:
        for b in iter(lambda: f.read(1 << 16), b''):
            h.update(b)
    return h.hexdigest()

out = []
out.append('# Fonti – Fase 2c (nuovi materiali e alias)')
out.append('')
out.append('Letto il 2026-11-14. Registro di ogni documento letto per la Fase 2c: URL, SHA-256 completo, pagine e frasi o celle. Generato da `tools/genera-registro-fonti-2c.py` a partire dal dump di `tools/costruisci_db.py`.')
out.append('Le pagine sono quelle del PDF (non quelle stampate), tranne dove indicato. Ogni prova è stata cercata nel testo della pagina citata; l\'unica eccezione è il catalogo IMS, un PDF fotografico senza testo, letto a vista.')
out.append('')
out.append('## Regole applicate')
out.append('')
out.append('- Nessun valore a memoria: ogni valore ha pagina e frase o tabella; ciò che non si verifica non entra.')
out.append('- **Fonti indipendenti** = documenti di produttori o enti diversi. Due schede dello stesso ente (per esempio Lucefin in italiano e in inglese) contano come UNA fonte.')
out.append('- I due PDF forniti da Luca (IMS e Moretti) valgono solo come fonte di alias e di corrispondenze indicative, non di densità, tag o composizione.')
out.append('- Un alias con un solo documento non-aggregatore entra con l\'etichetta «una sola fonte» (uso personale, decisione di Luca); la regola vale solo per gli alias.')
out.append('')
out.append('## Documenti usati')
out.append('')
out.append('| id | Emittente | Documento | URL | SHA-256 |')
out.append('|---|---|---|---|---|')
for i in IDS_2C:
    d = docs[i]
    url = d['url'] if d['url'] else 'nessun URL: copia fornita da Luca'
    out.append(f"| {i} | {d['emittente']} | {d['titolo']} | {url} | `{d['sha256']}` |")
out.append('')
out.append('## Prove per documento')
out.append('')
for i in IDS_2C:
    d = docs[i]
    out.append(f"### {i} — {d['emittente']}")
    out.append('')
    out.append(f"{d['titolo']}" + (' (lettura a vista: PDF fotografico senza testo)' if d['visiva'] else ''))
    out.append('')
    vistes = set()
    for p in d['prove']:
        chiave = (p['voce'], p['campo'], p['pagina'], p['estratto'])
        if chiave in vistes:
            continue
        vistes.add(chiave)
        out.append(f"- voce `{p['voce']}`, {NOMI_CAMPO.get(p['campo'], p['campo'])}, pag. {p['pagina']}: {p['estratto']}")
    out.append('')

out.append('## Letti e non usati')
out.append('')
LETTI_NON_USATI = [
    ('Lucefin Group', 'Scheda SAE 1045 (rev. 2018)', 'https://www.lucefin.com/wp-content/files_mf/1528727530SAE1045.pdf', '2c/c45/lucefin_SAE1045.pdf',
     'Nessuna densità. La riga delle corrispondenze elenca insieme C45, Ck45 e C45E: non è stata usata per C45.'),
    ('Trevigiana Metalli', 'Scheda tecnica W. 1.2379', 'https://trevigianametalli.it/wp-content/uploads/pdf/scheda-tecnica-w-1.2379.pdf', '2c/letti-non-usati/trevigiana_scheda_1.2379.pdf',
     'Il testo non contiene «KORV» (tabella «Corrispondenze approssimative»: UNI X155CrVMo121KU, DIN X155CrVMo121, WERK 1.2379, AFNOR Z160CDV12, AISI D2).'),
    ('Trevigiana Metalli', 'Pagina prodotto 1.2379 (piatto laminato a caldo)', 'https://trevigianametalli.it/prodotto/acciaio-uni-x155crvmo12-1-ku-w-1-2379-piatto-laminato-a-caldo/', '2c/letti-non-usati/trevigiana_prodotto_piatto.html',
     'Il testo non contiene «KORV».'),
    ('Rives', 'Catalogo piatti di precisione 12379', 'https://www.rivessrl.com/allegati/12379_1624528834.pdf', '2c/letti-non-usati/rives_12379.pdf',
     'Il testo non contiene «KORV»: riporta solo 1.2379 e X155CrVMo12-1.'),
    ('Marcegaglia Plates', 'Brochure generale Heavy Plates, giugno 2022 EN-IT (17 pagine)', 'https://www.publications.marcegaglia.com/wp-content/uploads/2023/07/Marcegaglia-Heavy-Plates-Giugno-2022-EN-IT.pdf', '2c/letti-non-usati/marcegaglia_heavy_plates_2022-06_generale.pdf',
     'A pag. 9 elenca «C45/C45E» insieme: non distingue C45 da C45E, quindi non è stata usata per il tag. Nessuna composizione né W.Nr. 1.0503.'),
    ('Marcegaglia Plates', 'Pagine web «Quenching and case-hardening» (IT e EN)', 'https://www.heavyplates.marcegaglia.com/settori-applicativi/bonifica-e-cementazione/', '2c/letti-non-usati/marcegaglia_bonifica_it.html',
     'Elencano C45 e C45E separatamente tra gli acciai non legati da bonifica (stessa informazione del PDF di aprile 2026); non usate come fonte, il PDF è un documento datato e con hash.'),
]
for emit, titolo, url, rel, nota in LETTI_NON_USATI:
    out.append(f"- **{emit}**, {titolo}: {url}" + (f" (SHA-256 `{sha_file(rel)}`)" if rel else '') + f". {nota}")
out.append('')
out.append('## Non raggiungibili o non trovati')
out.append('')
out.append('- `https://www.heavyplates.marcegaglia.com/pdf/Marcegaglia-Plates-acciai-da-bonifica_EN-IT_Giugno_2022.pdf` (PDF indicato per C45): risponde 404 su quel sito; la brochure attuale è quella di aprile 2026 sul sito delle pubblicazioni (MAR-BON). Composizione e W.Nr. 1.0503 non compaiono in nessuna versione letta.')
out.append('- `https://www.2c2m.it/…/1_2379.html` (pagina citata dalla ricerca web per «KORV»): il server chiude la connessione; non letta.')
out.append('- I percorsi `/oaleekso/files_mf/…` di Lucefin danno 404 da qui: gli stessi file sono su `/wp-content/files_mf/…` (usato nel DB). La scheda inglese del 39NiCrMo3 è `…152353577239NiCrMo3.pdf`; `…152353577739…` non esiste.')
out.append('- Böhler M200: non scaricabile (l\'URL restituisce una pagina HTML); la ricerca lo indica come 1.2312 SEL, non 1.2311. Non usato.')
print('\n'.join(out))
