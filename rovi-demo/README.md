# ROVI × Close Factory — demo inmobiliaria

Snapshot de código del sandbox PROVISA, preparado el 20 de noviembre de 2026 para la rama `closefactory`. Vive en un subdirectorio: no sustituye la web The Close Factory de la raíz ni cambia su despliegue.

## Alcance

- `source/backend`: módulos del CRM FastAPI y dependencias necesarios para el adaptador; base de código 5835192.
- `source/frontend`: código React del sandbox, con correcciones de agenda, métricas, menú acotado y banner de datos sintéticos.
- `runtime`: guardas, escenario ficticio, allowlist y unidades del relay loopback.
- `public`: panel guiado, guion, onboarding por rol y guía comercial de Eduardo.
- `tests`: pruebas unitarias y arneses de integración/navegador; los que escriben/reset requieren autorización explícita por variable.
- `public-edge`: plantillas de acceso HTTPS; no contiene la clave, cookie ni archivo de usuarios efectivos.
- `compose.yaml` y `nginx.conf`: configuración de referencia del sandbox aislado.

No se incluyen credenciales, bases Mongo/SQLite, cartera de clientes, documentos subidos, chats, informes privados, imágenes de pruebas, grabaciones, `node_modules`, builds, datos de prospección ni scripts operativos heredados con credenciales. Este paquete no incluye el portal privado de archivos ni la consola SSH del administrador. La wiki técnica desplegada no se copia: el material comercial aplicable está en `public`.

## Qué demuestra

Mariana Demo → calificación humana → Broker A → visita interna → Presentación → lectura gerencial. Incluye recuperación manual de seguimiento y captura sintética de Valeria Demo con UTM e idempotencia.

No demuestra WhatsApp, campañas reales, IA autónoma, Tokko, Google, ROI, contrato o ventas de PROVISA. El panel consulta el CRM cada cinco segundos. La guía está en `public/eduardo.html`; el ensayo humano no se considera realizado por publicar el material.

## Preparación en una instalación nueva

Requisitos: Docker Engine/Compose, Node/npm compatibles con el frontend y Python 3 para pruebas. No ejecutar estos pasos encima de un despliegue existente: usa un host de pruebas o detén y respalda explícitamente el sandbox antes de reemplazarlo.

1. Instala este directorio en `/opt/rovi-provisa-demo` si vas a usar las unidades systemd incluidas. Comprueba que `10.0.11.0/24`, el nombre Compose y `127.0.0.1:9130` no estén ocupados. No ejecutes otra composición con el mismo nombre sobre la demo vigente.
2. Genera un secreto NUEVO fuera de Git, en `demo.env`, modo 600. Debe contener `JWT_SECRET=` seguido de una cadena aleatoria larga. `.env.example` documenta el formato; su valor de ejemplo no es una credencial válida de despliegue.
3. En `source/frontend`, ejecuta `npm ci --legacy-peer-deps --no-audit --no-fund`. Después ejecuta:

       REACT_APP_ENVIRONMENT=provisa-demo REACT_APP_BACKEND_URL= GENERATE_SOURCEMAP=false npm run build

4. Desde este directorio: `docker compose build backend`, seguido de `docker compose up -d`.
5. La red Docker es interna y NO publica puertos. Para el acceso local de la instalación Linux de referencia, revisa e instala las unidades `runtime/rovi-provisa-demo.socket` y `.service`, recarga systemd y habilita el socket. El relay escucha solo en `127.0.0.1:9130` y apunta al frontend fijo `10.0.11.4:80`. Esto no es una configuración universal para cualquier red/OS.
6. Entra por túnel SSH a `http://127.0.0.1:9130/demo/`. No publiques directamente esta entrada: el selector de roles del sandbox entrega sesiones de prueba deliberadamente y no es autenticación de clientes.

El backend del repositorio tiene una receta Docker para reconstruir la imagen; no requiere copiar la imagen privada del servidor. Se probó el código con la imagen backend ya instalada, no una reinstalación completa de dependencias en un host nuevo.

## Acceso público

`public-edge/gate.conf.template` necesita sustituir `__ACCESS_COOKIE__` por un secreto NUEVO y generar localmente `demo.users` (htpasswd) y `gate.conf`, ambos excluidos de Git. Esta plantilla espera la infraestructura Coolify y un relay `10.0.1.1:9132` del servidor de referencia. No basta con arrancar su Compose: requiere DNS, certificado, router TLS, red existente, relay y firewall inspeccionados por un administrador.

La puerta autentica `/access`, emite cookie protegida y preserva `Authorization: Bearer` hacia el CRM. No reemplaza un sistema completo de usuarios/SSO. Nunca publiques Mongo o backend ni retires el aislamiento para hacer funcionar el proxy. El escenario es compartido: reset afecta a todos los visitantes.

No se distribuyen contraseñas ni configuración efectiva del servidor. La publicación de esta rama no rota claves, no crea DNS y no modifica servicios.

## Pruebas del código del repositorio

Desde `rovi-demo`:

    node --test tests/launcher.test.mjs tests/presenter.test.mjs tests/frontend.test.cjs tests/demo-navigation.test.mjs tests/demo-truthfulness.test.mjs
    python3 -m unittest discover -s tests -p test_demo_runtime.py -v

El adaptador importado requiere las dependencias backend; sus pruebas se habilitan con `DEMO_IMAGE_TEST=1` dentro de un contenedor con `PROVISA_DEMO=1`, `DB_NAME=provisa_demo`, `MONGO_URL=mongodb://mongo:27017`, JWT de prueba, `PYTHONPATH=/runtime:/app`, tmpfs escribibles en `/app/uploads` y `/app/logs`, y red `none`. Monta el backend del repositorio en `/app`, runtime en `/runtime` y tests en `/tests`.

Los arneses `test_live_flow.py`, `browser-e2e.cjs` y `public-browser.cjs` crean registros y RESTAURAN el escenario. Exigen `RUN_DEMO_MUTATION_TESTS=1`; ejecutarlos solo contra un sandbox autorizado y sin presentaciones activas. No se ejecutan automáticamente al clonar ni hay un workflow CI añadido.

Los arneses de navegador necesitan Playwright y una ruta Chromium local. Las rutas del binario y la credencial pública de prueba reflejan el servidor original y deben configurarse por el operador en otro host. `commercial-onboarding.cjs` comprueba la guía sin mutar registros comerciales; sí crea una sesión sintética de evaluación.

## Saneamiento y procedencia

Se retiraron dos contraseñas compartidas predeterminadas del backend: ahora se obtienen del entorno o se generan aleatoriamente por proceso. También se retiraron cinco hashes compartidos del seed heredado; ahora se generan contraseñas aleatorias no registradas. El formulario interno de alta de usuario ya no precarga una contraseña. Esto solo cambia la copia publicada, no el servicio vigente.

`docs/source-manifest.json` registra hashes de los archivos de origen para distinguir copia, adaptación de rutas y saneamiento. No contiene sus secretos. Los resultados de pruebas de esta exportación se documentan en `docs/VERIFICATION.md`; no equivalen a una auditoría universal ni al ensayo de Eduardo.
