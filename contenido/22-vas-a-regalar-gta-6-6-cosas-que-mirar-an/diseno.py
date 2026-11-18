"""Diseño · 22 · ¿Vas a regalar GTA 6? 6 cosas que mirar antes de comprarlo (carrusel 8 diapositivas).

Fotos sin armas (público familiar) y distintas de las del resto de la semana 27/11-3/12.
"""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    # la plantilla mete la ruta en url() sin comillas: hay que codificar los espacios
    return quote(ruta)


TOTAL = 8
F1 = foto("Places/Vice City/Vice_City_10.jpg")
F2 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_04.jpg")
F3 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_06.jpg")
F4 = foto("Places/Leonida Keys/Leonida_Keys_04.jpg")
F5 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_05.jpg")
F6 = foto("Places/Leonida Keys/Leonida_Keys_07.jpg")
F7 = foto("Places/Grassrivers/Grassrivers_02.jpg")
F8 = foto("Places/Vice City/Vice_City_01.jpg")

render([
    (cover(F1, "GUÍA DE REGALO",
           '¿VAS A <span class="mag">REGALAR</span> <span class="ye">GTA 6</span>?',
           "Mira esto antes de pagar: 6 cosas en un solo post",
           [("pad", "PS5 Y XBOX SERIES"), ("disc", "CAJA CON CÓDIGO"), ("save", "HASTA 212 GB"), ("star", "2 EDICIONES")],
           1, TOTAL),
     salida("22-1.jpg"), 1080, 1350),
    (info(F2, "01 · CONSOLA", "SOLO PS5 Y XBOX SERIES",
          [("pad", "PLAYSTATION", "PS5", "Mejorado para PS5 Pro", "ye"),
           ("pad", "XBOX", "SERIES X/S", "Vale para Series X y para Series S", "cy"),
           ("x", "SIN VERSIÓN ANUNCIADA", "PC · PS4 · XBOX ONE", "Mira qué consola tiene antes de comprarlo", "mag")], 2, TOTAL),
     salida("22-2.jpg"), 1080, 1350),
    (info(F3, "02 · LA CAJA", "EDICIÓN FÍSICA SIN DISCO",
          [("disc", "DENTRO DE LA CAJA", "UN CÓDIGO", "No trae disco: la caja trae el código del juego", "ye"),
           ("alert", "OJO SI", "QUIERES DISCO", "Si lo buscas para la estantería, no hay disco", "cy"),
           ("pin", "EN TIENDAS", "DESDE EL 12/11", "La edición física ya está a la venta", "mag")], 3, TOTAL),
     salida("22-3.jpg"), 1080, 1350),
    (info(F4, "03 · ESPACIO", "HAZLE SITIO EN LA CONSOLA",
          [("save", "TAMAÑO", "HASTA 212 GB", "Según el dispositivo", "ye"),
           ("check", "ANTES DEL DÍA", "LIBERA ESPACIO", "Mira cuánto sitio libre le queda a la consola", "cy")], 4, TOTAL,
          photo_h=740),
     salida("22-4.jpg"), 1080, 1350),
    (info(F5, "04 · EDICIONES", "PRECIO OFICIAL EN ESPAÑA",
          [("star", "STANDARD", "79,99 €", "Precio oficial en PS Store y Microsoft Store", "ye"),
           ("trophy", "ULTIMATE", "99,99 €", "Precio oficial en PS Store y Microsoft Store", "cy"),
           ("check", "ANTES DE PAGAR", "SU CONSOLA", "Que sea la versión de PS5 o la de Xbox Series X/S", "mag")], 5, TOTAL),
     salida("22-5.jpg"), 1080, 1350),
    (info(F6, "05 · GTA ONLINE", "NO VIENE DE SALIDA",
          [("globe", "GTA ONLINE", "MÁS ADELANTE", "No llega en el lanzamiento: llegará más adelante", "ye"),
           ("alert", "SI LO QUIERE PARA ONLINE", "AÚN NO", "Avísale antes de regalárselo", "cy")], 6, TOTAL,
          photo_h=740),
     salida("22-6.jpg"), 1080, 1350),
    (info(F7, "06 · BONUS DE RESERVA", "YA NO ESTÁ DISPONIBLE",
          [("clock", "ERA EL BONUS", "VINTAGE VICE CITY PACK", "Venía en las dos ediciones", "ye"),
           ("x", "SOLO HASTA", "EL 20/11", "Era para compras antes del 20/11: no cuentes con él", "cy")], 7, TOTAL,
          photo_h=740),
     salida("22-7.jpg"), 1080, 1350),
    (close(F8, "¿Lo regalas o te lo regalan?", "Guárdalo para cuando vayas a comprarlo 📌",
           [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 8, TOTAL),
     salida("22-8.jpg"), 1080, 1350),
])
