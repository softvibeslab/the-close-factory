# Graph Report - the-close-factory  (2026-11-10)

## Corpus Check
- Corpus is ~41,033 words - fits in a single context window. You may not need a graph.

## Summary
- 229 nodes · 353 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 1% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.83)
- Token cost: 503,573 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Infraestructura, QA y publicación|Infraestructura, QA y publicación]]
- [[_COMMUNITY_Lógica JS de la landing|Lógica JS de la landing]]
- [[_COMMUNITY_Landing v2 «La Línea»|Landing v2 «La Línea»]]
- [[_COMMUNITY_Análisis las 8 fugas|Análisis: las 8 fugas]]
- [[_COMMUNITY_Diorama isométrico|Diorama isométrico]]
- [[_COMMUNITY_Sistema de diseño y piloto|Sistema de diseño y piloto]]
- [[_COMMUNITY_Benchmark del mercado|Benchmark del mercado]]
- [[_COMMUNITY_Geometría del generador SVG|Geometría del generador SVG]]
- [[_COMMUNITY_Incrustador de enlaces WhatsApp|Incrustador de enlaces WhatsApp]]
- [[_COMMUNITY_Script de publicación|Script de publicación]]

## God Nodes (most connected - your core abstractions)
1. `THE CLOSE FACTORY landing (index.html)` - 16 edges
2. `Plan de rediseño — THE CLOSE FACTORY` - 13 edges
3. `Análisis — theclosefactory.vercel.app` - 12 edges
4. `DESIGN.md — «La Línea»` - 12 edges
5. `Benchmark de landings CRM/IA/consultoría inmobiliaria` - 11 edges
6. `Ocho fugas` - 10 edges
7. `README THE CLOSE FACTORY` - 9 edges
8. `theclosefactory.vercel.app (versión pública Next.js)` - 9 edges
9. `Calculadora de fuga (pico emocional)` - 9 edges
10. `Diorama isométrico La Línea` - 9 edges

## Surprising Connections (you probably didn't know these)
- `qa_funcional.cjs (pruebas de interacción Playwright)` --semantically_similar_to--> `Pruebas de la calculadora (node:test)`  [INFERRED] [semantically similar]
  tools/qa_funcional.cjs → tests/calc.test.mjs
- `publicar.sh (rsync al VPS con respaldo)` --references--> `THE CLOSE FACTORY landing (index.html)`  [INFERRED]
  deploy/publicar.sh → index.html
- `THE CLOSE FACTORY landing (index.html)` --references--> `Favicon «C.» lima sobre azul noche`  [EXTRACTED]
  index.html → favicon.svg
- `Hero con diorama isométrico` --references--> `svg/linea.svg (diorama: banda, estaciones, torre, grúa, tickets SMIL)`  [EXTRACTED]
  index.html → tools/gen_linea_svg.py
- `ETAPAS (4 estaciones de la línea)` --shares_data_with--> `La línea (sección sticky con estaciones y sellos)`  [INFERRED]
  main.js → index.html

## Hyperedges (group relationships)
- **Conversión por WhatsApp con origen y campaña UTM** — main_concampana, main_wahref, main_mensaje, incrustar_linea_wa, calc_mensajefuga, index_whatsapp_diagnostico, readme_atribucion_origen_utm [INFERRED 0.85]
- **Pipeline del diorama: generar SVG, incrustar en el hero, pausar con reduced-motion** — gen_linea_svg_script, linea_svg, incrustar_linea_script, index_hero_diorama, main_reduced_motion_fallback [EXTRACTED 1.00]
- **Calculadora de fuga: UI, lógica pura, pruebas y QA** — index_calculadora_de_fuga, main_recalcular, calc_calcularfuga, calc_mensajefuga, calc_test_suite, qa_funcional_script [INFERRED 0.95]
- **La v2 «La Línea» cierra las fugas del análisis** — plan_rediseno_calculadora_de_fuga, plan_rediseno_formulario_whatsapp, plan_rediseno_atribucion_utm, plan_rediseno_seo_compartir, analisis_fuga_3_atribucion_cta, analisis_fuga_4_sin_evidencia, analisis_fuga_6_un_solo_whatsapp [EXTRACTED 1.00]
- **Movimiento firma: línea sticky + ticket manila + sello por estación** — plan_rediseno_la_linea, design_linea_sticky, design_ticket, design_sello, design_prefers_reduced_motion [EXTRACTED 1.00]
- **Atribución de diagnósticos por campaña (UTM → mensaje WhatsApp)** — kit_lanzamiento_enlaces_utm, plan_rediseno_atribucion_utm, analisis_fuga_3_atribucion_cta, analisis_diagnostico_whatsapp [INFERRED 0.85]
- **Fugas resueltas por mecanismos de la v2 «La Línea»** — index_v2_la_linea, index_seo_indexacion, index_imagen_compartir_og, index_atribucion_origen_utm, index_linea_interactiva, index_formulario_tres_campos, index_calculadora_fuga [EXTRACTED 1.00]
- **Comparativa Antes/Ahora con capturas y vista previa por dispositivo** — index_antes_ahora, antes_hero_vercel, ahora_hero_v2, index_device_preview [EXTRACTED 1.00]
- **Flujo de conversión a WhatsApp: llamados, origen, formulario y respuesta** — index_whatsapp_cta, index_atribucion_origen_utm, index_formulario_tres_campos, index_fuga_06_whatsapp_unico, ahora_whatsapp_sin_responder [INFERRED 0.75]
- **Embudo comercial como línea de producción (leads → estaciones → desarrollo)** — linea_tickets_prospectos, linea_banda_transportadora, linea_estaciones, linea_torre_desarrollo [EXTRACTED 1.00]
- **Caso Grupo Zamna como prueba social (logo + equipo + Prana Towers)** — grupo_zamna_logo, zamna_prana_foto_equipo, zamna_prana_prana_towers [INFERRED 0.85]

## Communities (10 total, 2 thin omitted)

### Community 0 - "Infraestructura, QA y publicación"
Cohesion: 0.07
Nodes (44): calcularFuga(), limitar(), mensajeFuga(), Pruebas de la calculadora (node:test), /analisis/ noindex (X-Robots-Tag + robots.txt), nginx vhost closefactory.softvibes.art, Favicon «C.» lima sobre azul noche, caja() (caja isométrica de tres caras) (+36 more)

### Community 1 - "Lógica JS de la landing"
Cohesion: 0.07
Nodes (39): entrada, msg, r, calcularFuga(), limitar(), mensajeFuga(), calcForm, campana (+31 more)

### Community 2 - "Landing v2 «La Línea»"
Cohesion: 0.08
Nodes (39): Diorama isométrico de la línea (estaciones → edificio), Etapas Captura · Calificación · Seguimiento · Cierre, Captura Ahora: hero de la v2 «La Línea», Burbuja WhatsApp «Sin responder · 9 h», Captura Antes: hero de theclosefactory.vercel.app, Panel DEMO ilustrativo «Todo el seguimiento. Un solo lugar.», Análisis de la página pública (29-oct-2026), Antes / Ahora: de plantilla SaaS a línea de producción (+31 more)

### Community 3 - "Análisis: las 8 fugas"
Cohesion: 0.08
Nodes (38): Análisis — theclosefactory.vercel.app, analisis/index.html (versión navegable del análisis), Copia local index.html (rediseñada), Diagnóstico comercial por WhatsApp (único cierre), Fuga 1: no aparece en buscadores (noindex, sin sitemap/robots), Fuga 2: sin og:image ni favicon al reenviar, Fuga 3: seis CTA, un solo mensaje (sin atribución), Fuga 5: «Conocer el sistema» no lleva al sistema (+30 more)

### Community 4 - "Diorama isométrico"
Cohesion: 0.14
Nodes (18): tools/gen_linea_svg.py, Logo Grupo Zamna (Real Estate | Technology | Interiors), tools/incrustar_linea.py, Banda transportadora (belt + 21 costillas), Diorama isométrico La Línea, Estación 01 · Captura, Cuatro estaciones / pórticos con lámpara (station-g data-n 1-4), Grúa de construcción (crane + brazo + cable) (+10 more)

### Community 5 - "Sistema de diseño y piloto"
Cohesion: 0.18
Nodes (18): Fuga 4: pide medición y no muestra ninguna, Piloto controlado (línea base, KPIs, criterio de salida), DESIGN.md — «La Línea», Accesibilidad (foco 3px, aria-live, contraste AA), Big Shoulders Display (display), Principio: contraste de turnos (noche/papel), IBM Plex Sans / Mono (texto y etiquetas), Principio: la experiencia es la demo (+10 more)

### Community 6 - "Benchmark del mercado"
Cohesion: 0.17
Nodes (16): Benchmark de landings CRM/IA/consultoría inmobiliaria, Agentes Inteligentes (IA voz/WhatsApp), Hueco: capa de proceso agnóstica (proceso + IA + red de brokers), EasyBroker, Entrada por situación segmentada por audiencia, Fénix Consultants (descartada), Hueco: nadie deja medir la fuga ni publica un piloto con criterio, Kommo (vertical inmobiliario) (+8 more)

### Community 7 - "Geometría del generador SVG"
Cohesion: 0.47
Nodes (5): caja(), p(), poly(), Genera el diorama isométrico del hero (svg/linea.svg).  Uso: python3 -I tools/ge, Tres caras visibles: superior, frente x1 y frente y1.

## Ambiguous Edges - Review These
- `closefactory.softvibes.art (dominio definitivo)` → `DESPLIEGUES.log (publicado 2026-10-29 ×2)`  [AMBIGUOUS]
  deploy/DESPLIEGUES.log · relation: conceptually_related_to
- `Atribución por origen («Vengo de: …» + utm_campaign/utm_source)` → `Calculadora de fuga`  [AMBIGUOUS]
  analisis/index.html · relation: shares_data_with

## Knowledge Gaps
- **46 isolated node(s):** `nf`, `mxn`, `toggle`, `nav`, `open` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `closefactory.softvibes.art (dominio definitivo)` and `DESPLIEGUES.log (publicado 2026-10-29 ×2)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Atribución por origen («Vengo de: …» + utm_campaign/utm_source)` and `Calculadora de fuga`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **Why does `THE CLOSE FACTORY landing (index.html)` connect `Infraestructura, QA y publicación` to `Landing v2 «La Línea»`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `Grupo Zamna (master broker, respaldo)` connect `Landing v2 «La Línea»` to `Infraestructura, QA y publicación`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Plan de rediseño — THE CLOSE FACTORY` connect `Análisis: las 8 fugas` to `Sistema de diseño y piloto`, `Benchmark del mercado`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Plan de rediseño — THE CLOSE FACTORY` (e.g. with `Entrada por situación segmentada por audiencia` and `DESPLIEGUES.log (publicado 2026-10-29 ×2)`) actually correct?**
  _`Plan de rediseño — THE CLOSE FACTORY` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `nf`, `mxn`, `toggle` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._