# Activar cuentas y sincronización con Supabase

## 1. Crear el proyecto

1. Entrá en https://supabase.com/dashboard y creá un proyecto.
2. Guardá la contraseña de la base de datos en tu gestor de contraseñas; la aplicación no la necesita.
3. Esperá a que el proyecto termine de crearse.

## 2. Crear la tabla y los permisos

Abrí **SQL Editor**, pegá el contenido completo de `supabase/migrations/202611030001_training_accounts.sql` y ejecutalo una vez. Si usás Supabase CLI, aplicalo como una migración normal.

La tabla `training_documents` contiene un documento JSON por usuario con entrenamientos y plantillas, revisión numérica y fecha de actualización. Se conserva el formato de respaldo versión 2; no se cambian los IDs ni las fechas existentes.

- RLS permite leer únicamente la fila cuyo `user_id = auth.uid()`.
- El cliente autenticado no tiene permiso para INSERT, UPDATE ni DELETE directos.
- Las escrituras pasan por `save_training_document`, que verifica la identidad autenticada y la revisión esperada dentro de una transacción.
- La función usa un `search_path` vacío y no acepta escribir en nombre de otra cuenta.
- Una revisión desactualizada devuelve `SYNC_CONFLICT`, sin sobrescribir la nube.
- Las claves secretas y `service_role` nunca se usan en la web.

## 3. Configurar acceso con Google (sin SMTP)

El acceso actual usa **Continuar con Google**, no códigos por correo. No requiere dominio propio ni proveedor SMTP. **Probar sin cuenta** permite explorar la aplicación guardando datos únicamente en este navegador.

1. En Supabase → Authentication → Sign In / Providers → Google, copiá la URL de callback. Tiene la forma `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
2. En Google Cloud, creá un proyecto y configurá Google Auth Platform: nombre Training planner, correo de soporte, audiencia External y permisos básicos `openid`, correo y perfil.
3. Creá un cliente OAuth de tipo **Web application**. En Authorized JavaScript origins agregá `https://TU-APP.vercel.app` y `http://localhost:3000`.
4. En Authorized redirect URIs de Google pegá el callback de **Supabase** del paso 1. No es la ruta de tu app.
5. En el proveedor Google de Supabase habilitá el acceso y guardá el Client ID y Client Secret. El secreto se configura exclusivamente allí; no se añade a variables públicas ni al repositorio.
6. En Supabase → Authentication → URL Configuration, Site URL debe ser `https://TU-APP.vercel.app`. En Redirect URLs agregá `https://TU-APP.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`.
7. Revisá el estado de publicación/audiencia de Google antes de compartir públicamente el portfolio. Seguí los requisitos que indique Google Auth Platform para tu configuración.

El SDK utiliza PKCE. La página cliente `/auth/callback` intercambia el código de un solo uso por una sesión persistida por Supabase en el navegador y vuelve a `/`. El callback evita intercambios duplicados, maneja cancelación/código vencido y no permite redirecciones externas. No se crean cookies de autenticación para SSR en esta etapa; la base de datos aplica los permisos RLS a cada petición autenticada del SDK.

Iniciá y completá el acceso en el mismo navegador. Si abrís manualmente el callback en otro navegador/dispositivo no tendrá el verificador PKCE; iniciá el acceso desde ese dispositivo. La ruta del callback se excluye de la caché de la PWA.

## 4. Variables locales

Copiá `.env.example` a `.env.local`. En el panel **Connect / API Keys**, obtené la URL del proyecto y su clave **publishable** (o `anon` en proyectos anteriores):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

Solo si tu proyecto todavía usa la clave pública `anon`, podés ponerla como `NEXT_PUBLIC_SUPABASE_ANON_KEY` en lugar de la anterior. No uses ambas con valores diferentes. Nunca pegues `service_role`, `sb_secret_...` ni la contraseña de la base de datos.

Reiniciá `npm run dev`. Sin estas variables, la app continúa en modo local y muestra las instrucciones de configuración en Cuenta.

## 5. Activarlo en Vercel

En **Project → Settings → Environment Variables**, agregá las dos variables públicas con los mismos nombres, para los entornos correspondientes. Después hacé un nuevo deployment: Next.js incorpora las variables públicas al compilar.

Entrá desde el header **Ingresar** y elegí **Continuar con Google**. Seleccioná tu cuenta y aceptá el acceso. Después de iniciar sesión, la app muestra la cuenta y su estado de sincronización.

## 6. Llevar tus entrenamientos locales a la cuenta

1. Antes de migrar, exportá un respaldo JSON desde Configuración.
2. Iniciá sesión en el navegador donde están los entrenamientos actuales.
3. Esperá a que termine la primera sincronización.
4. Pulsá **Copiar datos locales a mi cuenta** y confirmá.
5. Esperá el estado **Sincronizado con tu cuenta**.
6. Abrí la app en el otro dispositivo e ingresá con el mismo correo.

Los datos locales originales se conservan. La migración combina sesiones y plantillas; si dos IDs iguales tienen datos diferentes, conserva ambas copias sin reemplazar la remota. Repetir la misma migración no duplica las mismas sesiones.

## Comportamiento y límites

- El modo local mantiene la clave histórica `stride.training.v1`.
- Cada cuenta usa una caché independiente `training-planner.account.<user-id>.v1`. Al cambiar de cuenta o cerrar sesión, se desmontan calendario, formularios e historial para impedir que queden datos de la cuenta anterior en la interfaz.
- Cerrar sesión solo cierra este dispositivo. Se conserva su caché por cuenta, incluidos los pendientes. Quien controla el navegador puede inspeccionar su almacenamiento: no es un almacén cifrado ni una garantía de privacidad frente al propietario del dispositivo.
- Los cambios se guardan localmente y se envían en una cola serial. Hay comprobaciones cada 15 segundos mientras la app está visible y al volver a la pestaña o recuperar conexión. No se usa Realtime ni sincronización en segundo plano con la app cerrada.
- El estado de la cuenta, entrenamientos y plantillas se comparte entre dispositivos; tema, selección de semana e historial de Deshacer son locales.
- Sin conexión podés editar una cuenta ya iniciada. La entrega al servidor depende de volver a abrir la app con una sesión válida y conexión. El primer acceso a una cuenta nueva requiere internet.
- Si otro dispositivo modificó la nube, la app detiene las escrituras y conserva los cambios locales. Exportá tu copia y elegí **Cargar versión de la nube**. Para recuperar cambios de ambas versiones, combiná los respaldos antes de importarlos. No se hace una fusión automática de ediciones concurrentes.
- La unidad de sincronización es el documento completo del usuario. Es una primera implementación para un planificador personal; ante un crecimiento grande del historial convendrá migrar a filas por sesión y paginación.
- Cambios de Supabase Auth o de SQL no deben probarse con cuentas de otras personas.

## Validación pendiente al crear el proyecto

Las pruebas locales del motor usan un servidor simulado. Para comprobar la base real:

1. Ejecutá `supabase/tests/account-isolation.sql` en una base de desarrollo desde SQL Editor. Comprueba lectura propia, aislamiento A/B, denegación de acceso anónimo, rechazo de escrituras directas y conflictos. Usa una transacción con ROLLBACK y usuarios temporales de prueba; requiere permisos administrativos para preparar el escenario.
2. Creá dos cuentas reales desde la app. Confirmá que B no ve las sesiones de A, incluso después de cerrar y volver a iniciar sesión en el mismo navegador.
3. Con la misma cuenta en dos dispositivos, creá una sesión y esperá a que aparezca en el otro.
4. Desconectá uno, editá ambos y reconectá: debe aparecer el conflicto sin sobrescribir datos.
5. Probá cierre de sesión con pendientes, migración local, edición offline y exportación de respaldo.

Estas comprobaciones de Auth, Google y RLS no se pueden dar por aprobadas sin un proyecto real.

## Fuentes oficiales

- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/api/api-keys
