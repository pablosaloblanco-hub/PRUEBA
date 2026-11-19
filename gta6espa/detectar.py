"""Busca momentos fuertes (choques, caídas, golpes) en una grabación larga de gameplay.

Idea: un choque o una caída suena como un golpe seco, así que el nivel del audio salta
de repente. Esto busca esos saltos en el audio ORIGINAL (que luego nunca se publica)
y saca una hoja de fotogramas alrededor de cada candidato para revisarlo a ojo.
También salen disparos y portazos: el editor descarta a ojo lo que no sirva.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np

TASA = 8000
VENTANA = 0.05  # s


def niveles(video: Path) -> np.ndarray:
    """Nivel en dB de cada ventana de 50 ms del audio de la grabación."""
    cmd = ["ffmpeg", "-loglevel", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", str(TASA),
           "-f", "s16le", "-"]
    crudo = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(crudo, dtype=np.int16).astype(np.float32) / 32768
    n = int(TASA * VENTANA)
    x = x[: len(x) // n * n].reshape(-1, n)
    rms = np.sqrt((x ** 2).mean(axis=1) + 1e-10)
    return 20 * np.log10(rms)


def candidatos(db: np.ndarray, salto_db: float = 11, minimo_db: float = -32,
               separacion_s: float = 4, maximo: int = 80) -> list[dict]:
    """Saltos bruscos: nivel actual frente a la mediana del segundo anterior."""
    previo = int(1 / VENTANA)
    puntos = []
    for i in range(previo, len(db)):
        base = np.median(db[i - previo:i])
        salto = db[i] - base
        if salto >= salto_db and db[i] >= minimo_db:
            puntos.append((float(salto), i * VENTANA, float(db[i])))
    puntos.sort(reverse=True)
    elegidos: list[tuple[float, float, float]] = []
    for p in puntos:
        if all(abs(p[1] - e[1]) >= separacion_s for e in elegidos):
            elegidos.append(p)
        if len(elegidos) >= maximo:
            break
    elegidos.sort(key=lambda p: p[1])
    return [{"t": round(t, 2), "salto_db": round(s, 1), "nivel_db": round(n, 1)} for s, t, n in elegidos]


def fotogramas(video: Path, t: float, carpeta: Path, nombre: str,
               offsets=(-2.0, -1.0, -0.4, 0.0, 0.4, 1.0, 2.0)) -> list[Path]:
    carpeta.mkdir(parents=True, exist_ok=True)
    salida = []
    for k, o in enumerate(offsets):
        ruta = carpeta / f"{nombre}_{k}.jpg"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{max(t + o, 0):.2f}", "-i", str(video),
                        "-frames:v", "1", "-vf", "scale=320:-2", "-q:v", "5", str(ruta)], check=True)
        salida.append(ruta)
    return salida


def hojas(video: Path, cands: list[dict], carpeta: Path, por_hoja: int = 8) -> list[Path]:
    """Una fila por candidato (7 fotogramas de t-2 a t+2 s), 8 filas por hoja."""
    from PIL import Image, ImageDraw
    carpeta.mkdir(parents=True, exist_ok=True)
    tmp = carpeta / "fot"
    salida = []
    for h in range(0, len(cands), por_hoja):
        grupo = cands[h:h + por_hoja]
        filas = []
        for c in grupo:
            nombre = f"c{int(c['t'] * 100)}"
            filas.append((c, [Image.open(p) for p in fotogramas(video, c["t"], tmp, nombre)]))
        w, alto_f = 320, filas[0][1][0].height
        hoja = Image.new("RGB", (w * 7, (alto_f + 26) * len(filas)), "#0b0612")
        d = ImageDraw.Draw(hoja)
        for r, (c, imgs) in enumerate(filas):
            y = r * (alto_f + 26)
            m, s = divmod(c["t"], 60)
            d.text((6, y + 5), f"{int(m):02d}:{s:05.2f}  (t={c['t']} s, +{c['salto_db']} dB)  fotogramas: -2 -1 -0.4 0 +0.4 +1 +2 s",
                   fill="#ffd400")
            for k, im in enumerate(imgs):
                hoja.paste(im, (k * w, y + 26))
        ruta = carpeta / f"hoja_{h // por_hoja + 1:02d}.jpg"
        hoja.save(ruta, quality=80)
        salida.append(ruta)
    return salida


def resumen(video: Path, carpeta: Path, cada: float = 5.0, por_hoja: int = 96) -> list[Path]:
    """Un fotograma cada `cada` segundos de toda la grabación, en hojas de 12 columnas con el minuto.
    Sirve para ver de un vistazo dónde se conduce libre y dónde hay cinemáticas."""
    from PIL import Image, ImageDraw
    tmp = carpeta / "resumen"
    tmp.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-skip_frame", "nokey", "-i", str(video), "-vf",
                    f"fps=1/{cada},scale=200:-2", "-vsync", "vfr", "-q:v", "6", str(tmp / "r_%05d.jpg")], check=True)
    fotos = sorted(tmp.glob("r_*.jpg"))
    salida = []
    for h in range(0, len(fotos), por_hoja):
        grupo = fotos[h:h + por_hoja]
        im0 = Image.open(grupo[0])
        w, alto = im0.width, im0.height + 18
        hoja = Image.new("RGB", (w * 12, alto * ((len(grupo) + 11) // 12)), "#0b0612")
        d = ImageDraw.Draw(hoja)
        for k, f in enumerate(grupo):
            t = (h + k) * cada
            x, y = (k % 12) * w, (k // 12) * alto
            hoja.paste(Image.open(f), (x, y + 18))
            d.text((x + 4, y + 3), f"{int(t // 60):02d}:{int(t % 60):02d}", fill="#ffd400")
        ruta = carpeta / f"resumen_{h // por_hoja + 1:02d}.jpg"
        hoja.save(ruta, quality=82)
        salida.append(ruta)
    return salida


def _rangos(texto: str | None) -> list[tuple[float, float]]:
    """«1:20-6:40,12:00-15:30» (o en segundos) → [(80, 400), (720, 930)]."""
    if not texto:
        return []
    def seg(x):
        x = x.strip()
        if ":" in x:
            m, s_ = x.split(":")
            return int(m) * 60 + float(s_)
        return float(x)
    return [tuple(seg(v) for v in r.split("-")) for r in texto.split(",") if r.strip()]


def analizar(video: Path, carpeta: Path, maximo: int = 80, rangos: str | None = None,
             salto_db: float = 11) -> dict:
    carpeta.mkdir(parents=True, exist_ok=True)
    cache = carpeta / "niveles.npy"
    if cache.exists():
        db = np.load(cache)
    else:
        db = niveles(video)
        np.save(cache, db)
    cands = candidatos(db, salto_db=salto_db, maximo=100000 if rangos else maximo)
    rs = _rangos(rangos)
    if rs:
        cands = [c for c in cands if any(a <= c["t"] <= b for a, b in rs)]
        cands = sorted(cands, key=lambda c: -c["salto_db"])[:maximo]
        cands.sort(key=lambda c: c["t"])
    rutas = hojas(video, cands, carpeta)
    datos = {"video": str(video), "duracion_s": round(len(db) * VENTANA, 1), "candidatos": cands,
             "hojas": [str(r) for r in rutas]}
    (carpeta / "candidatos.json").write_text(json.dumps(datos, indent=1, ensure_ascii=False), encoding="utf-8")
    return datos
