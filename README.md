# Abelardo Q: Horizonte Silencioso — build WebGL (v4)

Juego de vuelo de Totem Studio («Vuela bajo. Esquiva las rocas. Completa la misión.»), publicado originalmente en https://abelardoq.totemstudio.es/v4/

Este repositorio contiene la **build WebGL completa y desplegable** tal y como se sirve en producción (carpeta `/v4/`), más las adaptaciones descritas abajo. **No contiene el código fuente de Unity** (proyecto, escenas editables ni scripts .cs): eso no es público; aquí está el resultado compilado.

- Motor: Unity 6000.3.7f1 (Unity 6.3), WebGL, IL2CPP → WebAssembly
- Producto: `Abelardo Q: Horizonte Silencioso`, versión 1.3.3
- Despliegue de prueba en Vercel: https://abelardoq-v4.vercel.app

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | Plantilla WebGL de Unity personalizada por Totem Studio |
| `Build/` | El juego compilado: loader JS, framework JS, WASM y datos (`.unityweb`, comprimidos en Brotli) |
| `TemplateData/` | Recursos de la plantilla de Unity (CSS, favicon, barra de carga) |
| `presentation/` | Capa de presentación propia: CSS, logo, imagen de fondo y la capa de mando |
| `escenarios/` | Escenarios adicionales en versión web (Three.js, autocontenidos): `amazonas.html` (selva amazónica) y `los-angeles.html` (ciudad de Los Ángeles). No son niveles del juego Unity: son páginas web enlazadas desde la página principal, con el mismo esquema de vuelo (teclado y mando) y partida completa en cada uno: 20 billetes recogibles, obstáculos con choque que acaban la partida, anillo dorado final, cronómetro, puntuación, música de fondo sintetizada y pantalla de evaluación final «MISIÓN CUMPLIDA» con estrellas (1-3) y mejor puntaje guardado. El Amazonas añade sistema de 3 vidas: atropellar un guacamayo cuesta una vida (sin vidas se acaba la partida) y atravesar las copas de los árboles produce crujido de follaje |
| `vercel.json` | Cabeceras para servir la build en Vercel (ver «Despliegue») |

Peso total: ~91 MB. El fichero grande es `Build/*.data.unityweb` (83,5 MB en Brotli; 112,7 MB descomprimido).

## Despliegue

Es un sitio **100% estático, sin backend**: vale cualquier hosting de archivos (Hostinger, Vercel, Netlify, Cloudflare Pages, nginx…). Requisitos:

1. Servir los `.unityweb` con la cabecera `Content-Encoding` que corresponda a su compresión. En este repo van en **Brotli** (`Content-Encoding: br`). En el Hostinger de origen se servían igual desde su CDN.
2. Servir el `.wasm.unityweb` con `Content-Type: application/wasm` para que el navegador haga compilación *streaming* del WebAssembly.
3. HTTPS (Brotli y la Gamepad API lo requieren en la práctica).

En Vercel no hay que configurar nada más: el `vercel.json` incluido ya declara esas cabeceras.

## Controles

- **Teclado (PC):** WASD o flechas para volar y navegar los menús (es el control original del juego).
- **Móvil:** giroscopio (original del juego; en Opciones se elige «Flechas» o «Giroscopio»).
- **Mando (añadido en este repo):** `presentation/gamepad.js` es una capa web que usa la Gamepad API del navegador y traduce el mando a las teclas que el juego ya entiende. No modifica el código Unity compilado.

### Mapeo del mando (PlayStation DualSense / DualShock y compatibles)

| Mando | Equivale a |
|---|---|
| Stick izquierdo | Flechas + WASD |
| Cruceta (D-pad) | Flechas + WASD |
| X (Cross) | Enter + clic en el centro de la pantalla (p. ej. botón «INICIAR») |
| Círculo | Escape |
| Options | Escape |

Al conectar el mando, la página muestra una pastilla de estado («Mando conectado: …»). Conectar por USB o Bluetooth; en Chrome/Edge el mando se activa al pulsar cualquier botón una primera vez.

## Notas

- La build incluye los paquetes Unity Visual Scripting, TextMeshPro, Timeline, AI Navigation y Newtonsoft.Json, además del código propio compilado (`AbelardoQ.Game.dll`, `AbelardoQ.Flight.dll`).
- `StreamingAssets` no se usa: todo el contenido va empaquetado en la build.
