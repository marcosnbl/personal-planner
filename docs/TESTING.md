# TDD y pruebas de navegador

TDD es una forma de desarrollar: primero definir un comportamiento con una prueba que falle, implementar el cambio mínimo para hacerla pasar y refactorizar manteniendo las pruebas verdes. No es una librería y no exige reescribir todas las pruebas actuales.

## Lo que tenemos

`npm test` ejecuta las pruebas de dominio con Node.js. `tests/cloud-sync.test.mjs` agrega escenarios de sincronización con un servidor simulado: separación de cachés, descarga inicial, dos dispositivos, conflicto de revisiones, reconexión, recarga con pendientes, ediciones durante un envío, cambio de cuenta mientras hay respuestas pendientes y migración repetida.

No son pruebas reales de Supabase Auth, proveedor Google ni RLS. El script SQL `supabase/tests/account-isolation.sql` está preparado para ejecutarse contra una base de desarrollo después de la migración.

Para los próximos cambios seguiremos el ciclo **Red → Green → Refactor**. Ejemplo: escribir un test que demuestre que un dispositivo con revisión vieja no puede sobrescribir la nube, comprobar el fallo y después modificar el motor y la RPC.

## Playwright o Cypress

Ambos pueden usarse para practicar TDD en los flujos del navegador. Para este proyecto, Playwright es una buena opción para la siguiente etapa, porque queremos cubrir Chromium, Firefox y WebKit. WebKit ayuda con regresiones similares a Safari; no reemplaza comprobar iOS/Safari en un dispositivo real.

No se instalaron ambos frameworks ni se agregaron tests E2E simulando que ya existe un backend configurado. Al activar Supabase, el siguiente paso es incorporar Playwright con un proyecto/usuarios de prueba independientes:

1. Inicio y cierre de sesión; mensajes por cancelación o código OAuth inválido/vencido.
2. Crear un entrenamiento, recargar y recuperarlo.
3. Verlo desde un segundo contexto de navegador con la misma cuenta.
4. Confirmar que otra cuenta no puede leerlo ni modificarlo.
5. Cambiar de cuenta sin filtrar datos del calendario anterior.
6. Editar sin conexión, reconectar y comprobar pendientes/conflictos.
7. Arrastrar o mover con teclado y revisar el layout móvil en WebKit.

Las credenciales de test y las claves administrativas deben permanecer en el runner de CI y nunca incorporarse al bundle público. La prueba del envío de correo puede usar un buzón de pruebas; las suites rápidas de UI pueden preparar sesiones con fixtures, manteniendo pruebas de autenticación real separadas.

Referencias: https://playwright.dev/docs/intro y https://docs.cypress.io/app/core-concepts/introduction-to-cypress
