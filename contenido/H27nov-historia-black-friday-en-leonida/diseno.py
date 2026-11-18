"""Historia H27nov-historia-black-friday-en-leonida: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
FOTO = 'Places/Leonida Keys/Leonida_Keys_06.jpg'

render([
    (story(quote(FOTO), 'PLAN DE BLACK FRIDAY',
           'BLACK FRIDAY EN <span class="ye">LEONIDA</span>',
           '¿Qué plan te pides? Vota A, B o C',
           ['Escapada a Leonida Keys', 'Ruta motera por Ambrosia', '4x4 por Mount Kalaga'],
           size=130, pos='55% center'),
     salida('H-27nov.jpg'), 1080, 1920),
])
