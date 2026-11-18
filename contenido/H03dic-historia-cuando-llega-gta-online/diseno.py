"""Historia H03dic-historia-cuando-llega-gta-online: 1080×1920 con story() de la plantilla oficial.
Arriba queda la foto libre para la pegatina que pone Pablo a mano."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


# La plantilla mete la ruta en url() sin comillas: los espacios se codifican con quote().
FOTO = 'Places/Vice City/Vice_City_13.jpg'

render([
    (story(quote(FOTO), 'GTA ONLINE',
           '14 DÍAS DE <span class="ye">GTA 6</span>',
           '¿Se repite lo de GTA V?',
           ['GTA V: Online a los 14 días', 'GTA 6: hoy hace 14 días', '¿Cuándo llega el de GTA 6?'],
           size=130, pos='60% center'),
     salida('H-03dic.jpg'), 1080, 1920),
])
