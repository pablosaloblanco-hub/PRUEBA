# Sección «Radio Leonida» (mini-podcast de NPC con IA)

Pablo la propuso el 21/11. Es un mini-podcast vertical de 45–60 s: dos vecinos de Vice City comentan el caos de los jugadores, con el gameplay de Pablo en la pantalla del estudio.

## Reglas
- **Personajes inventados** (NPC de Leonida). Nunca Lucia, Jason ni otros personajes de la historia de Rockstar: sería poner palabras en su boca y arriesga spoilers.
- **Voces sintéticas propias** (espeak-ng + MBROLA). No se imita la voz de ninguna persona real, ni de los actores del juego.
- Se avisa siempre:
  - en pantalla: «Parodia fan · Voces generadas con IA»;
  - en todos los textos: «Parodia fan · Voces generadas con IA · Personajes inventados, no son de Rockstar».
  - La ficha lleva `ia: true`: el validador exige el aviso y `payload` marca el contenido como IA en Instagram, TikTok y YouTube.
- **Contenido:** lo que se ve en nuestros Reels y en las partidas de Pablo, con humor y sin historia, spoilers, insultos ni datos sin verificar.
- Cada episodio termina con una **pregunta del día** para los comentarios.

## Reparto fijo
| Personaje | Quién es | Voz |
|---|---|---|
| Mari 👩🏽 | Vende batidos en Ocean Beach. Lista, irónica | mb-es3, velocidad 158, tono 58 |
| Chuy 🧔🏻 | Taxista sin taxi desde el lanzamiento. Víctima de los jugadores | mb-es4, velocidad 150, tono 42 |

## Cómo se hace un episodio
1. Guion en `trabajo/<id>/guion_podcast.json` (formato en `gta6espa/podcast.py`): de 12 a 16 frases cortas (como mucho, dos líneas en pantalla) y `broll` con tramos ya aprobados de la grabación.
2. Música de fondo propia: `musica.py 75 88 <tono>` → `musica.m4a`.
3. `python3 -c "from gta6espa import podcast; podcast.montar(...)"`: como máximo 60 s.
4. Hoja de fotogramas, revisión y visto bueno de Pablo para los primeros episodios.
