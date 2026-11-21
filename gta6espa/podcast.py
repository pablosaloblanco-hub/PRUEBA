"""«Radio Leonida»: mini-podcast de NPC de Vice City con voces sintéticas (sección de @gta6espa).

Los presentadores son personajes ORIGINALES (vecinos de Leonida), nunca los protagonistas ni
otros personajes de la historia de Rockstar, y no imitan la voz de ninguna persona real. Las voces
son de espeak-ng + MBROLA (suenan robóticas a propósito: son «NPC»). Se avisa en pantalla y en el
texto: «Parodia fan · Voces generadas con IA».

Guion (JSON):
{
  "episodio": 1, "titulo": "Llegaron los jugadores",
  "fondo": {"fuente": "trabajo/grabaciones/g2_2106.mp4", "inicio": 52, "fin": 70},
  "personajes": {
    "mari": {"nombre": "Mari", "rol": "Batidos en Ocean Beach", "emoji": "👩🏽", "voz": "mb-es3",
             "velocidad": 155, "tono": 55, "color": "#ff4fd8"},
    "chuy": {...}
  },
  "lineas": [
    {"quien": "mari", "texto": "Buenas, Leonida…", "broll": {"inicio": 493.97, "fin": 497.6}}
  ],
  "musica": "trabajo/<id>/musica.m4a"
}
"""
from __future__ import annotations

import html
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from .efectos import ALTO, ANCHO, EMOJI, FPS, FUENTE, _Pintor, _duracion
from .reglas import reglas

CAJA = (40, 300, 640, 360)          # x, y, ancho, alto del vídeo de juego
RECORTE = (0.18, 0.12, 0.82, 0.80)  # sin brújula, minimapa ni subtítulos
PAUSA = 0.18


def _tts(texto: str, p: dict, ruta: Path) -> Path:
    crudo = ruta.with_suffix(".raw.wav")
    subprocess.run(["espeak-ng", "-v", p.get("voz", "mb-es4"), "-s", str(p.get("velocidad", 150)),
                    "-p", str(p.get("tono", 50)), "-w", str(crudo), texto], check=True,
                   capture_output=True)
    # voz «de radio»: banda telefónica suave, compresión y volumen igualado
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(crudo), "-af",
                    "highpass=f=120,lowpass=f=7000,acompressor=threshold=-18dB:ratio=3,loudnorm=I=-16:TP=-1.5",
                    "-ar", "44100", "-ac", "1", str(ruta)], check=True)
    crudo.unlink(missing_ok=True)
    return ruta


def _capa_html(g: dict, linea: dict | None) -> str:
    pers = g["personajes"]
    x, y, w, h = CAJA
    tarjetas = ""
    for k, (clave, p) in enumerate(pers.items()):
        activo = linea is not None and linea["quien"] == clave
        izq = 40 + k * 330
        estilo = (f"border:5px solid {p.get('color', '#fff')};box-shadow:0 0 28px {p.get('color', '#fff')};"
                  "transform:scale(1.06);opacity:1" if activo else
                  "border:5px solid rgba(255,255,255,.18);opacity:.55")
        tarjetas += (f'<div style="position:absolute;left:{izq}px;top:{y + h + 40}px;width:310px;height:200px;'
                     f'border-radius:26px;background:rgba(11,6,18,.82);{estilo};text-align:center">'
                     f'<div style="font-family:{EMOJI};font-size:86px;line-height:1;margin-top:14px">{p.get("emoji", "🙂")}</div>'
                     f'<div style="font-family:{FUENTE};font-size:38px;color:#fff;margin-top:6px">{html.escape(p["nombre"])}</div>'
                     f'<div style="font-family:Inter;font-weight:700;font-size:20px;color:rgba(255,255,255,.8)">'
                     f'{html.escape(p.get("rol", ""))}</div></div>')
    texto = ""
    if linea is not None:
        p = pers[linea["quien"]]
        texto = (f'<div style="position:absolute;left:40px;right:40px;top:{y + h + 280}px;height:215px;'
                 'display:flex;align-items:center;justify-content:center;text-align:center">'
                 f'<div style="font-family:{FUENTE},{EMOJI};font-size:41px;line-height:1.1;color:#fff;'
                 f'-webkit-text-stroke:5px #000;paint-order:stroke fill">'
                 f'<span style="color:{p.get("color", "#fff")}">{html.escape(p["nombre"].upper())}:</span> '
                 f'{html.escape(linea["texto"])}</div></div>')
    cabecera = (f'<div style="position:absolute;left:0;right:0;top:56px;text-align:center">'
                f'<div style="font-family:{FUENTE},{EMOJI};font-size:72px;color:#ffd400;-webkit-text-stroke:7px #000;'
                'paint-order:stroke fill;letter-spacing:-1px">RADIO LEONIDA 🎙️</div>'
                f'<div style="font-family:{FUENTE};font-size:32px;color:#fff;margin-top:8px;-webkit-text-stroke:4px #000;'
                f'paint-order:stroke fill">EP. {g["episodio"]} · {html.escape(g["titulo"].upper())}</div></div>')
    marco = (f'<div style="position:absolute;left:{x - 6}px;top:{y - 6}px;width:{w}px;height:{h}px;'
             'border:6px solid #ff4fd8;border-radius:18px"></div>'
             f'<div style="position:absolute;left:{x + 14}px;top:{y + 14}px;padding:4px 12px;border-radius:8px;'
             'background:#e0102f;color:#fff;font-family:Inter;font-weight:800;font-size:20px">● EN DIRECTO</div>')
    pie = (f'<div style="position:absolute;left:0;right:0;bottom:46px;text-align:center;font-family:Inter;'
           'font-weight:700;font-size:19px;color:rgba(255,255,255,.9);text-shadow:0 2px 4px #000">'
           '<div style="font-family:' + FUENTE + ';font-size:34px;-webkit-text-stroke:4px #000;paint-order:stroke fill;'
           'color:#fff">@gta6espa</div>'
           'Parodia fan · Voces generadas con IA · Imágenes: Rockstar Games · Cuenta fan · No oficial</div>')
    return (f'<div style="position:relative;width:{ANCHO}px;height:{ALTO}px">'
            + cabecera + marco + tarjetas + texto + pie + "</div>")


def _recorte_filtro(w: int, h: int) -> str:
    x0, y0, x1, y1 = RECORTE
    return (f"crop=iw*{x1 - x0}:ih*{y1 - y0}:iw*{x0}:ih*{y0},"
            f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps={FPS}")


def montar(ruta_guion: Path, salida: Path) -> Path:
    guion = json.loads(Path(ruta_guion).read_text(encoding="utf-8"))
    raiz = Path(__file__).resolve().parent.parent
    ruta = lambda r: Path(r) if Path(r).is_absolute() else raiz / r  # noqa: E731
    tmp = Path(tempfile.mkdtemp(prefix="podcast_"))
    try:
        # 1) voces y línea de tiempo
        tiempos, wavs, t = [], [], 0.4
        for i, ln in enumerate(guion["lineas"]):
            w = _tts(ln["texto"], guion["personajes"][ln["quien"]], tmp / f"l{i:02d}.wav")
            d = _duracion(w)
            tiempos.append((t, t + d))
            wavs.append(w)
            t += d + PAUSA
        total = t + 0.9
        # 2) capas PNG (una por línea + la de inicio)
        with _Pintor() as pintor:
            capas = [pintor._pinta(_capa_html(guion, ln), tmp / f"c{i:02d}.png", None)
                     for i, ln in enumerate(guion["lineas"])]
            vacia = pintor._pinta(_capa_html(guion, None), tmp / "c_vacia.png", None)
        # 3) vídeo de juego en la caja: fondo continuo y b-roll por línea
        fondo = guion["fondo"]
        x, y, w, h = CAJA
        bucle = tmp / "fondo.mp4"   # el tramo se extrae aparte para poder repetirlo en bucle
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(fondo["inicio"]), "-t",
                        f"{fondo['fin'] - fondo['inicio']:.2f}", "-i", str(ruta(fondo["fuente"])), "-an",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", str(bucle)], check=True)
        entradas = ["-stream_loop", "-1", "-i", str(bucle)]
        filtros = [f"[0:v]{_recorte_filtro(w, h)},eq=saturation=1.15,trim=0:{total:.2f},setpts=PTS-STARTPTS[caja0]",
                   f"[0:v]scale={ANCHO}:{ALTO}:force_original_aspect_ratio=increase,crop={ANCHO}:{ALTO},boxblur=24:2,"
                   f"eq=brightness=-0.3:saturation=1.2,fps={FPS},trim=0:{total:.2f},setpts=PTS-STARTPTS[fondo]"]
        n = 1
        ultimo = "caja0"
        for i, ln in enumerate(guion["lineas"]):
            b = ln.get("broll")
            if not b:
                continue
            a, z = tiempos[i]
            dur = max(z - a, 0.5)
            clip = tmp / f"broll_{i:02d}.mp4"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(b["inicio"]), "-t",
                            f"{b['fin'] - b['inicio']:.2f}", "-i", str(ruta(b.get("fuente", fondo["fuente"]))), "-an",
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", str(clip)], check=True)
            entradas += ["-i", str(clip)]
            vel = (b["fin"] - b["inicio"]) / dur
            filtros.append(f"[{n}:v]{_recorte_filtro(w, h)},setpts=(PTS-STARTPTS)/{vel:.3f}+{a:.3f}/TB[b{n}]")
            filtros.append(f"[{ultimo}][b{n}]overlay=0:0:eof_action=pass:enable='between(t,{a:.3f},{z:.3f})'[cj{n}]")
            ultimo = f"cj{n}"
            n += 1
        filtros.append(f"[fondo][{ultimo}]overlay={x - 6}:{y - 6}[v0]")
        entradas += ["-loop", "1", "-framerate", str(FPS), "-t", f"{total:.2f}", "-i", str(vacia)]
        filtros.append(f"[v0][{n}:v]overlay=0:0:enable='lt(t,{tiempos[0][0]:.3f})'[v1]")
        ult, n = "v1", n + 1
        for i, c in enumerate(capas):
            a = tiempos[i][0]
            z = tiempos[i + 1][0] if i + 1 < len(tiempos) else total
            entradas += ["-loop", "1", "-framerate", str(FPS), "-t", f"{total:.2f}", "-i", str(c)]
            filtros.append(f"[{ult}][{n}:v]overlay=0:0:enable='between(t,{a:.3f},{z:.3f})'[v{n}]")
            ult, n = f"v{n}", n + 1
        # 4) audio: voces en su sitio + música de fondo baja
        pistas = []
        for i, wv in enumerate(wavs):
            ms = int(tiempos[i][0] * 1000)
            entradas += ["-i", str(wv)]
            filtros.append(f"[{n}:a]adelay={ms}|{ms},apad[a{i}]")
            pistas.append(f"[a{i}]")
            n += 1
        if guion.get("musica"):
            entradas += ["-i", str(ruta(guion["musica"]))]
            filtros.append(f"[{n}:a]atrim=0:{total:.2f},asetpts=PTS-STARTPTS,volume={guion.get('volumen_musica', 0.12)},"
                           f"afade=t=out:st={max(total - 1.5, 0):.2f}:d=1.5[mus]")
            pistas.append("[mus]")
            n += 1
        filtros.append("".join(pistas) + f"amix=inputs={len(pistas)}:normalize=0:duration=longest,"
                       f"atrim=0:{total:.2f},alimiter=limit=0.95[a]")
        script = tmp / "filtros.txt"
        script.write_text(";".join(filtros))
        limite = reglas()["formatos"]["tamano_max_mb"] * 8_000_000 * 0.93
        kbps = max(int(limite / total / 1000) - 96, 250)
        salida = Path(salida)
        salida.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error"] + entradas +
                       ["-filter_complex_script", str(script), "-map", f"[{ult}]", "-map", "[a]",
                        "-c:v", "libx264", "-preset", "medium", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.4)}k",
                        "-bufsize", f"{kbps * 2}k", "-pix_fmt", "yuv420p", "-r", str(FPS),
                        "-c:a", "aac", "-b:a", "96k", "-t", f"{total:.2f}", "-movflags", "+faststart", str(salida)],
                       check=True)
        salida.with_suffix(".tiempos.json").write_text(json.dumps(
            [{"quien": ln["quien"], "desde": round(a, 2), "hasta": round(z, 2)}
             for ln, (a, z) in zip(guion["lineas"], tiempos)], ensure_ascii=False, indent=1))
        return salida
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
