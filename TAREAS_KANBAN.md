# Tablero Kanban: Retrospectiva de Tareas del Proyecto UHS

Este documento desglosa todo el desarrollo realizado como si fuera extraído de un tablero Kanban (To Do, In Progress, Review, Done). Al estar el proyecto finalizado, todas estas tareas se encuentran actualmente en estado **DONE** (Completado). 

Se han asignado roles teóricos a **5 integrantes** (I1 a I5) basándose en las necesidades del desarrollo. Los tiempos estimados están dados en horas efectivas de trabajo.

## 👥 Equipo de Trabajo
*   **I1 (Product Owner / Analista / UX):** Definición de flujos, requisitos y validación de las interfaces estáticas y lógica de negocio.
*   **I2 (Desarrollador Backend Core):** Arquitectura del servidor, APIs base, y persistencia de datos (JSON).
*   **I3 (Desarrollador Backend Security & File System):** Manejo de sesiones, seguridad (XSS, bcrypt), subida de archivos (multer) y concurrencia.
*   **I4 (Desarrollador Frontend Público):** Desarrollo del sitio web informativo, estilos CSS globales y vistas de acceso/registro.
*   **I5 (Desarrollador Frontend Paneles Internos):** Lógica JS de cliente, integración de APIs para Aspirantes, Control Escolar y Administración.

---

## 📌 Épica 1: Arquitectura Base y Páginas Estáticas (Informativas)

### Tarea 1.1: Maquetado del sitio web estático y diseño global (CSS)
*   **Descripción:** Crear el sistema de diseño (`paginas.css`), paleta de colores institucional, tipografías y el esqueleto base (Header, Footer, tipografía, botones base).
*   **Asignado a:** I4
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 6 hrs

### Tarea 1.2: Desarrollo de Páginas Informativas de la Universidad
*   **Descripción:** Crear las páginas `oferta.html`, `convocatoria.html`, `requisitos.html`, `ayuda.html`, y fichas técnicas por carrera (Sistemas, Diseño, Administración). Asegurar coherencia de nombres (Campus Central).
*   **Asignado a:** I4
*   **Prioridad:** Media 🟡
*   **Tiempo Estimado:** 8 hrs

### Tarea 1.3: Redacción de textos, Aviso de Privacidad y FAQ
*   **Descripción:** Generar el contenido real de la universidad, evitar *lorem ipsum*, crear el Aviso de Privacidad y la sección de Preguntas Frecuentes.
*   **Asignado a:** I1
*   **Prioridad:** Baja 🟢
*   **Tiempo Estimado:** 4 hrs

---

## 📌 Épica 2: Backend Base y Autenticación

### Tarea 2.1: Configuración inicial del servidor Node.js/Express
*   **Descripción:** Iniciar el proyecto (`index.js`), configurar middlewares base (CORS, body-parser, static files) y definir las carpetas estáticas para servir el frontend.
*   **Asignado a:** I2
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 3 hrs

### Tarea 2.2: Sistema de Persistencia JSON y Operaciones Atómicas
*   **Descripción:** Crear sistema que lea/escriba en archivos `data/*.json` de forma segura. Implementar el patrón `temp + renameSync` para evitar archivos corruptos en escrituras concurrentes.
*   **Asignado a:** I2
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 5 hrs

### Tarea 2.3: Autenticación, Sesiones y Cifrado
*   **Descripción:** Implementar `express-session` para mantener la sesión viva, cifrar las contraseñas de los usuarios con `bcryptjs`, y crear endpoints `/api/registro`, `/api/login`, y `/api/logout`.
*   **Asignado a:** I3
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 6 hrs

### Tarea 2.4: Desarrollo de vistas de Registro e Inicio de Sesión
*   **Descripción:** Crear `inscripcion.html` y `acceso.html`. Programar el frontend (`acceso.js`) para capturar eventos de formularios, comunicarse con las APIs de Auth, y redirigir según rol.
*   **Asignado a:** I5
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 5 hrs

---

## 📌 Épica 3: Flujo Principal del Aspirante (Expediente Electrónico)

### Tarea 3.1: Vistas y lógica de Panel del Aspirante
*   **Descripción:** Crear `panel.html`. Mostrar barra de estado actual, historial de eventos y botón para continuar el trámite. Validar que la vista redirija al index si no está logueado (`panel.js`).
*   **Asignado a:** I5
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 6 hrs

### Tarea 3.2: API de Gestión de Expedientes (Datos de texto)
*   **Descripción:** Desarrollar los endpoints (GET y PUT `/api/expediente`) para leer y guardar información personal (nombre, domicilio, CURP) y la carrera deseada por el aspirante.
*   **Asignado a:** I2
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 5 hrs

### Tarea 3.3: API de Subida de Documentos (Multer)
*   **Descripción:** Configurar `multer` para guardar archivos en `uploads/:userId`. Validar seguridad: solo PDF, PNG, JPG y menor a 5MB. Prevenir subida de archivos maliciosos validando el MIME-type.
*   **Asignado a:** I3
*   **Prioridad:** Crítica 🔥
*   **Tiempo Estimado:** 7 hrs

### Tarea 3.4: Interfaz de Llenado de Expediente
*   **Descripción:** Crear `expediente.html` y `expediente.js`. Capturar formulario, enviar archivos por fetch asíncrono con `FormData`, validar que el aspirante suba todo antes de enviar la solicitud a Control Escolar.
*   **Asignado a:** I5
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 8 hrs

---

## 📌 Épica 4: Módulo de Control Escolar (Staff Interno)

### Tarea 4.1: Vista y Endpoint de Bandeja de Solicitudes
*   **Descripción:** Endpoint `GET /api/control/solicitudes` y la vista `control.html` donde el staff puede ver todas las solicitudes "Enviadas" o "Con observaciones" con tabla dinámica filtrable.
*   **Asignado a:** I2 (API) e I5 (Frontend)
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 6 hrs

### Tarea 4.2: Lógica de Revisión, Aprobación y Rechazo
*   **Descripción:** Endpoint `POST /api/control/solicitudes/:id/revisar`. Debe actualizar el estado de cada documento. Si hay algún documento rechazado, cambiar estado a "Con Observaciones"; si todo es correcto, "Aprobada". Validar que dejen mensaje si rechazan.
*   **Asignado a:** I3
*   **Prioridad:** Crítica 🔥
*   **Tiempo Estimado:** 7 hrs

### Tarea 4.3: Interfaz dinámica de revisión para Control Escolar
*   **Descripción:** Modal en `control.js` que se llena con la información del aspirante seleccionado, permite visualizar archivos cargados e integra controles de radio (Aprobar/Rechazar) con textarea obligatorio para el motivo de rechazo.
*   **Asignado a:** I5
*   **Prioridad:** Media 🟡
*   **Tiempo Estimado:** 5 hrs

### Tarea 4.4: Lógica de Bloqueo Inteligente de Edición (Frontend)
*   **Descripción:** Modificar `expediente.js` para que, cuando el expediente esté "Con Observaciones", solo desbloquee los inputs de los documentos o datos rechazados, mostrando en rojo el mensaje de Control Escolar; y bloquear los inputs de lo ya aprobado.
*   **Asignado a:** I1 (Reglas) e I5 (Implementación)
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 6 hrs

---

## 📌 Épica 5: Panel de Administración y Pruebas Globales

### Tarea 5.1: Panel de Control (Dashboard) del Admin
*   **Descripción:** Crear `admin_panel.html` y APIs para obtener métricas y listado global de usuarios (`/api/admin/...`). Filtrar aspirantes para mostrar solo cuentas internas (admin, staff).
*   **Asignado a:** I2
*   **Prioridad:** Media 🟡
*   **Tiempo Estimado:** 4 hrs

### Tarea 5.2: Gestión de Convocatorias y Cupos
*   **Descripción:** Implementar la interfaz y API para permitir al administrador modificar las fechas de convocatoria y actualizar el cupo máximo por carrera. Validar formato de fechas (YYYY-MM-DD).
*   **Asignado a:** I4 e I2
*   **Prioridad:** Media 🟡
*   **Tiempo Estimado:** 5 hrs

### Tarea 5.3: Sanitización y Seguridad Final (Bug Fixing)
*   **Descripción:** Auditoría del código. Reparar vulnerabilidades XSS renderizando datos del DOM de forma segura (usando `textContent` en lugar de `innerHTML`). Asegurar que todos los campos del backend validen sus tipos de datos antes de hacer `.trim()`. 
*   **Asignado a:** I3
*   **Prioridad:** Crítica 🔥
*   **Tiempo Estimado:** 6 hrs

### Tarea 5.4: Pruebas end-to-end (QA)
*   **Descripción:** Probar el sistema de punta a punta: Registro completo -> Subida de documentos -> Revisión de Control -> Rechazo intencional -> Corrección del aspirante -> Aprobación final.
*   **Asignado a:** I1
*   **Prioridad:** Alta 🔴
*   **Tiempo Estimado:** 4 hrs

---

## 📊 Resumen del Esfuerzo

| Integrante | Tareas Asignadas (Totales o Parciales) | Horas Estimadas |
| :--- | :--- | :--- |
| **I1 (Analista / QA)** | 1.3, 4.4, 5.4 | 14 hrs |
| **I2 (Dev Backend Core)** | 2.1, 2.2, 3.2, 4.1, 5.1, 5.2 | 28 hrs |
| **I3 (Dev Backend Auth & Security)** | 2.3, 3.3, 4.2, 5.3 | 26 hrs |
| **I4 (Dev Frontend Público)** | 1.1, 1.2, 5.2 | 19 hrs |
| **I5 (Dev Frontend Interfaces)**| 2.4, 3.1, 3.4, 4.1, 4.3, 4.4 | 35 hrs |
| **TOTAL PROYECTO** | 16 Tareas Completadas | **122 hrs efectivas** |
