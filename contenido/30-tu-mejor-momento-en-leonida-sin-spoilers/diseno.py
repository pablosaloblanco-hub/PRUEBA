"""Suelta 30 · Tu mejor momento en Leonida (sin spoilers)."""
from pathlib import Path
from urllib.parse import quote

from plantilla_gta6 import mini, render, single


def salida(nombre: str) -> str:
    return str(Path.cwd() / nombre)


def foto(ruta: str) -> str:
    return quote(ruta)


FOTO = foto("Places/Port Gellhorn/Port_Gellhorn_06.jpg")

# Línea del ejemplo debajo de mini (26 px, centrada, cursiva), dentro de middle
EJEMPLO = ('<div style="margin-top:18px;text-align:center;font-weight:700;font-style:italic;font-size:26px;'
           'letter-spacing:1px;color:#f3eaff;text-shadow:0 2px 6px #000">'
           'Ej.: «el atardecer desde la carretera de la costa»</div>')

render([
    (single(FOTO, "CUÉNTANOS TU ANÉCDOTA",
            'TU <span class="ye">MEJOR MOMENTO</span> EN <span class="mag">LEONIDA</span>',
            'Sin spoilers: <span class="cy">nada de misiones</span>',
            mini([("pin", "UN SITIO", "Dónde estabas"),
                  ("star", "UN MOMENTO", "Qué pasó"),
                  ("x", "CERO SPOILERS", "Nada de la historia")]) + EJEMPLO,
            "CUÉNTANOSLO EN COMENTARIOS 👇", size=130),
     salida("30-1.jpg"), 1080, 1350),
])
