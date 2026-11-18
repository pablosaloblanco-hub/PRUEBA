"""Prepara las capturas oficiales de Rockstar para la plantilla.

Extrae del pack oficial solo las carpetas permitidas (Places y People), se salta las
prohibidas y la lista negra, y redimensiona a 1920 px. La carpeta resultante es GTA6_ASSETS.
Las capturas nunca se suben al repositorio (es público): viven en trabajo/capturas/.
"""
from __future__ import annotations

import zipfile
from pathlib import Path, PurePosixPath

from PIL import Image

from .reglas import TRABAJO, capturas_bloqueadas, normalizar, reglas


def _ruta_relativa(nombre_zip: str) -> PurePosixPath | None:
    """Ruta dentro del pack a partir de la carpeta Places/People, o None si no vale."""
    partes = PurePosixPath(nombre_zip).parts
    if any(p in ("..", "") for p in partes) or nombre_zip.startswith("/"):
        return None
    permitidas = reglas()["capturas"]["carpetas_permitidas"]
    for i, p in enumerate(partes):
        if p in permitidas:
            return PurePosixPath(*partes[i:])
    return None


def preparar(pack_zip: Path, destino: Path | None = None) -> dict:
    destino = destino or (TRABAJO / "capturas")
    c = reglas()["capturas"]
    prohibidas = [normalizar(x) for x in c["carpetas_prohibidas"]]
    bloqueadas = capturas_bloqueadas()
    resumen = {"copiadas": 0, "saltadas_prohibidas": 0, "saltadas_lista_negra": 0, "destino": str(destino)}
    with zipfile.ZipFile(pack_zip) as z:
        for info in z.infolist():
            if info.is_dir() or not info.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            if any(normalizar(p) in prohibidas for p in PurePosixPath(info.filename).parts):
                resumen["saltadas_prohibidas"] += 1
                continue
            rel = _ruta_relativa(info.filename)
            if rel is None:
                resumen["saltadas_prohibidas"] += 1
                continue
            rel_jpg = rel.with_suffix(".jpg")
            if str(rel) in bloqueadas or str(rel_jpg) in bloqueadas:
                resumen["saltadas_lista_negra"] += 1
                continue
            salida = destino / rel_jpg
            salida.parent.mkdir(parents=True, exist_ok=True)
            with z.open(info) as f, Image.open(f) as im:
                im = im.convert("RGB")
                ancho = c["ancho_redimensionado"]
                if im.width > ancho:
                    im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
                im.save(salida, "JPEG", quality=90)
            resumen["copiadas"] += 1
    return resumen


def listar(destino: Path | None = None) -> list[str]:
    destino = destino or (TRABAJO / "capturas")
    bloqueadas = capturas_bloqueadas()
    return sorted(str(p.relative_to(destino)) for p in destino.rglob("*.jpg")
                  if str(p.relative_to(destino)) not in bloqueadas)
