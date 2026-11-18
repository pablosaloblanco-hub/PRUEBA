"""Construye el campo «info» de createScheduledPost de Metricool para cada red.

El agente publicador pasa el JSON resultante tal cual a la herramienta MCP.
Formato comprobado con las publicaciones que ya están programadas en la marca.
"""
from __future__ import annotations

import datetime as dt
import json
from zoneinfo import ZoneInfo

from .reglas import reglas


def url_drive(file_id: str) -> str:
    return f"https://drive.google.com/file/d/{file_id}/view?usp=drivesdk"


def _base(texto: str, media: list[str], fecha: str, red: str) -> dict:
    return {
        "autoPublish": True,
        "draft": False,
        "descendants": [],
        "firstCommentText": "",
        "hasNotReadNotes": False,
        "media": media,
        "mediaAltText": [],
        "providers": [{"network": red}],
        "publicationDate": {"dateTime": fecha, "timezone": reglas()["cuenta"]["zona_horaria"]},
        "shortener": False,
        "smartLinkData": {"ids": []},
        "text": texto,
    }


def _fecha_iso(fecha: str) -> str:
    """«2026-11-27 10:00» → «2026-11-27T10:00:00»."""
    f = fecha.strip().replace(" ", "T")
    return f if f.count(":") == 2 else f + ":00"


def info_para(p: dict, red: str) -> dict:
    if red not in p["redes"]:
        raise ValueError(f"La pieza {p['id']} no va a {red}")
    faltan = [m for m in p.get("medios", []) if m not in (p.get("drive") or {})]
    if faltan:
        raise ValueError(f"Faltan IDs de Drive de: {', '.join(faltan)}")
    media = [url_drive(p["drive"][m]) for m in p["medios"]]
    fecha = _fecha_iso(p["fecha"])
    formato = p["formato"]
    if red == "instagram":
        tipo = {"historia": "STORY", "reel": "REEL"}.get(formato, "POST")
        texto = "" if formato == "historia" else p["textos"]["instagram"]
        info = _base(texto, media, fecha, "instagram")
        info["instagramData"] = {"type": tipo, "showReelOnFeed": True, "isAiGenerated": False}
        return info
    if red == "tiktok":
        if formato == "historia":
            raise ValueError("Las historias de TikTok se suben a mano")
        info = _base(p["textos"]["tiktok"], media, fecha, "tiktok")
        info["tiktokData"] = {
            "privacyOption": "PUBLIC_TO_EVERYONE",
            "title": p["titulo_tiktok"],
            "autoAddMusic": formato != "reel",  # en los Reels ya va la música propia
            "photoCoverIndex": 0,
            "disableComment": False,
            "disableDuet": False,
            "disableStitch": False,
        }
        return info
    raise ValueError(f"Red no gestionada por Claude: {red}")


def peticiones(p: dict) -> list[dict]:
    """Una petición por red, lista para createScheduledPost (falta solo blogId)."""
    salida = []
    for red in p["redes"]:
        info = info_para(p, red)
        local = dt.datetime.fromisoformat(info["publicationDate"]["dateTime"])
        local = local.replace(tzinfo=ZoneInfo(reglas()["cuenta"]["zona_horaria"]))
        salida.append({"red": red, "date": local.isoformat(),
                       "info": json.dumps(info, ensure_ascii=False)})
    return salida
