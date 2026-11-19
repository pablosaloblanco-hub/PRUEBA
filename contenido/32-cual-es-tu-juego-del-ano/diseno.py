"""32 · ¿Cuál es tu juego del año? (suelta, 1 imagen). Sin nombre del personaje, sin «GOTY» ni galas."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("People/DreQuan Priest/DreQuan_Priest_03.jpg")

render([
    (single(F1, "DEBATE DE FIN DE AÑO",
            '¿CUÁL ES TU <span class="ye">JUEGO</span> DEL <span class="mag">AÑO</span>?',
            'Solo uno. Vale cualquiera, <span class="cy">no tiene que ser GTA 6</span>',
            mini([("check", "UNO SOLO", "Sin empates"),
                  ("pad", "EL QUE SEA", "De cualquier consola"),
                  ("x", "SIN SPOILERS", "Tampoco de otros juegos")]),
            "COMENTA TU JUEGO DEL AÑO 👇"),
     salida("32-1.jpg"), 1080, 1350),
])
