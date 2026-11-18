"""N25nov · Los récords de GTA 6 antes de salir · carrusel de 5 (1080×1350)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


F1 = foto("Places/Vice City/Vice_City_10.jpg")
F2 = foto("Places/Vice City/Vice_City_26.jpg")
F3 = foto("Places/Leonida Keys/Leonida_Keys_06.jpg")
F4 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_04.jpg")
F5 = foto("Places/Grassrivers/Grassrivers_05.jpg")
TOTAL = 5

render([
    (cover(F1, "LOS NÚMEROS DE LOS TRÁILERES",
           'GTA 6 BATIÓ <span class="ye">RÉCORDS</span><br>ANTES DE <span class="cy">SALIR</span>',
           "Dos tráileres, un Guinness y cifras de locos",
           [("eye", "93 M"), ("fire", "+475 M"), ("trophy", "Guinness")], 1, TOTAL, size=130),
     salida("N25nov-1.jpg"), 1080, 1350),
    (info(F2, "TRÁILER 1", "4 DE DICIEMBRE DE 2023",
          [("clock", "FECHA", "4/12/2023", "Iba a salir el día 5 y se adelantó por una filtración.", "ye"),
           ("eye", "YOUTUBE · 24 H", "93 millones", "Visitas en YouTube en sus primeras 24 horas.", "cy"),
           ("trophy", "RÉCORD", "N.º 1 no musical", "El vídeo no musical más visto en su primer día en YouTube.", "mag")],
          2, TOTAL),
     salida("N25nov-2.jpg"), 1080, 1350),
    (info(F3, "TRÁILER 2", "6 DE MAYO DE 2025",
          [("bolt", "POR SORPRESA", "6/5/2025", "Rockstar lo lanzó por sorpresa.", "ye"),
           ("globe", "EN 24 HORAS", "+475 millones", "Sumando plataformas, según Rockstar a The Hollywood Reporter.", "cy"),
           ("fire", "SUPERÓ A", "365 M", "Las visitas del tráiler de Deadpool y Lobezno, que se quedó por detrás.", "mag")],
          3, TOTAL),
     salida("N25nov-3.jpg"), 1080, 1350),
    (info(F4, "GUINNESS", "GAMER'S EDITION 2027",
          [("trophy", "RÉCORD MUNDIAL", "Más visto en 24 h", "Tráiler de videojuego más visto en 24 horas.", "ye"),
           ("star", "DÓNDE", "Gamer's Edition 2027", "La edición de videojuegos de Guinness World Records.", "cy"),
           ("info", "OJO", "Récord de tráiler", "Es un récord de visitas, no de ventas ni de jugadores.", "mag")],
          4, TOTAL),
     salida("N25nov-4.jpg"), 1080, 1350),
    (close(F5, "¿Qué récord batirá ahora?",
           "Comenta tu apuesta y guarda el carrusel para tenerlo a mano",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 5, TOTAL, size=120),
     salida("N25nov-5.jpg"), 1080, 1350),
])
