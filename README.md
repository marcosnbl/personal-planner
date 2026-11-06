# Training Planner

Planificador web de entrenamientos en español. Organizá varias sesiones por día, registrá lo que hiciste y seguí tu progreso por disciplina. La app funciona sin cuenta y permite iniciar sesión con Google para sincronizar entrenamientos y plantillas entre dispositivos.

## Qué podés hacer

- Planificar sesiones en un calendario semanal y comparar distancia, tiempo y desnivel previstos con los reales.
- Mover sesiones, duplicarlas, copiar semanas y reutilizar plantillas.
- Consultar estadísticas de las últimas 12 semanas y exportar respaldos en JSON o CSV.
- Instalar la aplicación como PWA y abrirla sin conexión después de una primera carga completa.

## Datos y respaldos

Sin cuenta, los datos quedan en este navegador y dispositivo. Con Google y Supabase configurados se sincronizan los entrenamientos y las plantillas de tu cuenta cuando hay conexión.

**Exportar JSON** conserva sesiones y plantillas y permite recuperarlas. Importar JSON reemplaza ambos conjuntos después de confirmar. **Deshacer solo recupera sesiones**, no las plantillas reemplazadas, y su historial se reinicia al recargar. Exportá un JSON antes de importar otro respaldo.

CSV sirve para análisis en una planilla; no permite restaurar todos los datos. La instalación como PWA requiere una primera visita con conexión y que termine la preparación de recursos; ante fallos se reintenta al recuperar conexión. El acceso inicial con Google requiere internet.

## Cómo está construido

| Parte    | Tecnología y responsabilidad                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Interfaz | Next.js App Router, React y TypeScript. Calendario, editor y estadísticas en componentes separados.                                       |
| Datos    | `localStorage` en modo local. Supabase Postgres en modo cuenta, con permisos por usuario y control de versiones para detectar conflictos. |
| Acceso   | Google OAuth a través de Supabase Auth, con PKCE y retorno en `/auth/callback`.                                                           |
| Pruebas  | Node.js para lógica de dominio y Playwright con escenarios Gherkin en español para flujos de navegador.                                   |

`app/` contiene las rutas, `components/` la interfaz, `hooks/` y `lib/` la lógica y la persistencia, y `supabase/` la migración SQL y la prueba de aislamiento.

## Ejecutar en local

Con Node.js 22.18 o posterior:

```bash
npm ci
npm run dev
```

Abrí http://localhost:3000. El modo local funciona sin variables de entorno.

Para activar la cuenta, configurá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` siguiendo `.env.example`. Aplicá la migración de `supabase/migrations/`, habilitá Google en Supabase y autorizá `/auth/callback` para cada origen. En Vercel, cargá las variables antes de desplegar.

## Pruebas

```bash
npm test
npx playwright install chromium webkit
npm run test:e2e
```

Los escenarios de `e2e/features/` cubren guardado y recarga, duración, deshacer, accesibilidad de diálogos, temas y recuperación ante errores de descarga. Las pruebas PWA comprueban las cuatro vistas diferidas sin conexión y el reintento de preparación tras un fallo. Se ejecutan en Chromium y WebKit móvil emulado con datos locales aislados; WebKit también ejercita la preparación sin `requestIdleCallback`. El acceso real con Google y la sincronización entre cuentas requieren un entorno Supabase de pruebas. La emulación no sustituye una comprobación en un iPhone físico.

Usá `npm run lint`, `npm run format:check` y `npm run build` para verificar el código antes de subirlo.
