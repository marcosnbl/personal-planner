# Training planner

Planificación y registro de entrenamientos en Next.js App Router, React y TypeScript. Interfaz en español, responsive, con tema claro por defecto y modo oscuro persistente.

## Uso

- Cuenta opcional con Google y sincronización de entrenamientos/plantillas con Supabase. Guía: [activar Supabase](docs/SUPABASE.md).
- Calendario de lunes a domingo con **varias sesiones por día** y filtros por disciplina.
- Agregar sesiones en cualquier fecha, editar, completar, saltar o eliminar.
- Métricas planificadas y reales: km, minutos o `HH:MM:SS`, D+, RPE opcional, equipo y sensaciones.
- Arrastrar una sesión a otro día; en móvil, usar el control ⠿. También se puede usar **••• → Mover a otra fecha** con teclado o pantalla táctil.
- Si el destino está ocupado, elegir entre agregar la sesión o intercambiar fechas con una sesión concreta. Las demás se conservan.
- **Deshacer** recupera hasta 20 cambios de sesiones (incluidos edición, estado, movimiento, eliminación, copia e importación) durante la sesión actual. El historial de deshacer se reinicia al recargar; las sesiones se conservan.
- **••• → Duplicar** abre una copia editable antes de guardarla. Se conservan la planificación y el equipo, y se reinician métricas reales, estado, RPE y sensaciones.
- **Copiar semana** agrega la planificación a la semana elegida sin reemplazar sesiones existentes. La fecha seleccionada se normaliza al lunes.
- **••• → Guardar plantilla** permite guardar sesiones frecuentes. En **Plantillas** se pueden usar/eliminar, o comenzar con Rodaje suave, Series y Long Run. Las sugerencias no se cargan automáticamente.
- Estadísticas de 12 semanas por disciplina: km, tiempo, D+ y evolución del RPE informado. Tablas accesibles con valores exactos y cumplimiento de sesiones completadas respecto del total programado. Running y ciclismo se analizan por separado.
- Configuración: exportación JSON/CSV e importación JSON validada. Los errores de archivo no modifican los datos actuales.

## Datos y respaldo

Se mantiene la clave histórica `stride.training.v1` para conservar los entrenamientos existentes. Su contenido se escribe ahora en formato `{ version: 2, workouts, templates }`. Se aceptan respaldos de versión 1 y 2. Cada sesión tiene un ID independiente de su fecha; varias pueden compartir día.

Sin iniciar sesión, los datos permanecen en el mismo navegador/perfil y dispositivo. Con Supabase configurado e inicio de sesión, se sincronizan entrenamientos y plantillas por usuario; la migración de los datos locales requiere confirmación. Usá **Configuración → Exportar JSON** para respaldar sesiones y plantillas. La importación reemplaza ambos conjuntos después de confirmar; Deshacer restaura las sesiones previas, pero no las plantillas reemplazadas. Si hay errores al leer o escribir localStorage, se muestra un aviso; un contenido local ilegible no se sobrescribe automáticamente.

La exportación CSV sirve para análisis; la recuperación completa se realiza con JSON. El tema usa `training-planner.theme.v1`.

## Desarrollo y verificaciones

Requiere Node.js 22.18+ (recomendado 24) para ejecutar las pruebas TypeScript con el runner nativo, sin instalar un framework adicional.

```bash
npm install
npm run dev
```

```bash
npm test
npm run lint
npm run format:check
npm run build
```

`npm run format` aplica Prettier. Las pruebas cubren límites semanales/año, duraciones, varias sesiones por día, movimientos/intercambios, copias, totales por disciplina, validación y recuperación de JSON e historial de deshacer. También se prueba el motor de sincronización con servidor simulado: concurrencia, reconexión y separación de cachés. Las pruebas de Auth/Google/RLS reales quedan pendientes de configurar Supabase.

## PWA e instalación

La versión de producción incluye manifiesto, iconos PNG y service worker. Puede instalarse desde un navegador compatible con HTTPS (Vercel lo proporciona). Cuando el navegador ofrece la instalación aparece el botón correspondiente en el header. En iPhone, abrir en Safari y elegir Compartir → Agregar a inicio; las instrucciones también están en Configuración.

```bash
npm run build
npm start
```

El service worker se registra solo en producción. Tras una primera carga completa con conexión, almacena la página y sus recursos estáticos para ofrecer acceso básico sin conexión. El primer acceso requiere internet. Las actualizaciones pueden requerir cerrar las ventanas de la aplicación y volver a abrirla. Instalar la PWA no activa por sí solo la sincronización: requiere Supabase configurado, sesión iniciada y conexión.

## Arquitectura

- `app/page.tsx`: composición del dashboard y coordinación de acciones.
- `components/training-calendar.tsx`: múltiples sesiones y arrastre de escritorio/táctil.
- `components/workout-editor.tsx`: formulario de planificación y registro.
- `components/move-dialog.tsx`: fecha de destino y selección de intercambio.
- `components/planning-tools.tsx`: copia semanal y biblioteca de plantillas.
- `components/training-statistics.tsx`: gráficos y tablas por disciplina.
- `components/install-app.tsx`, `app/manifest.ts`, `public/sw.js`: instalación y caché de aplicación.
- `hooks/use-training-store.ts`: persistencia local por cuenta y coordinación con la nube.
- `components/account-provider.tsx`, `components/account-panel.tsx`: sesión y acceso con Google.
- `lib/cloud-sync.ts`, `lib/supabase/`: cola de sincronización, revisiones y cliente Supabase.
- `supabase/migrations/`, `supabase/tests/`: esquema, permisos y comprobación SQL de aislamiento.
- `lib/training.ts`, `lib/history.ts`: modelo, validación, cálculos, operaciones e historial.
- `tests/training.test.mjs`: pruebas de dominio con Node.js.

## Configurar cuentas y siguiente etapa de pruebas

Seguí [docs/SUPABASE.md](docs/SUPABASE.md) para crear el proyecto, ejecutar la migración, configurar Google OAuth y las variables públicas de Vercel. `.env.example` documenta los nombres; `.env.local` está ignorado por Git. Sin configuración la app sigue en modo local.

La sincronización verifica cambios cada 15 segundos mientras la página está visible, al editar y al recuperar conexión/foco. Ante conflictos conserva la copia local y permite exportarla antes de descargar la nube. No usa Realtime ni envíos con la app cerrada. Si cambia el documento remoto, el historial de Deshacer se reinicia para evitar revertir cambios ajenos por accidente.

[TDD, límites de las pruebas y propuesta de Playwright/Cypress](docs/TESTING.md).

El callback de Google usa PKCE y está en `/auth/callback`; no se requiere SMTP. En Configuración podés elegir **Continuar con Google** o **Probar sin cuenta**. Las pruebas de `tests/google-auth.test.mjs` cubren parámetros de OAuth, cancelación, falta/caducidad del código e intercambio único.
