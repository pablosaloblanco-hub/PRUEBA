"""Historia NH23nov: 1080x1920 (NH-23nov.jpg). Hueco arriba para la pegatina de Pablo."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import render, story


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto('People/DreQuan Priest/DreQuan_Priest_02.jpg')

render([
    (story(FOTO, 'PERSONAJES',
           '¿QUIÉN ES TU <span class="ye">FAVORITO</span>?',
           'Vota en la encuesta',
           ['Boobie Ike: leyenda local', "Dre'Quan: buscavidas", 'Brian Heder: contrabandista'], size=120, pos='84% center'),
     salida('NH-23nov.jpg'), 1080, 1920),
])
