# language: es
Característica: Preferencias visuales y estadísticas

  Escenario: Recuperar el modo oscuro guardado
    Dado que el navegador recuerda el modo oscuro
    Y que abro el planificador en un navegador nuevo
    Entonces el planificador usa el modo oscuro

  Escenario: Cambiar de tema aunque el almacenamiento de preferencias esté bloqueado
    Dado que el navegador bloquea el almacenamiento del tema
    Y que abro el planificador en un navegador nuevo
    Cuando activo el modo oscuro
    Entonces el planificador usa el modo oscuro
    Y puedo seguir agregando entrenamientos

  Escenario: Consultar estadísticas después de completar una sesión
    Dado que abro el planificador en un navegador nuevo
    Cuando guardo "Rodaje de estadísticas" con una duración de "1:11:00"
    Y cambio el estado de "Rodaje de estadísticas" desde el calendario
    Y consulto las estadísticas de tiempo
    Entonces las estadísticas muestran 71 minutos para Running

  @pwa
  Escenario: Abrir el editor y conservar entrenamientos sin conexión
    Dado que abro el planificador para usarlo sin conexión
    Y que las vistas diferidas ya están disponibles sin conexión
    Cuando pierdo la conexión
    Y guardo "Rodaje sin conexión" con una duración de "1:11:00"
    Y recargo el planificador
    Entonces veo "Rodaje sin conexión" con una duración de "1h 11m"
    Y puedo abrir todas las vistas diferidas sin conexión

  @pwa
  Escenario: Recuperar la preparación offline después de un fallo
    Dado que falla temporalmente la preparación offline
    Y que abro el planificador para usarlo sin conexión
    Cuando recupero la conexión después de fallar la preparación
    Dado que las vistas diferidas ya están disponibles sin conexión
    Cuando pierdo la conexión
    Y guardo "Rodaje recuperado" con una duración de "45"
    Entonces veo "Rodaje recuperado" con una duración de "45 min"
