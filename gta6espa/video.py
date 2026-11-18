"""Montaje de Reels/TikToks verticales con ffmpeg.

- Recorta cada clip a 9:16 y lo escala a 720×1280 (los Reels de Claude van en 720p).
- Quita SIEMPRE el audio original (los tráileres llevan canciones con licencia).
- Añade la música propia si se indica, con fundido al final.
- Ajusta la tasa de bits para no pasar del límite de subida a Drive.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from .reglas import reglas
from .validar import info_video


def duracion(ruta: Path) -> float:
    return float(info_video(ruta)["format"]["duration"])


def _filtro_clip(i: int, inicio: float | None, fin: float | None, ancho: int, alto: int) -> str:
    recorte = ""
    if inicio is not None or fin is not None:
        partes = []
        if inicio is not None:
            partes.append(f"start={inicio}")
        if fin is not None:
            partes.append(f"end={fin}")
        recorte = f"trim={':'.join(partes)},setpts=PTS-STARTPTS,"
    return (f"[{i}:v]{recorte}scale={ancho}:{alto}:force_original_aspect_ratio=increase,"
            f"crop={ancho}:{alto},setsar=1,fps=30[v{i}]")


def montar(clips: list[dict], salida: Path, musica: Path | None = None,
           duracion_max: float | None = None) -> Path:
    """clips: [{"ruta": "...", "inicio": 2.0, "fin": 6.5}, ...] (inicio y fin opcionales)."""
    f = reglas()["formatos"]
    ancho, alto = f["reel"]["ancho"], f["reel"]["alto"]
    duracion_max = duracion_max or f["reel"]["duracion_max_s"]
    entradas, filtros = [], []
    total = 0.0
    for i, c in enumerate(clips):
        ruta = Path(c["ruta"])
        entradas += ["-i", str(ruta)]
        filtros.append(_filtro_clip(i, c.get("inicio"), c.get("fin"), ancho, alto))
        d = duracion(ruta)
        total += min(c.get("fin") or d, d) - (c.get("inicio") or 0)
    total = min(total, duracion_max)
    n = len(clips)
    filtros.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[vout]")
    mapas = ["-map", "[vout]"]
    audio_kbps = 0
    if musica:
        entradas += ["-i", str(musica)]
        fundido = max(total - 1.5, 0)
        filtros.append(f"[{n}:a]atrim=0:{total},afade=t=out:st={fundido}:d=1.5,asetpts=PTS-STARTPTS[aout]")
        mapas += ["-map", "[aout]", "-c:a", "aac", "-b:a", "96k"]
        audio_kbps = 96
    limite_bits = f["tamano_max_mb"] * 8_000_000 * 0.92
    salida.parent.mkdir(parents=True, exist_ok=True)
    for factor in (1.0, 0.8, 0.6):
        video_kbps = max(int(limite_bits / max(total, 1) / 1000 * factor) - audio_kbps, 300)
        cmd = (["ffmpeg", "-y", "-loglevel", "error"] + entradas +
               ["-filter_complex", ";".join(filtros)] + mapas +
               ["-c:v", "libx264", "-preset", "medium", "-b:v", f"{video_kbps}k",
                "-maxrate", f"{int(video_kbps * 1.2)}k", "-bufsize", f"{video_kbps * 2}k",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-t", f"{total:.2f}",
                str(salida)])
        subprocess.run(cmd, check=True)
        if salida.stat().st_size <= f["tamano_max_mb"] * 1_000_000:
            break
    return salida


def portada(video: Path, salida: Path, segundo: float = 1.0) -> Path:
    """Fotograma JPG para usar como portada del Reel."""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(segundo), "-i", str(video),
                    "-frames:v", "1", "-q:v", "3", str(salida)], check=True)
    return salida
