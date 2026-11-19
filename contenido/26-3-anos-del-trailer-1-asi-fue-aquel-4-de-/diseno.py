"""26 · 3 años del tráiler 1: así fue aquel 4 de diciembre (carrusel de 5, 1080×1350)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("Places/Vice City/Vice_City_16.jpg")
F2 = foto("Places/Vice City/Vice_City_11.jpg")
F3 = foto("Places/Leonida Keys/Leonida_Keys_01.jpg")
F4 = foto("People/Raul Bautista/Raul_Bautista_03.jpg")
F5 = foto("People/Raul Bautista/Raul_Bautista_01.jpg")
TOTAL = 5

render([
    (cover(F1, "HOY HACE 3 AÑOS",
           '3 AÑOS DEL<br><span class="ye">TRÁILER 1</span>',
           'El día que GTA 6 <span class="cy">se adelantó</span>: así fue el 4 de diciembre de 2023',
           [("clock", "4/12/2023"), ("bolt", "SE ADELANTÓ UN DÍA"), ("eye", "93 M EN 24 H")],
           1, TOTAL, size=150),
     salida("26-1.jpg"), 1080, 1350),
    (info(F2, "EL ADELANTO", "4 DE DICIEMBRE DE 2023",
          [("clock", "EL PLAN", "5 de diciembre", "Era el día previsto para el tráiler.", "ye"),
           ("bolt", "LO QUE PASÓ", "4 de diciembre", "Salió un día antes de lo previsto.", "cy"),
           ("alert", "POR QUÉ", "Una filtración", "Por eso Rockstar lo lanzó antes de tiempo.", "mag")],
          2, TOTAL),
     salida("26-2.jpg"), 1080, 1350),
    (info(F3, "LAS PRIMERAS 24 HORAS", "EN YOUTUBE",
          [("eye", "VISITAS", "93 millones", "Las que sumó en YouTube en solo 24 horas.", "ye"),
           ("star", "EN SU PRIMER DÍA", "N.º 1",
            "Ningún vídeo no musical había tenido tantas visitas en su primer día en YouTube.", "cy")],
          3, TOTAL, photo_h=740),
     salida("26-3.jpg"), 1080, 1350),
    (info(F4, "3 AÑOS DESPUÉS", "DE 2023 A 2026",
          [("cam", "ENTONCES", "4/12/2023", "El primer tráiler, por fin.", "ye"),
           ("pad", "EL ESTRENO", "19/11/2026", "El día que por fin se pudo jugar.", "cy"),
           ("palm", "HOY", "4/12/2026", "Tres años después, ya estamos en Leonida.", "mag")],
          4, TOTAL),
     salida("26-4.jpg"), 1080, 1350),
    (close(F5, "¿Dónde estabas cuando lo viste?",
           "Cuéntalo en comentarios y manda esto a quien lo vio contigo",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 5, TOTAL, size=120),
     salida("26-5.jpg"), 1080, 1350),
])
