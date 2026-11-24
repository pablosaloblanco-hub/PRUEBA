# Guion de montaje dinámico (`python -m gta6espa efectos guion.json salida.mp4`)

Reels de gameplay con más gancho: recopilatorios de choques y caídas, memes por encima y efectos de sonido.

## Estructura
```json
{
  "fuente": "trabajo/grabaciones/gta6_20261119_b.mp4",
  "modo": "cuadrado",
  "titulo": "LOS CHOQUES MÁS TONTOS DE GTA 6 💀",
  "musica": "trabajo/<id>/musica.m4a",
  "volumen_musica": 0.45,
  "tramos": [
    {"inicio": 1712.4, "fin": 1716.0, "contador": "#1",
     "velocidad": 1.0,
     "recorte": [0.3, 0.11, 0.7, 0.80],
     "zoom": [[1.6, 0.5, 1.35]],
     "temblor": [[1.6, 0.5, 14]],
     "destello": [1.6],
     "congelar": 0.5,
     "pegatinas": [{"texto": "BRO 💀", "t": 1.7, "dur": 1.3, "pos": [0.5, 0.45], "estilo": "meme", "giro": -6}],
     "sonidos": [{"tipo": "boom", "t": 1.6}],
     "repeticion": {"desde": 1.2, "hasta": 2.6, "velocidad": 0.4}}
  ],
  "cierre": {"texto": "¿CUÁL HA SIDO EL PEOR? 👇", "dur": 2.0}
}
```
- `inicio` / `fin`: segundos de la grabación. Cada tramo puede llevar su propia `fuente`.
- Los tiempos dentro del tramo (`t` de zoom, temblor, destello, pegatinas y sonidos) cuentan desde el inicio del tramo **ya montado** (después de la velocidad y sin contar la repetición).
- `modo`: `cuadrado` pone el vídeo en el centro sobre su propio fondo desenfocado, con el título arriba y la marca abajo; `llenar` es vertical a pantalla completa.
- `recorte` [x0, y0, x1, y1] en fracciones de la imagen original. Por defecto ya quita la brújula de arriba y la franja de subtítulos y objetivos de abajo. Muévelo en horizontal para seguir el coche.
- `zoom` [t, duración, factor]: golpe de zoom. `temblor` [t, duración, fuerza en px]. `destello` [t]: flash breve.
- `gamma`: aclara las sombras (1 = igual; 1,6–2,0 para planos de noche). También vale a nivel de guion para todos los tramos. **Regla del revisor:** un plano en el que no se entiende lo que pasa no vale; aclara o cámbialo.
- `congelar`: segundos de imagen congelada al final del tramo (buen sitio para un meme).
- `repeticion`: añade otra pasada a cámara lenta con el rótulo «REPETICIÓN 🔁» y un scratch.
- Formatos y estilos nuevos (23/11): pantalla partida (`dividido`), `cronometro`, estilos `nota` y `subtitulo`, y `repeticion` como lista. Ver `docs/formatos-reels.md`.
- Estilos de pegatina: `meme` (texto blanco con borde negro), `etiqueta` (caja de color), `bocadillo` (globo blanco), `emoji` (emoji grande), `contador`. Admiten `tam`, `color`, `giro`, `pos` [x, y] (0–1 de la pantalla), `animar` (sale con rebote; por defecto sí). Usa `\n` para partir líneas.
- Sonidos propios (sin derechos): boom, bonk, golpe, whoosh, ding, bocina, scratch, error, cristal, risas.

## Receta de un Reel con gancho (15–35 s)
1. **0–1 s:** el mejor golpe primero, con zoom, temblor, «boom» y un texto que pique («ESPERA AL #3 💀»).
2. **Tramos de 2–4 s**, cortados justo después del golpe. Nada de esperas.
3. **Un meme por momento**, en el golpe o justo antes («ESTO VA BIEN 👍» → choque → «BRO 💀»).
4. **Repetición** a cámara lenta en el mejor momento.
5. **Cierre** con una pregunta que invite a comentar.

## Memes y textos que funcionan (en español de España)
«BRO 💀», «ESTO VA BIEN 👍», «EL GPS: SIGA RECTO», «-1 COCHE», «MI SEGURO VIENDO ESTO», «NO LO VI 😭», «SKILL ISSUE», «MODO KAMIKAZE», «PLAN PERFECTO, EJECUCIÓN…», «YO CON EL CARNET RECIÉN SACADO», «POV: CONDUCES EN VICE CITY», «¿QUIÉN ME HA PUESTO ESA FAROLA?», «FÍSICAS DE GTA 6 🤡», «10/10 ATERRIZAJE».
Evita los planos con letreros de la historia (p. ej. «Brian's»), marcadores de destino de misión y coches de policía persiguiendo.
Nada de insultos ni de burlarse de colectivos. Los GIF de internet no se usan: tienen derechos. Si Pablo deja GIF propios en Drive, se pueden añadir como pegatina.
