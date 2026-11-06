# language: es
Característica: Planificar entrenamientos sin cuenta

  Antecedentes:
    Dado que abro el planificador en un navegador nuevo

  Escenario: Conservar una sesión planificada después de recargar
    Cuando guardo "Rodaje suave" con una duración de "1:11:00"
    Y recargo el planificador
    Entonces veo "Rodaje suave" con una duración de "1h 11m"

  Escenario: Rechazar una duración inválida
    Cuando intento guardar "Series" con una duración de "1:70:00"
    Entonces el formulario sigue abierto y me indica el formato permitido
    Cuando cierro el formulario
    Entonces no veo la sesión "Series"

  Escenario: Completar una sesión con la duración planificada y deshacer el cambio
    Cuando guardo "Long Run" con una duración de "1:11:00"
    Y cambio el estado de "Long Run" desde el calendario
    Entonces "Long Run" figura como "Completado"
    Y veo "Long Run" con una duración de "1h 11m"
    Cuando deshago el último cambio
    Entonces "Long Run" figura como "Planificado"
