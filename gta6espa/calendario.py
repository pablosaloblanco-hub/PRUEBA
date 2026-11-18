"""Huecos libres del calendario a partir de lo que ya hay programado en Metricool.

Entrada: el JSON que devuelve getScheduledPosts, guardado en un archivo
(por defecto trabajo/programado.json). Acepta {"data": [...]} o la lista directamente.
"""
from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass
from pathlib import Path

from .reglas import reglas


@dataclass
class Programada:
    fecha: dt.datetime
    red: str
    tipo: str          # POST, STORY, REEL, SHORT…
    texto: str
    id: str

    @property
    def grupo(self) -> str:
        return "historia" if self.tipo == "STORY" else "feed"


def _tipo(post: dict, red: str) -> str:
    if red == "instagram":
        return (post.get("instagramData") or {}).get("type") or "POST"
    if red == "youtube":
        return ((post.get("youtubeData") or {}).get("type") or "video").upper()
    return "POST"


def leer_programado(ruta: Path) -> list[Programada]:
    datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
    posts = datos.get("data", datos) if isinstance(datos, dict) else datos
    salida = []
    for post in posts:
        fecha = dt.datetime.fromisoformat(post["publicationDate"]["dateTime"])
        for prov in post.get("providers", []):
            red = prov["network"]
            salida.append(Programada(fecha, red, _tipo(post, red), post.get("text", ""), str(post.get("id", ""))))
    salida.sort(key=lambda x: x.fecha)
    return salida


def _grupo_formato(formato: str) -> str:
    return "historia" if formato == "historia" else "feed"


def huecos(programado: list[Programada], desde: dt.date, dias: int, formato: str,
           redes: list[str]) -> list[dt.datetime]:
    """Horas estándar libres en las redes pedidas, respetando la separación mínima."""
    h = reglas()["horarios"]
    clave = {"carrusel": "publicacion", "suelta": "publicacion", "historia": "historia", "reel": "reel"}[formato]
    sep = dt.timedelta(minutes=h["separacion_minima_min"])
    grupo = _grupo_formato(formato)
    libres = []
    ahora = dt.datetime.now()
    for d in range(dias):
        dia = desde + dt.timedelta(days=d)
        for hora in h[clave]:
            hh, mm = map(int, hora.split(":"))
            candidato = dt.datetime.combine(dia, dt.time(hh, mm))
            if candidato <= ahora:
                continue
            choca = any(p.red in redes and p.grupo == grupo and abs(p.fecha - candidato) < sep
                        for p in programado)
            lleno = any(_cuenta_dia(programado, red, grupo, dia) >= _maximo(red, grupo) for red in redes)
            if not choca and not lleno:
                libres.append(candidato)
    return libres


def _maximo(red: str, grupo: str) -> int:
    return (reglas()["horarios"].get("maximo_diario", {}).get(red, {}) or {}).get(grupo, 99)


def _cuenta_dia(programado: list[Programada], red: str, grupo: str, dia: dt.date) -> int:
    return sum(1 for p in programado if p.red == red and p.grupo == grupo and p.fecha.date() == dia)


def excesos(programado: list[Programada]) -> list[tuple[dt.date, str, str, int]]:
    """Días en que una red supera su máximo diario (fecha, red, grupo, cuántas)."""
    vistos = {(p.fecha.date(), p.red, p.grupo) for p in programado}
    salida = []
    for dia, red, grupo in sorted(vistos):
        n = _cuenta_dia(programado, red, grupo, dia)
        if n > _maximo(red, grupo):
            salida.append((dia, red, grupo, n))
    return salida


def dias_vacios(programado: list[Programada], desde: dt.date, dias: int) -> list[dt.date]:
    """Días sin ninguna publicación de feed en Instagram o TikTok."""
    con_feed = {p.fecha.date() for p in programado if p.red in ("instagram", "tiktok") and p.grupo == "feed"}
    return [desde + dt.timedelta(days=d) for d in range(dias) if desde + dt.timedelta(days=d) not in con_feed]


def choques(programado: list[Programada]) -> list[tuple[Programada, Programada]]:
    """Parejas de piezas distintas en la misma red y grupo separadas menos de lo permitido."""
    sep = dt.timedelta(minutes=reglas()["horarios"]["separacion_minima_min"])
    malos = []
    for i, a in enumerate(programado):
        for b in programado[i + 1:]:
            if b.fecha - a.fecha >= sep:
                break
            if a.red == b.red and a.grupo == b.grupo and a.id != b.id:
                malos.append((a, b))
    return malos
