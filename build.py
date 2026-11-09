"""Gera site estático independente, preservando os oito SVGs originais."""
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
SCREENS = {
    'lg': '1_login.svg', 'c1': '2_coord_painel.svg',
    'c2': '3_coord_estoque.svg', 'c3': '4_coord_rota.svg',
    'c4': '5_coord_doacao.svg', 'v2': '6_vol_proxima_parada.svg',
    'v3': '7_vol_entrega.svg', 'v4': '8_vol_resumo.svg',
}


def build():
    (OUT / 'assets').mkdir(parents=True, exist_ok=True)
    for file in ('index.html', 'styles.css', 'app.js'):
        shutil.copyfile(ROOT / file, OUT / file)
    for key, name in SCREENS.items():
        source = ROOT / 'Telas' / name
        if not source.exists():
            source = ROOT.parent / name
        tree = ET.parse(source)
        svg = tree.getroot()
        # Metadados de autoria não fazem parte da interface. Originais intactos.
        for metadata in list(svg.findall(f'{{{NS}}}metadata')):
            svg.remove(metadata)
        tree.write(OUT / 'assets' / f'{key}.svg', encoding='utf-8', xml_declaration=True)
    print(f'Site gerado em {OUT}')


if __name__ == '__main__':
    build()
