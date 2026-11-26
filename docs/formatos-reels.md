# Catálogo de formatos de Reel (rotar: nunca el mismo formato dos veces seguidas)

Todos se montan con `python -m gta6espa efectos guion.json salida.mp4` (`docs/guion-efectos.md`) y siguen las mismas reglas: gancho en el primer segundo, sin historia ni nada de lo que está en `docs/lecciones-revisor.md`.

| # | Formato | Cómo se monta | Gancho tipo |
|---|---|---|---|
| A | **Recopilatorio de choques/físicas** | 4–7 golpes, memes y repetición | «ESPERA AL #4 💀» |
| B | **Top 5 / cuenta atrás** | `contador` del #5 al #1, el mejor al final | «¿CUÁL ES EL #1?» |
| C | **Expectativa vs realidad** | tramo con `"dividido": {"arriba": {...}, "abajo": {...}}` (modo `llenar`): arriba algo bonito o épico y abajo el desastre. Etiquetas «EXPECTATIVA ✨» y «REALIDAD 💀» | «Lo que creía que iba a pasar…» |
| D | **¿Lo consigue?** | se congela justo antes del final (`congelar`), «¿LO CONSIGUE? 🤔» y 3-2-1 con pegatinas, y se revela | «Comenta SÍ o NO antes de verlo 👇» |
| E | **Contrarreloj: ¿cuánto duro sin chocar?** | `"cronometro": {"desde": 0, "hasta": <golpe>, "etiqueta": "SIN CHOCAR"}`; el contador se para en el golpe | «Récord: X segundos. ¿Lo superas?» |
| F | **Nota del 1 al 10** | cada clip con su sello `estilo: "nota"` («3/10», «10/10») | «Puntúo mis peores aparcamientos» |
| G | **POV narrado** | historia en primera persona con `estilo: "subtitulo"` («POV: tu primer día con el carnet…») | «POV: …» |
| H | **Ironía: el único que conduce bien** | calma + memes de buen conductor + desastre final | «Espera al final 💀» |
| I | **El fail desde 3 velocidades** | un solo golpe y `"repeticion": [ {...0,5x}, {...0,25x} ]` con zoom creciente | «Míralo otra vez… y otra» |
| J | **Vida diaria absurda en Leonida** | tiendas, gimnasio, jacuzzi, aparcar: lo cotidiano hecho desastre | «Cosas que solo pasan en Vice City» |
| K | **Relax / paseo bonito** (1 de cada 10 como mucho) | planos bonitos, sin memes y música tranquila; un texto sereno y un final con guiño | «Vice City a las 19:00 🌅» |
| L | **Secretos de Leonida** (con grabación hecha a propósito, ver `docs/secretos-leonida.md`) | gancho con el hallazgo en 1 s, ruta rápida (mapa o trayecto acelerado con `velocidad`), llegada y revelación con `zoom` + `destello` y pegatina `etiqueta` con la zona («📍 GRASSRIVERS»); cierre «GUÁRDALO 📌 para cuando juegues» | «Nadie conoce este sitio de GTA 6 🤫» / «El secreto que Rockstar escondió en…» |
| M | **Guía paso a paso** (misión secreta, encargo o easter egg; datos del `investigador`) | portada «CÓMO HACER…» + 4–7 pasos numerados con `estilo: "subtitulo"` sobre la grabación de Pablo; requisitos al principio y recompensa al final; «GUÁRDALO 📌» | «La misión secreta que casi nadie ha hecho en GTA 6 🤫» |

En el L se permite ver un arma escondida y el momento de recogerla (nunca disparar ni apuntar), y de las misiones secundarias solo dónde empiezan. Busca guardados: el texto pide guardar y comentar qué secreto quieren a continuación.

Estilos de pegatina: `meme`, `etiqueta`, `bocadillo`, `emoji`, `contador`, `nota` (sello redondo) y `subtitulo` (narrador). Una lista de `repeticion` hace varias pasadas.
