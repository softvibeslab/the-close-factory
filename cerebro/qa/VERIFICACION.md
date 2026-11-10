# Verificación — Close Factory · Cerebro (2026-11-10)

Fuentes (rutas relativas a la raíz del repo; `brain.config.json` usa `root: ".."`):

| Categoría | Rutas | Notas |
|---|---|---|
| Estrategia y análisis | README.md, docs/analisis.md, docs/inventario-previo.md, docs/plan-rediseno.md | 4 |
| Benchmark del mercado | docs/benchmark.md | 1 |
| Diseño y lanzamiento | docs/DESIGN.md, docs/kit-lanzamiento.md | 2 |
| Grafo graphify (wiki) | graphify-out/wiki/ (20) + graphify-out/GRAPH_REPORT.md | 21 |

Resultado del build: 28 notas, 40 conexiones (23 enlaces explícitos y 17 menciones de título completo), 0 avisos.

- API `/api/graph`: 28 IDs únicos, 0 aristas con extremos inexistentes y el nombre correcto.
- `/api/node`: se leyó una nota por categoría y el texto coincide con el original. Los originales no se modificaron.
- Servidor solo en 127.0.0.1:4647; un intento de recorrer rutas fuera de la app devuelve 404.
- Navegador headless (Playwright, `qa/check.cjs` y `qa/check2.cjs`):
  - El nombre aparece en el título, la cabecera y el panel de crecimiento.
  - Búsqueda: «fugas» devuelve resultados.
  - Inventario: muestra las 4 fuentes.
  - Al ocultar «Grafo» quedan 7 notas; al mostrarlo de nuevo, 28.
  - Play demo: el orbe se ve desde el primer cuadro y las ramas salen de sus nodos padre. Arrastrar y hacer zoom no detiene el crecimiento, que llega a 28/28 (unos 42 s en headless) y ofrece Replay.
  - Cinema funciona.
  - En el viewport de 390 px se ven Sources, Play demo y Cinema.
  - 0 errores de consola.
- Sin verificar: movimiento reducido y pausa/reanudar.
- Detalle de la plantilla: en móvil, el titular queda muy pegado a la barra de búsqueda.
- La mayoría de los wikilinks de la wiki de graphify apuntan a conceptos sin artículo propio: quedan como «enlaces rotos», no se inventan aristas.

Regenerar tras actualizar el grafo: `/graphify . --update` y `graphify export wiki` en la raíz, después `node build.mjs` en `cerebro/`. Para correr las pruebas: `NODE_PATH=<carpeta con playwright> node qa/check2.cjs qa` con el servidor levantado.
