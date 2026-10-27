# Training planner · Planificador de entrenamiento

Aplicación web creada con Next.js App Router, React y TypeScript. El dashboard permite planificar semanas, registrar sesiones, consultar métricas e importar/exportar respaldos. Los datos se guardan localmente en el navegador mediante `localStorage`.

## Requisitos

- Node.js 20.9 o superior
- npm

## Desarrollo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Para producción: `npm run build` y `npm run start`.

## Estructura

- `app/page.tsx`: dashboard, estadísticas y formularios React.
- `app/globals.css`: estilos base responsive.
- `app/overrides.css`: ajustes específicos de componentes Next.
- `app/layout.tsx`: layout raíz y metadatos.

La clave `stride.training.v1` guarda los datos y el objetivo semanal. La forma versionada `{ version, target, workouts }` permite migrar a una capa de sincronización futura.
