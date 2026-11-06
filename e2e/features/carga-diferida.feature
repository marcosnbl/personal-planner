# language: es
Característica: Recuperación de formularios diferidos

  Antecedentes:
    Dado que abro el planificador en un navegador nuevo

  Escenario: Cancelar la descarga de un formulario con Escape
    Cuando demoro la descarga del editor
    Y abro un nuevo entrenamiento
    Entonces puedo cancelar la carga con Escape y volver al calendario

  Escenario: Reintentar un formulario después de un error de descarga
    Cuando falla la descarga del editor
    Y abro un nuevo entrenamiento
    Entonces veo un error recuperable del formulario
    Cuando restauro la descarga y reintento
    Entonces se abre el editor de una nueva sesión
