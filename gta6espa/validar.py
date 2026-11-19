"""Revisión automática de textos, imágenes, vídeos y capturas antes de subir nada."""
from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from .reglas import capturas_bloqueadas, normalizar, reglas

HASHTAG = re.compile(r"#[\wÀ-ÿ]+", re.UNICODE)


@dataclass
class Hallazgo:
    nivel: str      # ERROR (bloquea) o AVISO (revisar a mano)
    donde: str
    mensaje: str

    def __str__(self) -> str:
        return f"[{self.nivel}] {self.donde}: {self.mensaje}"


def hashtags(texto: str) -> list[str]:
    return HASHTAG.findall(texto)


def validar_texto(texto: str, red: str, formato: str, donde: str | None = None) -> list[Hallazgo]:
    r = reglas()["textos"]
    donde = donde or f"texto {red}"
    h: list[Hallazgo] = []
    norm = normalizar(texto)

    if formato == "historia":
        if texto.strip():
            h.append(Hallazgo("ERROR", donde, "las historias se programan sin texto"))
        return h

    if not texto.strip():
        return [Hallazgo("ERROR", donde, "texto vacío")]

    # Crédito de las imágenes
    if normalizar(r["credito_minimo"]) not in norm:
        h.append(Hallazgo("ERROR", donde, f"falta el crédito «{r['credito_completo']}»"))
    elif red == "instagram" and normalizar(r["credito_completo"]) not in norm:
        h.append(Hallazgo("ERROR", donde, f"en Instagram va el crédito completo «{r['credito_completo']}»"))
    elif normalizar(r["credito_completo"]) not in norm:
        h.append(Hallazgo("AVISO", donde, "mejor el crédito completo «Cuenta fan · No oficial»"))

    # Hashtags
    tags = hashtags(texto)
    tags_norm = [normalizar(t) for t in tags]
    for obligatorio in r["hashtags_obligatorios"]:
        if normalizar(obligatorio) not in tags_norm:
            h.append(Hallazgo("ERROR", donde, f"falta el hashtag {obligatorio}"))
    if red == "tiktok":
        for extra in r["hashtags_tiktok_extra"]:
            if normalizar(extra) not in tags_norm:
                h.append(Hallazgo("ERROR", donde, f"falta {extra} en TikTok"))
    maximo = r["hashtags_max_instagram"] if red == "instagram" else r["hashtags_max_tiktok"]
    if len(tags) > maximo:
        h.append(Hallazgo("ERROR", donde, f"{len(tags)} hashtags; máximo {maximo}"))
    if len(set(tags_norm)) != len(tags_norm):
        h.append(Hallazgo("AVISO", donde, "hay hashtags repetidos"))

    # Longitud
    limite = r["max_caracteres_instagram"] if red == "instagram" else r["max_caracteres_tiktok"]
    if len(texto) > limite:
        h.append(Hallazgo("ERROR", donde, f"{len(texto)} caracteres; máximo {limite}"))

    # Datos prohibidos y posibles spoilers
    for frase in reglas()["frases_prohibidas"]:
        if normalizar(frase) in norm:
            h.append(Hallazgo("ERROR", donde, f"dato prohibido o antiguo: «{frase}»"))
    for palabra in reglas()["palabras_spoiler"]:
        if re.search(rf"\b{re.escape(normalizar(palabra))}\b", norm):
            h.append(Hallazgo("AVISO", donde, f"posible spoiler («{palabra}»): revisar a mano"))

    # Llamada a la acción
    if not re.search(r"coment|guarda|comparte|etiqueta|responde|dinos|vota", norm):
        h.append(Hallazgo("AVISO", donde, "no hay llamada a la acción (comenta, guarda, comparte, etiqueta)"))
    return h


def validar_imagen(ruta: Path, formato: str) -> list[Hallazgo]:
    f = reglas()["formatos"]
    donde = ruta.name
    h: list[Hallazgo] = []
    if not ruta.exists():
        return [Hallazgo("ERROR", donde, "no existe")]
    if ruta.suffix.lower() not in f["extension_imagen"]:
        h.append(Hallazgo("ERROR", donde, f"debe ser JPG (TikTok no acepta {ruta.suffix} en carruseles)"))
    mb = ruta.stat().st_size / 1_000_000
    if mb > f["tamano_max_mb"]:
        h.append(Hallazgo("ERROR", donde, f"pesa {mb:.1f} MB; máximo {f['tamano_max_mb']} MB"))
    esperado = f[formato]
    with Image.open(ruta) as im:
        if im.size != (esperado["ancho"], esperado["alto"]):
            h.append(Hallazgo("ERROR", donde,
                              f"mide {im.width}×{im.height}; debe medir {esperado['ancho']}×{esperado['alto']}"))
        if im.format != "JPEG":
            h.append(Hallazgo("ERROR", donde, f"el contenido es {im.format}, no JPEG"))
    return h


def info_video(ruta: Path) -> dict:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(ruta)],
        capture_output=True, text=True, check=True).stdout
    return json.loads(salida)


def validar_video(ruta: Path) -> list[Hallazgo]:
    f = reglas()["formatos"]
    donde = ruta.name
    if not ruta.exists():
        return [Hallazgo("ERROR", donde, "no existe")]
    h: list[Hallazgo] = []
    if ruta.suffix.lower() not in f["extension_video"]:
        h.append(Hallazgo("ERROR", donde, "debe ser MP4"))
    mb = ruta.stat().st_size / 1_000_000
    if mb > f["tamano_max_mb"]:
        h.append(Hallazgo("ERROR", donde, f"pesa {mb:.1f} MB; máximo {f['tamano_max_mb']} MB"))
    try:
        info = info_video(ruta)
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError) as e:
        return h + [Hallazgo("ERROR", donde, f"no se puede leer con ffprobe: {e}")]
    video = [s for s in info["streams"] if s.get("codec_type") == "video"]
    if not video:
        return h + [Hallazgo("ERROR", donde, "no tiene pista de vídeo")]
    v = video[0]
    esp = f["reel"]
    if (v["width"], v["height"]) != (esp["ancho"], esp["alto"]):
        h.append(Hallazgo("ERROR", donde, f"mide {v['width']}×{v['height']}; debe ser {esp['ancho']}×{esp['alto']}"))
    dur = float(info["format"].get("duration", 0))
    if not esp["duracion_min_s"] <= dur <= esp["duracion_max_s"]:
        h.append(Hallazgo("ERROR", donde, f"dura {dur:.1f} s; debe durar {esp['duracion_min_s']}–{esp['duracion_max_s']} s"))
    elif not esp["duracion_ideal_s"][0] <= dur <= esp["duracion_ideal_s"][1]:
        h.append(Hallazgo("AVISO", donde, f"dura {dur:.1f} s; lo ideal son {esp['duracion_ideal_s'][0]}–{esp['duracion_ideal_s'][1]} s"))
    if not any(s.get("codec_type") == "audio" for s in info["streams"]):
        h.append(Hallazgo("AVISO", donde, "sin audio: en TikTok se puede añadir música; en Instagram saldrá mudo"))
    return h


def validar_capturas(capturas: list[str], carpeta_capturas: Path | None = None) -> list[Hallazgo]:
    from .reglas import TRABAJO
    carpeta_capturas = carpeta_capturas or (TRABAJO / "capturas")
    c = reglas()["capturas"]
    bloqueadas = capturas_bloqueadas()
    h = []
    for cap in capturas:
        partes = Path(cap).parts
        carpeta_raiz = partes[0] if partes else ""
        if any(normalizar(p) == normalizar(x) for p in partes for x in c["carpetas_prohibidas"]):
            h.append(Hallazgo("ERROR", cap, "captura de una carpeta prohibida (Lucia/Jason)"))
        elif carpeta_raiz not in c["carpetas_permitidas"]:
            h.append(Hallazgo("ERROR", cap, f"solo se usan capturas de {', '.join(c['carpetas_permitidas'])}"))
        if cap in bloqueadas:
            h.append(Hallazgo("ERROR", cap, "captura en la lista negra (config/capturas_bloqueadas.txt)"))
        if carpeta_capturas.exists() and not (carpeta_capturas / cap).exists():
            h.append(Hallazgo("ERROR", cap, "no existe en trabajo/capturas: revisa la ruta"))
    return h


PERMISOS_VALIDOS = ("escrito", "politica")


def creadores() -> list[dict]:
    import yaml
    ruta = Path(__file__).resolve().parent.parent / "config" / "creadores.yaml"
    if not ruta.exists():
        return []
    return (yaml.safe_load(ruta.read_text(encoding="utf-8")) or {}).get("creadores") or []


def validar_clip_externo(p: dict) -> list[Hallazgo]:
    """Clips de streamers o youtubers: solo con permiso registrado y su crédito en cada texto."""
    clip = p.get("clip_externo")
    if not clip:
        return []
    h: list[Hallazgo] = []
    usuario = (clip.get("creador") or "").strip()
    ficha = next((c for c in creadores() if c.get("usuario", "").lower() == usuario.lower()), None)
    if not usuario:
        h.append(Hallazgo("ERROR", "clip externo", "falta «creador» (@usuario)"))
    elif not ficha:
        h.append(Hallazgo("ERROR", "clip externo", f"{usuario} no está en config/creadores.yaml"))
    elif ficha.get("permiso") not in PERMISOS_VALIDOS:
        h.append(Hallazgo("ERROR", "clip externo", f"{usuario} no ha dado permiso (estado: {ficha.get('permiso')})"))
    elif ficha.get("permiso") == "politica" and not ficha.get("politica_url"):
        h.append(Hallazgo("ERROR", "clip externo", f"{usuario}: falta la URL de su política de clips"))
    if not clip.get("url"):
        h.append(Hallazgo("ERROR", "clip externo", "falta la URL del clip original"))
    credito = f"clip: {usuario}".lower()
    for red in p.get("redes", []):
        if credito not in normalizar((p.get("textos") or {}).get(red, "")):
            h.append(Hallazgo("ERROR", f"texto {red}", f"falta el crédito «Clip: {usuario}»"))
    return h


def validar_pieza(p: dict) -> list[Hallazgo]:
    from .piezas import carpeta_trabajo
    h: list[Hallazgo] = validar_clip_externo(p)
    formato = p["formato"]
    if formato != "historia":
        for red in p["redes"]:
            h += validar_texto((p.get("textos") or {}).get(red, ""), red, formato)
    if "tiktok" in p["redes"] and formato != "historia":
        titulo = p.get("titulo_tiktok", "")
        maximo = reglas()["textos"]["max_caracteres_titulo_tiktok"]
        if not titulo.strip():
            h.append(Hallazgo("ERROR", "título TikTok", "vacío"))
        elif len(titulo) > maximo:
            h.append(Hallazgo("ERROR", "título TikTok", f"{len(titulo)} caracteres; máximo {maximo}"))
    medios = p.get("medios") or []
    lim = reglas()["formatos"].get(formato, {})
    if formato != "reel" and medios and not lim.get("min", 1) <= len(medios) <= lim.get("max", 99):
        h.append(Hallazgo("ERROR", "medios", f"{len(medios)} imágenes; un {formato} lleva {lim['min']}–{lim['max']}"))
    if not medios:
        h.append(Hallazgo("ERROR", "medios", "no hay medios"))
    base = carpeta_trabajo(p["id"])
    for m in medios:
        ruta = base / m
        h += validar_video(ruta) if formato == "reel" else validar_imagen(ruta, formato)
    h += validar_capturas(p.get("capturas") or [])
    if formato != "reel" and not p.get("capturas"):
        h.append(Hallazgo("AVISO", "capturas", "no se han apuntado las capturas usadas: no se pueden comprobar"))
    if not p.get("datos_usados") and formato in ("carrusel", "suelta"):
        h.append(Hallazgo("AVISO", "datos", "no se han apuntado los «Datos verificados» en los que se apoya"))
    return h
