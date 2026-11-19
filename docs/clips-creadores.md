# Clips de streamers y youtubers jugando a GTA 6

Pablo quiere publicar también momentos de streamers y youtubers famosos jugando. Se puede, pero **solo con permiso**.
Subir el vídeo de otro sin autorización infringe sus derechos. Además, YouTube (Content ID), Instagram y TikTok lo detectan y quitan el vídeo, silencian el audio o sancionan la cuenta.

## Cómo se consigue el permiso (lo hace Pablo a mano)
1. El agente `comunidad` prepara el mensaje: quiénes somos, qué clip, cómo le daremos crédito y qué edición haremos.
2. Pablo lo manda por DM o correo desde su cuenta. Los agentes nunca escriben a nadie.
3. Si dice que sí, se guarda la captura o el correo en `trabajo/permisos/<usuario>.*` (no se sube) y se pone `permiso: escrito` en `config/creadores.yaml`.
4. Algunos creadores publican que permiten clips con crédito. Eso vale como `permiso: politica`, con la URL en `politica_url`. El agente `investigador` comprueba la fuente.

## Cómo se hace la pieza
- El clip lo descarga Pablo (o lo deja en Drive) en `trabajo/<id>/clips/`. La red de las sesiones no llega a Twitch ni a YouTube.
- Se apunta en la ficha:
  ```yaml
  clip_externo:
    creador: "@usuario"
    url: "https://…"          # clip original
  ```
- Los textos llevan siempre «Clip: @usuario» además del crédito habitual. El validador no deja pasar la pieza sin permiso registrado ni sin ese crédito.
- La edición tiene que aportar algo, con nuestros memes, zooms, pregunta y reacción (`gta6espa/efectos.py`). Nunca se sube el vídeo tal cual.
- Duración: lo que permita el creador (por defecto, 30 s como máximo).
- Las mismas reglas que con el gameplay de Pablo: nada de historia ni spoilers (los streamers juegan sobre todo misiones: casi todo queda fuera), ni disparos, sangre, atropellos o contenido sexual.
- El audio del creador (su voz y su reacción) se puede mantener **solo si el permiso lo cubre**. La música y la radio del juego, nunca.

## Formatos que funcionan
- «Su reacción al primer choque en GTA 6» (clip corto + meme + pregunta).
- «Top 3 fails de streamers esta semana» (varios creadores, cada uno con su permiso y su crédito).
- Dúo y Stitch en TikTok sobre el vídeo original. Eso lo hace Pablo desde la app: usa la función oficial y no necesita descargar nada.
