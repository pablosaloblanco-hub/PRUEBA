"""Carga de las reglas de la cuenta y rutas del proyecto."""
from __future__ import annotations

import functools
import os
import unicodedata
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
CONTENIDO = RAIZ / "contenido"
TRABAJO = Path(os.environ.get("GTA6_TRABAJO", RAIZ / "trabajo"))
REGLAS_YAML = RAIZ / "config" / "reglas.yaml"


@functools.lru_cache(maxsize=1)
def reglas() -> dict:
    with open(REGLAS_YAML, encoding="utf-8") as f:
        return yaml.safe_load(f)


def normalizar(texto: str) -> str:
    """Minúsculas y sin tildes, para comparar frases sin depender de la escritura."""
    sin_tildes = unicodedata.normalize("NFKD", texto)
    sin_tildes = "".join(c for c in sin_tildes if not unicodedata.combining(c))
    return " ".join(sin_tildes.lower().split())


def capturas_bloqueadas() -> set[str]:
    ruta = RAIZ / reglas()["capturas"]["lista_negra"]
    if not ruta.exists():
        return set()
    bloqueadas = set()
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.split(" # ")[0].strip()
        if linea and not linea.startswith("#"):
            bloqueadas.add(linea)
    return bloqueadas
