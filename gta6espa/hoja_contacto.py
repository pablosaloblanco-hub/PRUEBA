"""Hoja de contacto: todas las imágenes de una pieza en una sola, para revisarlas de un vistazo."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def _fuente(tam: int):
    for nombre in ("DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(nombre, tam)
        except OSError:
            continue
    return ImageFont.load_default()


def hoja(imagenes: list[Path], salida: Path, columnas: int = 4, ancho_mini: int = 360) -> Path:
    if not imagenes:
        raise ValueError("No hay imágenes para la hoja de contacto")
    minis = []
    for ruta in imagenes:
        with Image.open(ruta) as im:
            im = im.convert("RGB")
            alto = round(im.height * ancho_mini / im.width)
            minis.append((ruta.name, im.resize((ancho_mini, alto))))
    columnas = min(columnas, len(minis))
    filas = -(-len(minis) // columnas)
    alto_celda = max(m.height for _, m in minis) + 44
    margen = 16
    lienzo = Image.new("RGB", (columnas * (ancho_mini + margen) + margen, filas * (alto_celda + margen) + margen), "#0b0612")
    dibujo = ImageDraw.Draw(lienzo)
    fuente = _fuente(22)
    for i, (nombre, mini) in enumerate(minis):
        x = margen + (i % columnas) * (ancho_mini + margen)
        y = margen + (i // columnas) * (alto_celda + margen)
        lienzo.paste(mini, (x, y))
        dibujo.text((x, y + mini.height + 8), f"{i + 1}. {nombre}", fill="#ffd23f", font=fuente)
    salida.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(salida, "JPEG", quality=85)
    return salida
