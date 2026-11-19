"""Carrusel 28 · Reto foto del puente: 6 fotos que tienes que hacer en Leonida (5 diapositivas)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import close, cover, info, render


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


# Rótulo pequeño sobre la foto (esquina superior derecha, bajo el contador y a la altura del crédito)
ROTULO = ('<div style="position:absolute;top:166px;right:60px;z-index:30;font-weight:800;font-size:22px;'
          'letter-spacing:3px;color:#ffd23f;background:rgba(11,6,18,.78);border:2px solid #ffd23f;'
          'border-radius:10px;padding:5px 14px;text-shadow:0 1px 4px #000">FOTO DE EJEMPLO</div>')


def con_rotulo(html: str) -> str:
    return html.replace('<div class="border"></div>', ROTULO + '<div class="border"></div>', 1)


F_PORTADA = foto("Places/Ambrosia/Ambrosia_04.jpg")
# Grassrivers_04 (guion) descartada: hombre con rifle en la camioneta y coches patrulla. Se usa Ambrosia_01.
F_RETOS_12 = foto("Places/Ambrosia/Ambrosia_01.jpg")
F_RETOS_34 = foto("Places/Leonida Keys/Leonida_Keys_06.jpg")
F_RETOS_56 = foto("Places/Mount Kalaga National Park/Mount_Kalaga_National_Park_04.jpg")
F_CIERRE = foto("People/Cal Hampton/Cal_Hampton_03.jpg")
TOTAL = 5

render([
    (con_rotulo(cover(F_PORTADA, "RETO DEL PUENTE",
                      'RETO <span class="ye">FOTO</span> EN <span class="mag">LEONIDA</span>',
                      '<span class="cy">6 fotos</span> que tienes que hacer este puente',
                      [("cam", "6 FOTOS"), ("eye", "SIN SPOILERS"), ("send", "MÁNDALA POR DM")], 1, TOTAL)),
     salida("28-1.jpg"), 1080, 1350),
    (info(F_RETOS_12, "EJEMPLO", "RETOS 01–02",
          [("palm", "RETO 01", "UN ATARDECER", "El cielo de Leonida a última hora", "ye"),
           ("car", "RETO 02", "UN VEHÍCULO EN MARCHA", "Tierra, mar o aire: el que quieras", "cy"),
           ("send", "CÓMO PARTICIPAR", "POR DM", "Mándanos tu foto por mensaje directo", "mag")], 2, TOTAL),
     salida("28-2.jpg"), 1080, 1350),
    (info(F_RETOS_34, "EJEMPLO", "RETOS 03–04",
          [("eye", "RETO 03", "UN ANIMAL SALVAJE", "Cuanto más cerca, mejor", "ye"),
           ("bolt", "RETO 04", "VICE CITY DE NOCHE", "Luces, neón y calle", "cy"),
           ("check", "REGLA", "CERO SPOILERS", "Nada de misiones ni pantallas de misión: solo juego libre", "mag")],
          3, TOTAL),
     salida("28-3.jpg"), 1080, 1350),
    (info(F_RETOS_56, "EJEMPLO", "RETOS 05–06",
          [("globe", "RETO 05", "DESDE LAS ALTURAS", "Leonida a vista de pájaro", "ye"),
           ("star", "RETO 06", "LA MÁS RARA", "La foto que no sabes explicar", "cy"),
           ("trophy", "LAS MEJORES", "LAS COMPARTIMOS", "Mencionando al autor y siempre con su permiso", "mag")],
          4, TOTAL),
     salida("28-4.jpg"), 1080, 1350),
    (con_rotulo(close(F_CIERRE, "¿Te apuntas?",
                      "Guarda el reto y mándanos tus fotos por DM. Compartimos las mejores mencionándote, "
                      "con tu permiso 👇",
                      [("chat", "COMENTA"), ("save", "GUARDA"), ("send", "COMPARTE")], 5, TOTAL)),
     salida("28-5.jpg"), 1080, 1350),
])
