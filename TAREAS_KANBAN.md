# Tablero Kanban: Retrospectiva UHS (Simplificado)

Este documento contiene las tareas finales que conformaron el desarrollo del proyecto de la Universidad Horizonte del Sureste, estructurado para un tablero Kanban. 

Para optimizar el flujo de trabajo entre los **5 integrantes** (I1 a I5), se asignaron **exactamente 2 grandes tareas por persona** (10 tareas en total). Todas las tareas se encuentran actualmente en la columna de **DONE (Completadas)**.

---

### Integrante 1 (I1): Backend Core e Infraestructura
**Responsable de la arquitectura principal del servidor y el almacenamiento local.**

*   **Tarea 1: Servidor Express y Base de Datos JSON**
    *   **Descripción:** Configurar `index.js` con Node.js y Express. Programar las funciones de lectura/escritura seguras hacia los archivos locales (`usuarios.json`, `carreras.json`, `config.json`), garantizando la integridad de datos mediante escrituras atómicas (archivos temporales y `fs.renameSync`). Implementar el manejador de sesiones `express-session`.
    *   **Prioridad:** Crítica 🔥 | **Tiempo Estimado:** 8 hrs

*   **Tarea 2: Motor de Subida de Documentos (Multer)**
    *   **Descripción:** Configurar `multer` para la captura de archivos en la carpeta `/uploads/userId`. Validar desde el servidor que los archivos sean estrictamente `PDF`, `JPG` o `PNG` y bloquear cualquier intento de subir archivos mayores a 5MB. Implementar la eliminación del archivo anterior al reemplazar un documento.
    *   **Prioridad:** Crítica 🔥 | **Tiempo Estimado:** 7 hrs

---

### Integrante 2 (I2): Backend Security y Lógica de Negocio
**Responsable de la seguridad, autenticación y reglas operativas de la API.**

*   **Tarea 3: Autenticación, Registro Seguros y Roles**
    *   **Descripción:** Crear endpoints de `/api/registro` y `/api/login`. Encriptar todas las contraseñas entrantes usando `bcrypt` (salt 10). Implementar validación estricta de tipos de datos antes de procesar correos. Programar la protección de rutas basándose en el atributo `role` de la sesión.
    *   **Prioridad:** Crítica 🔥 | **Tiempo Estimado:** 8 hrs

*   **Tarea 4: Lógica de Transición de Estados y Dictamen**
    *   **Descripción:** Desarrollar la API de revisión para Control Escolar. Programar la lógica que rechaza el dictamen si el revisor no incluye texto en las observaciones de los documentos rechazados. Automatizar el cambio de estados del expediente (`borrador`, `enviada`, `con_observaciones`, `aprobada`) guardando el historial de bitácora en cada cambio.
    *   **Prioridad:** Alta 🔴 | **Tiempo Estimado:** 8 hrs

---

### Integrante 3 (I3): UI / UX Público (Frontend Base)
**Responsable de todo lo que el usuario ve antes de iniciar sesión.**

*   **Tarea 5: Sistema de Diseño Global y Maquetado**
    *   **Descripción:** Crear el archivo maestro `paginas.css`. Definir colores, tipografía, botones, cabecera (Header) y pie de página (Footer) comunes para todo el portal. Asegurar compatibilidad en todas las vistas.
    *   **Prioridad:** Alta 🔴 | **Tiempo Estimado:** 7 hrs

*   **Tarea 6: Contenido de Páginas Informativas y Fichas**
    *   **Descripción:** Programar las vistas estáticas HTML requeridas: Inicio, Oferta Académica, Aviso de Privacidad, Requisitos y Preguntas Frecuentes. Crear las fichas técnicas detalladas por cada carrera (Sistemas, Diseño, Administración) respetando la identidad institucional.
    *   **Prioridad:** Media 🟡 | **Tiempo Estimado:** 6 hrs

---

### Integrante 4 (I4): Interacción de Aspirantes (Frontend Estudiante)
**Responsable de la captura de datos y experiencia del estudiante logueado.**

*   **Tarea 7: Flujos de Acceso e Inicio del Panel**
    *   **Descripción:** Conectar `inscripcion.html` y `acceso.html` a la API de Auth usando `fetch()`. Validar formularios HTML nativos y redirigir correctamente. Desarrollar la vista `panel.html` del aspirante mostrando la línea de tiempo y la barra de progreso de su estado.
    *   **Prioridad:** Alta 🔴 | **Tiempo Estimado:** 7 hrs

*   **Tarea 8: UI del Expediente Electrónico y Bloqueo Inteligente**
    *   **Descripción:** Programar `expediente.js` para cargar la información previa. Implementar envíos asíncronos (`FormData`) para guardar datos y archivos. Programar el "bloqueo inteligente": si el estado es 'Enviada', desactivar toda la pantalla; si es 'Con Observaciones', habilitar únicamente los campos rechazados en rojo.
    *   **Prioridad:** Alta 🔴 | **Tiempo Estimado:** 9 hrs

---

### Integrante 5 (I5): Interfaz de Staff y Administración (Frontend Interno)
**Responsable de los paneles para el personal interno de la Universidad.**

*   **Tarea 9: Interfaz y Modal de Control Escolar**
    *   **Descripción:** Crear la tabla interactiva de `control.html`. Desarrollar una ventana modal asíncrona que divida la pantalla: el visor del documento a la derecha, y a la izquierda controles radio (Aprobar/Rechazar). Asegurar que JS exija el motivo antes de dejar enviar un rechazo. Reemplazar `innerHTML` por `textContent` para evitar inyecciones XSS en el pintado de la tabla.
    *   **Prioridad:** Alta 🔴 | **Tiempo Estimado:** 8 hrs

*   **Tarea 10: Dashboard y Configuración del Administrador**
    *   **Descripción:** Programar `admin_panel.html` y `admin.js`. Pintar tarjetas estadísticas en vivo obtenidas de la API. Programar los formularios donde el administrador puede: modificar fechas de la convocatoria, cambiar el cupo máximo por carrera y registrar directamente cuentas con rol `admin` o `control_escolar`.
    *   **Prioridad:** Media 🟡 | **Tiempo Estimado:** 7 hrs
