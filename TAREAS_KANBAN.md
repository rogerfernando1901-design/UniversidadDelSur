# Tablero Kanban: Detalle del Proyecto UHS

Este documento presenta el desglose final de las tareas (todas en estado **DONE/Completado**) como si fueran tarjetas de un tablero Kanban. El proyecto fue realizado por 5 integrantes (I1 a I5), con tareas estrictamente individuales, asegurando que cada persona cubriera áreas específicas y detalladas del sistema.

## 👥 Equipo de Trabajo
*   **I1:** Arquitecto y DevOps (Servidor, persistencia, flujos globales).
*   **I2:** Desarrollador Backend Core (APIs, seguridad, auth).
*   **I3:** Analista y Lógica de Negocio (Control Escolar y validaciones).
*   **I4:** Desarrollador Frontend Base (UI/UX, vistas estáticas y maquetado).
*   **I5:** Desarrollador Frontend Funcional (Consumo de APIs, DOM, interactividad).

---

### Tarea 1: Estructura del Servidor Express y Persistencia (I1)
*   **Descripción:** Configurar el servidor monolítico en Node.js con Express 5. Implementar el sistema de base de datos basado en lectura y escritura de archivos JSON locales (`usuarios.json`, `carreras.json`, `config.json`). Implementar escrituras atómicas usando archivos temporales y renombrado sincrónico para evitar corrupción por concurrencia.
*   **Asignado a:** I1
*   **Prioridad:** Crítica 🔥
*   **Tiempo Estimado:** 8 hrs

### Tarea 2: Diseño Base y Sistema de Páginas Informativas (I4)
*   **Descripción:** Construir la hoja de estilos global (`paginas.css`) definiendo colores institucionales, tipografías y botones. Crear el header, footer y las vistas HTML estáticas: Inicio, Oferta, Requisitos, Ayuda y Privacidad, garantizando la navegación consistente.
*   **Asignado a:** I4
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 10 hrs

### Tarea 3: Catálogo de Carreras y Fichas Técnicas (I4)
*   **Descripción:** Maquetar las páginas descriptivas individuales para las licenciaturas en Sistemas, Diseño y Administración. Incluir información de perfil de egreso y capacidad (cupo). Crear las tarjetas informativas de la convocatoria.
*   **Asignado a:** I4
*   **Prioridad:** Media 🟡
*   **Tiempo Estimado:** 6 hrs

### Tarea 4: Sistema de Autenticación y Registro Funcional (I2)
*   **Descripción:** Crear las APIs `/api/registro` y `/api/login`. Todos los registros son 100% funcionales. El backend valida el formato de correo. La contraseña debe encriptarse utilizando la librería `bcryptjs` con 10 rondas de 'salt'. Las contraseñas en plano nunca se guardan.
*   **Asignado a:** I2
*   **Prioridad:** Crítica 🔥
*   **Tiempo Estimado:** 8 hrs

### Tarea 5: Manejo de Sesiones del Servidor (I2)
*   **Descripción:** Implementar la librería `express-session` con cookies para mantener al usuario logueado de manera segura. El backend debe retornar los datos básicos del usuario y su `role` (aspirante, control_escolar, admin) en `/api/sesion` para proteger las rutas.
*   **Asignado a:** I2
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 5 hrs

### Tarea 6: Motor de Subida de Documentos Probatorios (I1)
*   **Descripción:** Configurar `multer` para la carga de archivos. Limitar estrictamente el tamaño a 5MB por archivo. Validar por extensión (`.pdf`, `.png`, `.jpeg`) y por MIME type real. Guardar los archivos en el servidor bajo la carpeta dinámica `uploads/[userId]/`.
*   **Asignado a:** I1
*   **Prioridad:** Crítica 🔥
*   **Tiempo Estimado:** 7 hrs

### Tarea 7: Lógica del Estado del Expediente - Motor (I3)
*   **Descripción:** Diseñar en el backend el ciclo de vida del expediente. Validar que la transición de estados sea estricta: `borrador` -> `enviada` -> `en_revision` -> `con_observaciones` o `aprobada`. Generar el historial de notas automatizado en cada cambio de estado para la auditoría.
*   **Asignado a:** I3
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 8 hrs

### Tarea 8: Desarrollo del Panel del Aspirante y Captura de Datos (I5)
*   **Descripción:** Programar `expediente.html` y su lógica en Javascript. Consumir la API para rellenar campos pre-existentes (nombre, fecha de nacimiento, domicilio) y manejar la subida asíncrona de archivos usando el objeto `FormData`, capturando errores del servidor si el archivo excede los 5MB.
*   **Asignado a:** I5
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 9 hrs

### Tarea 9: Bloqueo Inteligente de Interfaz del Aspirante (I5)
*   **Descripción:** Programar en `expediente.js` la lógica que bloquea todo el formulario si el estado es `enviada`, `en_revision` o `aprobada`. Si el estado es `con_observaciones`, el código JS debe leer las observaciones específicas de la API y desbloquear únicamente los *inputs* requeridos, marcándolos en rojo e inyectando el motivo de rechazo en la UI.
*   **Asignado a:** I5
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 8 hrs

### Tarea 10: Prevención de XSS y Sanitización del DOM (I5)
*   **Descripción:** Auditar y reescribir toda la generación dinámica de tablas en el frontend. Reemplazar el uso inseguro de interpolación (`innerHTML = ${variable}`) por creación segura de nodos usando `document.createElement` y `textContent` en los paneles de control y administración.
*   **Asignado a:** I5
*   **Prioridad:** Crítica 🔥
*   **Tiempo Estimado:** 5 hrs

### Tarea 11: Interfaz de la Bandeja de Control Escolar (I4)
*   **Descripción:** Maquetar la tabla dinámica `control.html` donde el staff visualiza a los aspirantes. Diseñar la ventana modal que divide la pantalla: a la izquierda la información del usuario, y a la derecha el visualizador del PDF o Imagen del documento subido.
*   **Asignado a:** I4
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 7 hrs

### Tarea 12: API de Dictamen de Control Escolar (I2)
*   **Descripción:** Crear el endpoint `POST /api/control/solicitudes/:id/revisar`. Debe validar que las reglas de negocio se cumplan: si un documento se rechaza, es obligatorio incluir una cadena de texto explicando el motivo; si todo está aprobado, cerrar el expediente.
*   **Asignado a:** I2
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 8 hrs

### Tarea 13: Lógica JS para el Personal de Control Escolar (I3)
*   **Descripción:** Conectar la interfaz de Control Escolar con la API. Permitir al personal abrir cada documento individual (Acta, Certificado, INE) e inyectar *Radio Buttons* para aprobar o rechazar cada uno, forzando mediante validación JS a rellenar el motivo si se selecciona 'Rechazar' antes de enviar la evaluación al servidor.
*   **Asignado a:** I3
*   **Prioridad:** Media 🟡
*   **Tiempo Estimado:** 7 hrs

### Tarea 14: Panel de Métricas de Administración (I1)
*   **Descripción:** Desarrollar `GET /api/admin/convocatoria` y su vista. Programar la lectura de datos de todos los usuarios para calcular en tiempo real los totales: aspirantes, lugares ocupados por carrera, expedientes aprobados y rechazados. Mostrar los datos en tarjetas de estadísticas.
*   **Asignado a:** I1
*   **Prioridad:** Media 🟡
*   **Tiempo Estimado:** 6 hrs

### Tarea 15: Edición de Fechas, Cupos y Roles Internos (I3)
*   **Descripción:** Crear la lógica que permita al administrador actualizar las fechas límite del sistema (validando formato YYYY-MM-DD mediante Expresiones Regulares en backend) y modificar el cupo máximo por licenciatura. Integrar el formulario para crear nuevas cuentas con rol de 'control_escolar', bloqueando la opción de crear 'aspirantes' desde aquí.
*   **Asignado a:** I3
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 8 hrs

---
*Fin del desglose. Total de tareas: 15. Tareas por integrante: 3. Trabajo estrictamente distribuido.*
