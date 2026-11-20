# Verificación de la exportación a closefactory

Corte: 20 de noviembre de 2026. Validación local de la copia exportada; no certifica producción ni un despliegue nuevo.

Resultados obtenidos:

- Compilación React del código exportado: exit 0, `Compiled with warnings`, reutilizando dependencias instaladas mediante un enlace local ignorado que NO se versiona.
- Node: 10 pruebas aprobadas sobre el código del repositorio (panel, guía del presentador, menú, agenda y métricas honestas).
- Backend: 7 pruebas aprobadas dentro de la imagen instalada, montando el backend exportado, el adaptador y tests, con `--network none`. Se usaron tmpfs para uploads/logs: sin Mongo productivo ni proveedores externos.
- Aislamiento Compose: 1 prueba aprobada. No publica puertos; red interna; bind mounts confinados al directorio exportado. Se usó un JWT aleatorio NUEVO en archivo local ignorado para validar la configuración.
- Plantillas de acceso público: 2 pruebas aprobadas. No se incorporan cookie, usuarios ni contraseñas del servicio real.
- Gitleaks 8.16.0: escaneo de archivos y del índice preparados sin hallazgos tras el saneamiento. Una clave de idempotencia de prueba está anotada individualmente como fixture sintético, no es un token de autenticación.
- Sintaxis Python del backend, runtime y tests: analizada correctamente.

Las primeras pruebas detectaron la dependencia local faltante `services/gremial_permissions.py`; se incorporó y la importación del adaptador pasó. Se incluyeron también los plugins health-check que referencia la configuración del frontend.

Advertencias heredadas: lint/hooks del frontend; deprecaciones FastAPI/multipart/crypt; aviso de compatibilidad passlib/bcrypt y ausencia de emergentintegrations. No se habilitó IA ni se actualizó globalmente el stack. El código heredado conserva advertencias de espacios en blanco; no se hizo un reformateo masivo.

No ejecutado en esta exportación:

- Reinstalación completa en otro host o reconstrucción limpia de todas las dependencias Docker.
- Pruebas que escriben, envían o restauran el escenario de la demo vigente.
- Ensayo humano de Eduardo, aceptación de PROVISA o validación universal de módulos heredados.
- Despliegue, creación de DNS, cambio de llaves existentes o modificación de main.

Se revisa la exportación en un contexto independiente antes del commit/push. El informe final al usuario confirma el hash remoto; este documento no afirma que la subida haya ocurrido por el simple hecho de existir.
