# language: es
Característica: Navegación accesible y protección de cambios

  Antecedentes:
    Dado que abro el planificador en un navegador nuevo

  Escenario: Cancelar el descarte conserva el formulario
    Cuando escribo una sesión sin guardarla
    Y rechazo descartar los cambios al presionar Escape
    Entonces conservo los datos y la selección accesible

  Escenario: Configuración administra el foco y permite importar con teclado
    Cuando abro configuración con el teclado
    Entonces el foco permanece dentro de configuración
    Y puedo activar la importación JSON con el teclado
    Cuando cierro configuración con Escape
    Entonces el foco regresa al botón de ingreso

  Escenario: Copiar una semana permite cancelar con Escape
    Cuando guardo "Rodaje accesible" con una duración de "45"
    Y abro copiar semana
    Entonces el contenido del fondo queda bloqueado
    Y puedo cerrar copiar semana con Escape
    Y el contenido del fondo vuelve a estar disponible

  Escenario: Guardar plantilla aísla el diálogo y restaura el fondo
    Cuando guardo "Rodaje para plantilla" con una duración de "45"
    Y abro guardar plantilla
    Entonces el contenido del fondo queda bloqueado
    Cuando cierro guardar plantilla con Escape
    Entonces el contenido del fondo vuelve a estar disponible
