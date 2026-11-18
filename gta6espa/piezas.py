"""Piezas de contenido: una carpeta por publicación con su ficha pieza.yaml.

Ciclo de vida:
idea → aprobada → redactada → disenada → revisada → subida → programada → publicada
(«error» y «descartada» se pueden poner en cualquier momento; volver atrás también se permite.)
Cada paso hacia delante tiene una comprobación mínima para que ningún agente se salte otro.
"""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

import yaml

from .reglas import CONTENIDO, TRABAJO, reglas

ORDEN = ["idea", "aprobada", "redactada", "disenada", "revisada", "subida", "programada", "publicada"]
ESPECIALES = ["error", "descartada"]
FORMATOS = ["carrusel", "suelta", "historia", "reel"]
REDES = ["instagram", "tiktok"]


class ErrorPieza(Exception):
    pass


def _ahora() -> str:
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M")


def carpeta(pid: str) -> Path:
    return CONTENIDO / pid


def carpeta_trabajo(pid: str) -> Path:
    return TRABAJO / pid


def ruta_ficha(pid: str) -> Path:
    return carpeta(pid) / "pieza.yaml"


# Campos con IDs privados: se guardan en trabajo/<id>/privado.yaml, nunca en el repo público.
PRIVADOS = ("drive", "metricool")


def ruta_privada(pid: str) -> Path:
    return carpeta_trabajo(pid) / "privado.yaml"


def slug(texto: str) -> str:
    from .reglas import normalizar
    s = re.sub(r"[^a-z0-9]+", "-", normalizar(texto)).strip("-")
    return s[:40] or "pieza"


def cargar(pid: str) -> dict:
    ruta = ruta_ficha(pid)
    if not ruta.exists():
        raise ErrorPieza(f"No existe la pieza «{pid}» ({ruta})")
    with open(ruta, encoding="utf-8") as f:
        p = yaml.safe_load(f)
    privada = ruta_privada(pid)
    datos = yaml.safe_load(privada.read_text(encoding="utf-8")) if privada.exists() else {}
    for campo in PRIVADOS:
        p[campo] = {**(p.get(campo) or {}), **((datos or {}).get(campo) or {})}
    return p


def guardar(p: dict) -> Path:
    ruta = ruta_ficha(p["id"])
    ruta.parent.mkdir(parents=True, exist_ok=True)
    publica = {k: ({} if k in PRIVADOS else v) for k, v in p.items()}
    with open(ruta, "w", encoding="utf-8") as f:
        yaml.safe_dump(publica, f, allow_unicode=True, sort_keys=False, width=110)
    privados = {k: p.get(k) or {} for k in PRIVADOS}
    if any(privados.values()):
        priv = ruta_privada(p["id"])
        priv.parent.mkdir(parents=True, exist_ok=True)
        priv.write_text(yaml.safe_dump(privados, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return ruta


def listar(estado: str | None = None) -> list[dict]:
    piezas = []
    if not CONTENIDO.exists():
        return piezas
    for ficha in sorted(CONTENIDO.glob("*/pieza.yaml")):
        if ficha.parent.name.startswith("_"):
            continue
        with open(ficha, encoding="utf-8") as f:
            p = yaml.safe_load(f)
        if estado is None or p.get("estado") == estado:
            piezas.append(p)
    piezas.sort(key=lambda p: (str(p.get("fecha") or "9999"), p["id"]))
    return piezas


def nueva(pid: str, titulo: str, formato: str, redes: list[str] | None = None,
          fecha: str | None = None, quien: str = "Claude", tema_hashtag: str = "") -> dict:
    if formato not in FORMATOS:
        raise ErrorPieza(f"Formato «{formato}» no válido. Usa: {', '.join(FORMATOS)}")
    if formato == "historia":
        redes = ["instagram"]  # las historias de TikTok se suben a mano
    redes = redes or list(REDES)
    for r in redes:
        if r not in REDES:
            raise ErrorPieza(f"Red «{r}» no es de Claude. YouTube es de ChatGPT según el reparto.")
    if ruta_ficha(pid).exists():
        raise ErrorPieza(f"Ya existe la pieza «{pid}»")
    p = {
        "id": pid,
        "titulo": titulo,
        "formato": formato,
        "redes": redes,
        "estado": "idea",
        "fecha": fecha,                # «AAAA-MM-DD HH:MM», hora de Madrid
        "tema_hashtag": tema_hashtag,  # el 6.º hashtag, propio del tema
        "objetivo": "",                # qué queremos que haga la gente: comentar, guardar, compartir
        "datos_usados": [],            # filas de «Datos verificados» del LÉEME en las que se apoya
        "capturas": [],                # rutas dentro del pack oficial (Places/..., People/...)
        "textos": {r: "" for r in redes if formato != "historia"},
        "titulo_tiktok": "",
        "medios": [],                  # archivos en trabajo/<id>/, en orden de publicación
        "drive": {},                   # archivo → ID de Drive
        "metricool": {},               # red → ID de la publicación programada
        "enlaces": {},                 # red → URL publicada
        "notas": "",
        "historial": [{"fecha": _ahora(), "estado": "idea", "quien": quien, "nota": "creada"}],
    }
    guardar(p)
    carpeta_trabajo(pid).mkdir(parents=True, exist_ok=True)
    return p


def _comprobar_paso(p: dict, destino: str) -> list[str]:
    """Devuelve lo que falta para poder pasar a «destino»."""
    falta = []
    if destino == "aprobada" and not p.get("fecha"):
        falta.append("fecha y hora de publicación")
    if destino == "redactada" and p["formato"] != "historia":
        for red in p["redes"]:
            if not (p.get("textos") or {}).get(red, "").strip():
                falta.append(f"texto de {red}")
        if "tiktok" in p["redes"] and not p.get("titulo_tiktok", "").strip():
            falta.append("título de TikTok")
    if destino == "disenada":
        if not p.get("medios"):
            falta.append("lista de medios")
        for m in p.get("medios", []):
            if not (carpeta_trabajo(p["id"]) / m).exists():
                falta.append(f"archivo {m} en trabajo/{p['id']}/")
    if destino == "revisada":
        from .validar import validar_pieza
        errores = [h for h in validar_pieza(p) if h.nivel == "ERROR"]
        falta += [f"corregir: {h.mensaje}" for h in errores]
        if p["formato"] != "reel" and not (carpeta_trabajo(p["id"]) / "hoja_contacto.jpg").exists():
            falta.append("hoja de contacto (python -m gta6espa hoja <id>) revisada a ojo")
    if destino == "subida":
        for m in p.get("medios", []):
            if m not in (p.get("drive") or {}):
                falta.append(f"ID de Drive de {m}")
    if destino == "programada":
        for red in p["redes"]:
            if red not in (p.get("metricool") or {}):
                falta.append(f"ID de Metricool de {red}")
    return falta


def avanzar(pid: str, destino: str, quien: str = "Claude", nota: str = "", forzar: bool = False) -> dict:
    p = cargar(pid)
    if destino not in ORDEN + ESPECIALES:
        raise ErrorPieza(f"Estado «{destino}» no válido")
    actual = p["estado"]
    if destino in ORDEN and actual in ORDEN:
        i_act, i_dest = ORDEN.index(actual), ORDEN.index(destino)
        if i_dest > i_act + 1 and not forzar:
            raise ErrorPieza(f"No se puede saltar de «{actual}» a «{destino}»: siguiente paso «{ORDEN[i_act + 1]}»")
        if i_dest > i_act:
            falta = _comprobar_paso(p, destino)
            if falta and not forzar:
                raise ErrorPieza(f"Falta para «{destino}»: " + "; ".join(falta))
    p["estado"] = destino
    p.setdefault("historial", []).append({"fecha": _ahora(), "estado": destino, "quien": quien, "nota": nota})
    guardar(p)
    return p


def actualizar(pid: str, **campos) -> dict:
    p = cargar(pid)
    for k, v in campos.items():
        if isinstance(v, dict) and isinstance(p.get(k), dict):
            p[k].update(v)
        else:
            p[k] = v
    guardar(p)
    return p


def siguiente_id() -> str:
    numeros = [int(m.group(1)) for f in CONTENIDO.glob("*/pieza.yaml")
               if (m := re.match(r"(\d+)", f.parent.name))]
    return str(max(numeros, default=18) + 1)  # la 18 fue la última del LÉEME a 18/11
