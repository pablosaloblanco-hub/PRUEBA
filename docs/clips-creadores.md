# Clips de streamers y youtubers jugando a GTA 6

**Decisión de Pablo (19/11):** no se piden permisos. Se usan en **modo cita**, la forma que reduce el riesgo:

1. **Fragmento corto:** como máximo 10 s por creador y vídeo, y 30 s de contenido ajeno en total (`config/reglas.yaml` › `clips_creadores`).
2. **Crédito siempre:** «Clip: @usuario» en todos los textos, más la URL del original en la ficha. En pantalla, una etiqueta «🎥 @usuario» mientras sale su clip.
3. **Edición propia encima:** memes, zooms, comentario y pregunta con `gta6espa/efectos.py`. Nunca se sube el clip tal cual ni varios clips seguidos sin aportar nada.
4. **Se retira si lo piden:** si un creador pide quitarlo, se retira ese mismo día, se pone `permiso: no` en `config/creadores.yaml` y no se vuelve a usar.

**Riesgo (Pablo lo asume):** aun así, YouTube (Content ID), Instagram y TikTok pueden quitar el vídeo, silenciarlo o sancionar la cuenta si el creador lo denuncia. Cuanto más corto sea el fragmento y más edición propia lleve, menos riesgo.

## Cómo se hace la pieza
- Pablo deja los clips en Drive, porque la red de las sesiones no llega a Twitch ni a YouTube. El director los descarga en `trabajo/<id>/clips/`.
- En la ficha:
  ```yaml
  clip_externo:
    - creador: "@usuario"
      url: "https://…"      # clip original
      duracion_s: 8         # segundos que usamos de ese creador
  ```
- Mismas reglas que con el gameplay de Pablo: nada de historia ni spoilers, que es casi todo lo que juegan los streamers, ni disparos, sangre, atropellos o contenido sexual.
- **Audio:** la voz y la reacción del creador pueden sonar en su fragmento. La música y la radio del juego, nunca.
- Si un creador da permiso por su cuenta o publica una política de clips, se apunta en `config/creadores.yaml` (`escrito` o `politica`) y deja de aplicar el límite de 10 s.

## Formatos que funcionan
- «Su reacción al primer choque en GTA 6»: un fragmento, un meme y una pregunta.
- «Top 3 fails de streamers»: un fragmento corto de cada uno, con su crédito.
- Dúo y Stitch en TikTok sobre el vídeo original. Lo hace Pablo desde la app y es la vía con menos riesgo.
