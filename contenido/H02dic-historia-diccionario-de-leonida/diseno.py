"""Historia H02dic-historia-diccionario-de-leonida: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
FOTO = 'Places/Ambrosia/Ambrosia_02.jpg'

render([
    (story(quote(FOTO), 'GUÍA RÁPIDA',
           'DICCIONARIO DE <span class="cy">LEONIDA</span>',
           '3 nombres que vas a oír mucho',
           ['Tisha-Wocka: mercadillo', 'Allied Crystal: refinería', "Only Raw: sello de Dre'Quan"],
           size=130, pos='25% center'),
     salida('H-02dic.jpg'), 1080, 1920),
])
