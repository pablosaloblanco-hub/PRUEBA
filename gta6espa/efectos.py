"""Montaje dinámico de Reels de gameplay: zooms de golpe, temblor, destellos, cámara lenta,
congelados, pegatinas de meme animadas, emojis y efectos de sonido propios.

Se describe con un guion JSON (ver `docs/guion-efectos.md`):

{
  "fuente": "trabajo/grabaciones/gta6_20261119_b.mp4",
  "modo": "cuadrado",                     # cuadrado (fondo desenfocado + título) | llenar (9:16)
  "titulo": "LOS CHOQUES MÁS TONTOS 💀",  # solo modo cuadrado, arriba todo el vídeo
  "musica": "trabajo/<id>/musica.m4a", "volumen_musica": 0.45,
  "tramos": [
    {"inicio": 1712.4, "fin": 1716.0, "velocidad": 1.0, "recorte": [0.22, 0, 0.78, 1],
     "zoom": [[1.6, 0.5, 1.35]], "temblor": [[1.6, 0.5, 14]], "destello": [1.6],
     "congelar": 0.6, "contador": "#1",
     "pegatinas": [{"texto": "BRO 💀", "t": 1.7, "dur": 1.3, "pos": [0.5, 0.4], "estilo": "meme"}],
     "sonidos": [{"tipo": "boom", "t": 1.6}]},
    ...
  ],
  "cierre": {"texto": "¿CUÁL HA SIDO EL PEOR? 👇", "dur": 2.2}
}

Los tiempos de cada tramo (zoom, temblor, pegatinas, sonidos) son del vídeo YA montado
(después de aplicar la velocidad), contando desde el principio de ese tramo.
El audio original NUNCA se usa: solo música propia y estos efectos.
"""
from __future__ import annotations

import html
import json
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

from .reglas import reglas

ANCHO, ALTO, FPS = 720, 1280, 30
SR = 44100
ZONA_CUADRADO = (290, 1010)
ALTO_FACECAM = 520                    # modo streamer: alto de la franja de la cámara del creador          # franja vertical donde va el vídeo en modo cuadrado
FUENTE = "'Inter Display Black','Inter Display','Inter',sans-serif"
EMOJI = "'Noto Color Emoji'"


# ---------------------------------------------------------------- sonidos propios
def _env(n, ataque=0.005, caida=0.3):
    t = np.arange(n) / SR
    return np.minimum(t / max(ataque, 1e-4), 1) * np.exp(-t / caida)


def _paso_bajo(x, corte):
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def _sweep(f0, f1, dur, forma="sin"):
    n = int(SR * dur)
    f = np.geomspace(f0, f1, n)
    fase = 2 * np.pi * np.cumsum(f) / SR
    if forma == "saw":
        return 2 * ((fase / (2 * np.pi)) % 1) - 1
    if forma == "square":
        return np.sign(np.sin(fase))
    return np.sin(fase)


def _sonido_crudo(tipo: str) -> np.ndarray:
    rng = np.random.default_rng(len(tipo))
    if tipo == "boom":       # golpe grave de meme
        n = int(SR * 1.3)
        x = _sweep(70, 32, 1.3) * _env(n, 0.004, 0.45)
        x += 0.5 * _paso_bajo(rng.standard_normal(n), 300) * _env(n, 0.001, 0.06)
        return np.tanh(2.2 * x) * 0.9
    if tipo == "bonk":
        n = int(SR * 0.25)
        x = _sweep(620, 260, 0.25) * _env(n, 0.001, 0.07)
        x += 0.4 * rng.standard_normal(n) * _env(n, 0.0005, 0.008)
        return np.tanh(1.5 * x) * 0.8
    if tipo == "golpe":
        n = int(SR * 0.45)
        x = _paso_bajo(rng.standard_normal(n), 900) * 3 * _env(n, 0.001, 0.09)
        x += _sweep(110, 45, 0.45) * _env(n, 0.002, 0.15)
        return np.tanh(1.8 * x) * 0.85
    if tipo == "whoosh":
        n = int(SR * 0.55)
        ruido = rng.standard_normal(n)
        x = _paso_bajo(ruido, 2500) - _paso_bajo(ruido, 400)
        t = np.linspace(0, 1, n)
        return x * np.sin(np.pi * t) ** 2 * 1.6
    if tipo == "ding":
        n = int(SR * 0.9)
        t = np.arange(n) / SR
        x = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1320, 1), (2640, 0.4), (3960, 0.15)))
        return x * _env(n, 0.002, 0.3) * 0.45
    if tipo == "bocina":     # bocina de estadio
        n = int(SR * 1.0)
        t = np.arange(n) / SR
        vib = 1 + 0.01 * np.sin(2 * np.pi * 6 * t)
        x = sum(2 * ((f * vib * t) % 1) - 1 for f in (466, 554, 698))
        golpes = ((t % 0.25) < 0.19).astype(float)
        x = _paso_bajo(x * golpes, 3500)
        return np.tanh(x * 0.6) * 0.6 * np.minimum(t / 0.01, 1) * np.minimum((1.0 - t) / 0.05, 1)
    if tipo == "scratch":
        n = int(SR * 0.4)
        t = np.linspace(0, 1, n)
        x = _paso_bajo(rng.standard_normal(n), 1800) * np.abs(np.sin(2 * np.pi * 7 * t ** 1.5)) * 2.5
        return np.tanh(x) * 0.7
    if tipo == "error":
        n = int(SR * 0.45)
        return _sweep(150, 120, 0.45, "square") * _env(n, 0.003, 0.4) * 0.3
    if tipo == "cristal":
        n = int(SR * 0.7)
        t = np.arange(n) / SR
        x = rng.standard_normal(n) * _env(n, 0.0005, 0.05)
        x += sum(np.sin(2 * np.pi * f * t) * _env(n, 0.001, 0.15 + k * 0.05) * 0.25
                 for k, f in enumerate((2900, 3700, 4600, 5300)))
        return x * 0.6
    if tipo == "risas":      # «ja ja» sintético (sin voces reales)
        n = int(SR * 0.9)
        t = np.arange(n) / SR
        golpes = ((t % 0.15) < 0.09).astype(float)
        x = _sweep(380, 300, 0.9, "saw") * golpes
        return _paso_bajo(x, 1400) * 0.5 * np.minimum((0.9 - t) / 0.1, 1)
    raise ValueError(f"Sonido desconocido: {tipo}")


def sonido(tipo: str) -> np.ndarray:
    """Efecto de sonido propio, con el pico limitado a 0,9 para que no sature."""
    x = _sonido_crudo(tipo)
    pico = float(np.abs(x).max()) or 1.0
    return x * min(1.0, 0.9 / pico)


SONIDOS = ("boom", "bonk", "golpe", "whoosh", "ding", "bocina", "scratch", "error", "cristal", "risas")


def guardar_wav(x: np.ndarray, ruta: Path) -> Path:
    datos = (np.clip(x, -1, 1) * 32000).astype(np.int16)
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(datos.tobytes())
    return ruta


# ---------------------------------------------------------------- pegatinas (PNG)
def _css_pegatina(estilo: str, tam: int, color: str) -> str:
    texto = f"font-family:{FUENTE},{EMOJI};font-size:{tam}px;line-height:1.02;text-transform:uppercase;letter-spacing:-1px;"
    if estilo == "meme":
        return texto + ("color:%s;-webkit-text-stroke:%dpx #000;paint-order:stroke fill;"
                        "text-shadow:0 6px 0 rgba(0,0,0,.55);padding:10px 14px;" % (color or "#fff", max(tam // 9, 5)))
    if estilo == "etiqueta":
        return texto + (f"color:#fff;background:{color or '#ff2d55'};padding:10px 22px 12px;border-radius:14px;"
                        "border:5px solid #000;box-shadow:8px 8px 0 #000;")
    if estilo == "bocadillo":
        return texto + ("color:#111;background:#fff;padding:14px 26px;border-radius:40px;border:5px solid #000;"
                        "box-shadow:7px 7px 0 rgba(0,0,0,.6);text-transform:none;letter-spacing:0;")
    if estilo == "emoji":
        return f"font-family:{EMOJI};font-size:{tam}px;line-height:1;padding:6px;"
    if estilo == "contador":
        return texto + (f"color:#000;background:{color or '#ffd400'};padding:4px 16px 6px;border-radius:10px;"
                        "border:4px solid #000;")
    raise ValueError(f"Estilo de pegatina desconocido: {estilo}")


TAM_POR_ESTILO = {"meme": 86, "etiqueta": 58, "bocadillo": 46, "emoji": 150, "contador": 48}


def _marco_html(titulo: str, modo: str) -> str:
    t = html.escape(titulo)
    arriba, abajo = ZONA_CUADRADO
    franjas = ""
    if modo == "cuadrado":
        franjas = (f'<div style="position:absolute;left:0;top:0;width:{ANCHO}px;height:{arriba}px;'
                   'background:linear-gradient(180deg,rgba(11,6,18,.92),rgba(11,6,18,.55))"></div>'
                   f'<div style="position:absolute;left:0;top:{abajo}px;width:{ANCHO}px;height:{ALTO - abajo}px;'
                   'background:linear-gradient(0deg,rgba(11,6,18,.95),rgba(11,6,18,.55))"></div>'
                   f'<div style="position:absolute;left:30px;right:30px;top:0;height:{arriba}px;display:flex;'
                   'align-items:center;justify-content:center;text-align:center">'
                   f'<div style="font-family:{FUENTE},{EMOJI};font-size:58px;line-height:1.02;color:#fff;'
                   'text-transform:uppercase;letter-spacing:-1px;-webkit-text-stroke:6px #000;paint-order:stroke fill;'
                   f'text-shadow:0 5px 0 #ff2d55">{t}</div></div>')
    pie_top = abajo + 70 if modo == "cuadrado" else ALTO - 150
    if modo == "streamer":
        pie_top = ALTO - 120
    pie = (f'<div style="position:absolute;left:0;width:{ANCHO}px;top:{pie_top}px;text-align:center;'
           f'font-family:{FUENTE};color:#fff">'
           '<div style="font-size:40px;letter-spacing:1px;-webkit-text-stroke:4px #000;paint-order:stroke fill">@gta6espa</div>'
           '<div style="font-family:Inter;font-weight:700;font-size:19px;margin-top:8px;color:rgba(255,255,255,.85);'
           'text-shadow:0 2px 4px #000">Gameplay PS5 · Imágenes: Rockstar Games · Cuenta fan · No oficial</div></div>')
    return franjas + pie


class _Pintor:
    """Renderiza pegatinas y marcos a PNG transparente con Chromium (emojis en color)."""

    def __enter__(self):
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()
        import os
        exe = next((c for c in ("/opt/pw-browsers/chromium", "/usr/bin/google-chrome") if os.path.exists(c)), None)
        if exe and os.path.isdir(exe):
            exe = next((str(x) for x in Path(exe).rglob("chrome") if x.is_file()), None)
        self._nav = self._pw.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe else self._pw.chromium.launch()
        self._pag = self._nav.new_page(viewport={"width": ANCHO, "height": ALTO}, device_scale_factor=1)
        return self

    def __exit__(self, *exc):
        self._nav.close()
        self._pw.stop()

    def _pinta(self, cuerpo: str, ruta: Path, elemento: str | None) -> Path:
        self._pag.set_content('<html><body style="margin:0;background:transparent">' + cuerpo + "</body></html>")
        self._pag.wait_for_timeout(60)
        if elemento:
            self._pag.locator(elemento).screenshot(path=str(ruta), omit_background=True)
        else:
            self._pag.screenshot(path=str(ruta), omit_background=True)
        return ruta

    def pegatina(self, p: dict, ruta: Path) -> Path:
        estilo = p.get("estilo", "meme")
        tam = int(p.get("tam") or TAM_POR_ESTILO[estilo])
        ancho_max = int(p.get("ancho_max", 640))
        texto = html.escape(p["texto"]).replace("\\n", "<br>").replace("\n", "<br>")
        cuerpo = (f'<div id="s" style="display:inline-block;max-width:{ancho_max}px;text-align:center;'
                  f'{_css_pegatina(estilo, tam, p.get("color", ""))}">{texto}</div>')
        return self._pinta(f'<div style="padding:24px;display:inline-block" id="caja">{cuerpo}</div>', ruta, "#caja")

    def marco(self, titulo: str, modo: str, ruta: Path) -> Path:
        return self._pinta(f'<div style="position:relative;width:{ANCHO}px;height:{ALTO}px">{_marco_html(titulo, modo)}</div>',
                           ruta, None)


# ---------------------------------------------------------------- vídeo por tramos
def _dim(ruta: Path) -> tuple[int, int]:
    s = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                        "-of", "csv=p=0", str(ruta)], capture_output=True, text=True, check=True).stdout.strip()
    w, h = s.split(",")[:2]
    return int(w), int(h)


def _duracion(ruta: Path) -> float:
    s = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)],
                       capture_output=True, text=True, check=True).stdout.strip()
    return float(s)


def _par(x: float) -> int:
    return max(2, int(round(x / 2)) * 2)


def _filtro_tramo(tr: dict, modo: str, ancho_src: int, alto_src: int) -> str:
    vel = float(tr.get("velocidad", 1.0))
    if modo == "llenar":
        lado = 0.73 * alto_src * 9 / 16 / ancho_src
        def_rec = [0.5 - lado / 2, 0.07, 0.5 + lado / 2, 0.80]
    else:
        # cuadrado sin la brújula de arriba (7 %) ni la franja de subtítulos y objetivos de abajo (20 %)
        lado = 0.73 * alto_src / ancho_src
        def_rec = [0.5 - lado / 2, 0.07, 0.5 + lado / 2, 0.80]
    x0, y0, x1, y1 = tr.get("recorte") or def_rec
    cw, ch = _par((x1 - x0) * ancho_src), _par((y1 - y0) * alto_src)
    cx, cy = int(x0 * ancho_src), int(y0 * alto_src)
    if modo == "llenar":
        w, h = ANCHO, ALTO
        escala = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    elif modo == "streamer":
        w, h = ANCHO, ALTO - ALTO_FACECAM
        escala = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    else:
        w = ANCHO
        h = min(_par(ANCHO * ch / cw), ZONA_CUADRADO[1] - ZONA_CUADRADO[0] + 120)
        escala = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
    cadena = [f"crop={cw}:{ch}:{cx}:{cy}", f"setpts=(PTS-STARTPTS)/{vel}", f"fps={FPS}", escala, "setsar=1"]

    zooms = tr.get("zoom") or []
    if zooms:
        partes = "+".join(f"({f}-1)*clip(min((it-{t})/0.06,({t}+{d}+0.25-it)/0.25),0,1)" for t, d, f in zooms)
        cadena.append(f"zoompan=z='1+{partes}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={w}x{h}:fps={FPS}")
    temblores = tr.get("temblor") or []
    if temblores:
        env = "+".join(f"{a}*between(t,{t},{t}+{d})*(1-(t-{t})/{d})" for t, d, a in temblores)
        margen = max(a for _, _, a in temblores) * 2 + 4
        cadena.append(f"scale={w + margen}:{_par(h * (w + margen) / w)}")
        cadena.append(f"crop={w}:{h}:x='(iw-ow)/2+({env})*sin(t*53)':y='(ih-oh)/2+({env})*cos(t*41)'")
    brillo = "+".join(f"0.32*exp(-pow((t-{t})*10,2))" for t in (tr.get("destello") or [])) or "0"
    gamma = float(tr.get("gamma", 1.0))  # >1 aclara las sombras (planos de noche: 1,6–2,0)
    cadena.append(f"eq=saturation=1.18:contrast=1.06:gamma={gamma}:brightness='{brillo}':eval=frame")
    congelar = float(tr.get("congelar", 0))
    if congelar > 0:
        cadena.append(f"tpad=stop_mode=clone:stop_duration={congelar}")
    contenido = ",".join(cadena)
    if modo == "llenar":
        return f"[0:v]{contenido},format=yuv420p[v]"
    if modo == "streamer":
        fx0, fy0, fx1, fy1 = tr.get("facecam") or [0.0, 0.0, 0.3, 0.3]
        fw, fh = _par((fx1 - fx0) * ancho_src), _par((fy1 - fy0) * alto_src)
        cara = [f"crop={fw}:{fh}:{int(fx0 * ancho_src)}:{int(fy0 * alto_src)}", f"setpts=(PTS-STARTPTS)/{vel}",
                f"fps={FPS}", f"scale={ANCHO}:{ALTO_FACECAM}:force_original_aspect_ratio=increase",
                f"crop={ANCHO}:{ALTO_FACECAM}", "setsar=1", "eq=saturation=1.1:contrast=1.04"]
        if congelar > 0:
            cara.append(f"tpad=stop_mode=clone:stop_duration={congelar}")
        return (f"[0:v]split[a][b];[a]{contenido}[juego];[b]{','.join(cara)}[cara];"
                f"[cara][juego]vstack=inputs=2,format=yuv420p[v]")
    arriba, abajo = ZONA_CUADRADO
    y = arriba + ((abajo - arriba) - h) // 2
    return (f"[0:v]{contenido},split[c][f];"
            f"[f]scale={ANCHO}:{ALTO}:force_original_aspect_ratio=increase,crop={ANCHO}:{ALTO},boxblur=22:2,"
            f"eq=brightness=-0.22:saturation=1.2[fondo];"
            f"[fondo][c]overlay=0:{y}:shortest=1,format=yuv420p[v]")


def _audio_tramo(tr: dict, fuente: Path, ruta: Path) -> Path | None:
    """Voz del creador en su fragmento (solo clips externos con «audio»: true). Nunca la radio ni la música."""
    if not tr.get("audio"):
        return None
    ini, fin = float(tr["inicio"]), float(tr["fin"])
    vel = float(tr.get("velocidad", 1.0))
    filtro = f"atempo={vel}" if 0.5 <= vel <= 2 and vel != 1 else "anull"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{ini:.3f}", "-t", f"{fin - ini:.3f}", "-i", str(fuente),
                    "-vn", "-ac", "1", "-ar", str(SR), "-af", filtro, str(ruta)], check=True)
    return ruta


def _render_tramo(tr: dict, fuente: Path, modo: str, ruta: Path) -> float:
    ancho_src, alto_src = _dim(fuente)
    ini, fin = float(tr["inicio"]), float(tr["fin"])
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{ini:.3f}", "-t", f"{fin - ini:.3f}", "-i", str(fuente),
           "-filter_complex", _filtro_tramo(tr, modo, ancho_src, alto_src), "-map", "[v]", "-an",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-r", str(FPS), str(ruta)]
    subprocess.run(cmd, check=True)
    return _duracion(ruta)


def _expandir(guion: dict) -> list[dict]:
    """Aplica «repeticion» (otra pasada a cámara lenta) y el cierre como tramos normales."""
    tramos = []
    for tr in guion["tramos"]:
        tr = dict(tr)
        if "gamma" not in tr and guion.get("gamma"):
            tr["gamma"] = guion["gamma"]
        rep = tr.pop("repeticion", None)
        tramos.append(tr)
        if rep:
            vel = rep.get("velocidad", 0.4)
            nuevo = {"inicio": tr["inicio"] + rep.get("desde", 0), "fin": tr["inicio"] + rep.get("hasta", tr["fin"] - tr["inicio"]),
                     "fuente": tr.get("fuente"), "recorte": tr.get("recorte"), "velocidad": vel, "gamma": tr.get("gamma", 1.0),
                     "zoom": [[0, 99, rep.get("zoom", 1.25)]], "congelar": rep.get("congelar", 0),
                     "pegatinas": [{"texto": rep.get("texto", "REPETICIÓN 🔁"), "t": 0, "dur": 99, "pos": [0.5, 0.31],
                                    "estilo": "etiqueta", "tam": 40, "color": "#ff2d55", "animar": False}]
                                  + rep.get("pegatinas", []),
                     "sonidos": [{"tipo": "scratch", "t": 0}] + rep.get("sonidos", [])}
            tramos.append(nuevo)
    cierre = guion.get("cierre")
    if cierre and tramos:
        ultimo = tramos[-1]
        extra = float(cierre.get("dur", 2.0))
        ultimo["congelar"] = float(ultimo.get("congelar", 0)) + extra
        ultimo["_cierre"] = {"texto": cierre["texto"], "dur": extra}
    return tramos


def montar(ruta_guion: Path, salida: Path) -> Path:
    guion = json.loads(Path(ruta_guion).read_text(encoding="utf-8"))
    base_dir = Path(ruta_guion).resolve().parent
    raiz = Path(__file__).resolve().parent.parent

    def ruta(r):
        r = Path(r)
        if r.is_absolute():
            return r
        return (raiz / r) if (raiz / r).exists() else (base_dir / r)

    modo = guion.get("modo", "cuadrado")
    tramos = _expandir(guion)
    tmp = Path(tempfile.mkdtemp(prefix="efectos_"))
    try:
        partes, inicios, t = [], [], 0.0
        for i, tr in enumerate(tramos):
            fuente = ruta(tr.get("fuente") or guion["fuente"])
            p = tmp / f"tramo_{i:02d}.mp4"
            d = _render_tramo(tr, fuente, modo, p)
            tr["_audio"] = _audio_tramo(tr, fuente, tmp / f"voz_{i:02d}.wav")
            partes.append(p)
            inicios.append(t)
            t += d
        total = t
        lista = tmp / "lista.txt"
        lista.write_text("".join(f"file '{p}'\n" for p in partes))
        base = tmp / "base.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lista),
                        "-c", "copy", str(base)], check=True)

        # pegatinas y marco
        capas = []  # (png, desde, hasta, pos, animar, giro)
        with _Pintor() as pintor:
            marco = pintor.marco(guion.get("titulo", ""), modo, tmp / "marco.png")
            for i, tr in enumerate(tramos):
                fin_tramo = inicios[i + 1] if i + 1 < len(inicios) else total
                if tr.get("contador"):
                    png = pintor.pegatina({"texto": tr["contador"], "estilo": "contador"}, tmp / f"cont_{i}.png")
                    y = {"cuadrado": (ZONA_CUADRADO[0] + 46) / ALTO, "streamer": (ALTO_FACECAM + 40) / ALTO}.get(modo, 0.16)
                    capas.append((png, inicios[i], fin_tramo, (0.15, y), True, 0))
                for k, pg in enumerate(tr.get("pegatinas", [])):
                    png = pintor.pegatina(pg, tmp / f"peg_{i}_{k}.png")
                    desde = inicios[i] + float(pg.get("t", 0))
                    hasta = min(desde + float(pg.get("dur", 1.2)), fin_tramo)
                    capas.append((png, desde, hasta, tuple(pg.get("pos", (0.5, 0.45))), pg.get("animar", True),
                                  float(pg.get("giro", 0))))
                if tr.get("_cierre"):
                    c = tr["_cierre"]
                    png = pintor.pegatina({"texto": c["texto"], "estilo": "etiqueta", "tam": 56, "color": "#ff2d55"},
                                          tmp / "cierre.png")
                    capas.append((png, total - c["dur"], total, (0.5, 0.5), True, -3))

        entradas = ["-i", str(base), "-loop", "1", "-framerate", str(FPS), "-t", f"{total:.3f}", "-i", str(marco)]
        filtros = ["[0:v][1:v]overlay=0:0:shortest=1[m0]"]
        ultimo, n_in = "m0", 2
        for k, (png, desde, hasta, (px, py), animar, giro) in enumerate(capas):
            dur = max(hasta - desde, 0.1)
            entradas += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", str(png)]
            cad = f"[{n_in}:v]format=rgba"
            if giro or animar:
                bamboleo = f"+0.04*sin((t-{desde:.3f})*9)" if animar else ""
                cad += f",rotate=a='{giro}*PI/180{bamboleo}':c=none:ow='hypot(iw,ih)':oh=ow"
            cad += f",setpts=PTS-STARTPTS+{desde:.3f}/TB"
            if animar:
                L = f"(t-{desde:.3f})"
                s = f"if(lt({L},0.12),0.35+{L}/0.12*0.8,if(lt({L},0.22),1.15-({L}-0.12)/0.1*0.15,1))"
                cad += f",scale=w='max(2,trunc(iw*{s}/2)*2)':h='max(2,trunc(ih*{s}/2)*2)':eval=frame"
            filtros.append(cad + f"[p{k}]")
            filtros.append(f"[{ultimo}][p{k}]overlay=x='{px}*W-overlay_w/2':y='{py}*H-overlay_h/2':eof_action=pass[m{k + 1}]")
            ultimo, n_in = f"m{k + 1}", n_in + 1

        # audio: música + efectos
        pistas = []
        if guion.get("musica"):
            entradas += ["-i", str(ruta(guion["musica"]))]
            vol = guion.get("volumen_musica", 0.45)
            fundido = max(total - 1.2, 0)
            filtros.append(f"[{n_in}:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS,volume={vol},"
                           f"afade=t=out:st={fundido:.3f}:d=1.2[mus]")
            pistas.append("[mus]")
            n_in += 1
        for i, tr in enumerate(tramos):
            if tr.get("_audio"):
                ms = int(inicios[i] * 1000)
                entradas += ["-i", str(tr["_audio"])]
                filtros.append(f"[{n_in}:a]volume={tr.get('volumen_audio', 1.0)},adelay={ms}|{ms},apad[voz{i}]")
                pistas.append(f"[voz{i}]")
                n_in += 1
        cache = {}
        k = 0
        for i, tr in enumerate(tramos):
            sons = list(tr.get("sonidos", []))
            if tr.get("_cierre"):
                sons.append({"tipo": "ding", "t": None})
            for sn in sons:
                tipo = sn["tipo"]
                if tipo not in cache:
                    cache[tipo] = guardar_wav(sonido(tipo), tmp / f"sfx_{tipo}.wav")
                cuando = (total - tr["_cierre"]["dur"]) if sn.get("t") is None else inicios[i] + float(sn["t"])
                ms = max(int(cuando * 1000), 0)
                entradas += ["-i", str(cache[tipo])]
                filtros.append(f"[{n_in}:a]volume={sn.get('vol', 1.0)},adelay={ms}|{ms},apad[s{k}]")
                pistas.append(f"[s{k}]")
                n_in += 1
                k += 1
        mapas = ["-map", f"[{ultimo}]"]
        audio_kbps = 0
        if pistas:
            filtros.append("".join(pistas) + f"amix=inputs={len(pistas)}:normalize=0:duration=longest,"
                           f"atrim=0:{total:.3f},alimiter=limit=0.9[a]")
            mapas += ["-map", "[a]", "-c:a", "aac", "-b:a", "96k"]
            audio_kbps = 96
        f = reglas()["formatos"]
        limite_bits = f["tamano_max_mb"] * 8_000_000 * 0.93
        salida = Path(salida)
        salida.parent.mkdir(parents=True, exist_ok=True)
        script = tmp / "filtros.txt"
        script.write_text(";".join(filtros))
        for factor in (1.0, 0.85, 0.7):
            kbps = max(int(limite_bits / max(total, 1) / 1000 * factor) - audio_kbps, 300)
            cmd = (["ffmpeg", "-y", "-loglevel", "error"] + entradas +
                   ["-filter_complex_script", str(script)] + mapas +
                   ["-c:v", "libx264", "-preset", "medium", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.3)}k",
                    "-bufsize", f"{kbps * 2}k", "-pix_fmt", "yuv420p", "-r", str(FPS), "-t", f"{total:.3f}",
                    "-movflags", "+faststart", str(salida)])
            subprocess.run(cmd, check=True)
            if salida.stat().st_size <= f["tamano_max_mb"] * 1_000_000:
                break
        (salida.with_suffix(".tramos.json")).write_text(
            json.dumps({"total_s": round(total, 2), "inicios": [round(x, 2) for x in inicios]}, indent=1))
        return salida
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def portada(video: Path, texto: str, salida: Path, t: float = 1.0, color: str = "#ffd400") -> Path:
    """Portada JPG 1080×1920 para el Reel: un fotograma del vídeo y 2–4 palabras enormes.

    Va en la cuadrícula de Instagram y como miniatura de YouTube y TikTok (videoThumbnailUrl).
    """
    tmp = Path(tempfile.mkdtemp(prefix="portada_"))
    try:
        foto = tmp / "f.jpg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1",
                        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-q:v", "2",
                        str(foto)], check=True)
        import base64
        b64 = base64.b64encode(foto.read_bytes()).decode()
        txt = html.escape(texto).replace("\\n", "<br>").replace("\n", "<br>")
        cuerpo = (f'<div style="position:relative;width:1080px;height:1920px;background:url(data:image/jpeg;base64,{b64}) center/cover">'
                  '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,6,18,.15) 30%,rgba(11,6,18,.75) 100%)"></div>'
                  '<div style="position:absolute;left:50px;right:50px;top:560px;text-align:center;'
                  f'font-family:{FUENTE},{EMOJI};font-size:150px;line-height:.95;text-transform:uppercase;letter-spacing:-3px;'
                  f'color:{color};-webkit-text-stroke:14px #000;paint-order:stroke fill;text-shadow:0 12px 0 rgba(0,0,0,.6);'
                  f'transform:rotate(-3deg)">{txt}</div>'
                  '<div style="position:absolute;left:0;right:0;bottom:120px;text-align:center;font-family:Inter;font-weight:800;'
                  'font-size:44px;color:#fff;-webkit-text-stroke:5px #000;paint-order:stroke fill">@gta6espa</div></div>')
        png = tmp / "p.png"
        with _Pintor() as pintor:
            pintor._pag.set_viewport_size({"width": 1080, "height": 1920})
            pintor._pinta(cuerpo, png, None)
        salida = Path(salida)
        salida.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(png), "-q:v", "3", str(salida)], check=True)
        return salida
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
