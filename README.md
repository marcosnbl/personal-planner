# Training planner

Aplicación web para organizar entrenamientos semanales, registrar sesiones realizadas y consultar el volumen acumulado. Está construida con **Next.js App Router**, **React** y **TypeScript**, con una interfaz responsive y tema oscuro.

## Funciones

- Plan semanal de lunes a domingo con navegación entre semanas.
- Alta de entrenamientos con fecha libre, pasada o futura.
- Registro de sesiones de Running, Ciclismo, Natación, Fuerza, Movilidad y Descanso.
- Título personalizado para cada entrenamiento, por ejemplo _Long Run_ o _Rodaje suave_.
- Estados de sesión: planificada, completada o saltada.
- Métricas planificadas y realizadas: distancia, tiempo y desnivel positivo.
- Tiempo ingresable en minutos (`90`) o en formato `HH:MM:SS` (`1:30:00`).
- Resumen semanal con kilómetros realizados y desglose por Running, Ciclismo y Natación cuando hay distancia registrada.
- Historial gráfico de kilómetros de las últimas 12 semanas.
- Tema claro u oscuro, con preferencia guardada en el navegador.
- Exportación e importación de respaldos en JSON y exportación CSV.

## Datos y privacidad

Los entrenamientos se guardan en `localStorage` bajo la clave `stride.training.v1`. Permanecen en el mismo navegador y dispositivo; no hay cuenta, base de datos remota ni sincronización entre dispositivos. Para migrar o respaldar datos, usá **Configuración → Exportar JSON**.
El formato de respaldo JSON está versionado y contiene `{ version, workouts }`. Cada sesión incluye fecha, disciplina, estado, título y métricas planificadas y realizadas.
