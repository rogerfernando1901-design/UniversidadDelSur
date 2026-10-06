# Tablero Kanban: Retrospectiva UHS (Detallado por Código)

Este documento detalla las 10 tareas ejecutadas (todas en **DONE**), divididas estrictamente a razón de **2 tareas por persona** para los 5 integrantes (I1 - I5).

Las tareas están organizadas bajo **3 Hitos (Milestones) principales** y ordenadas estrictamente por su nivel de **Prioridad (🔴 Alta, 🟡 Media, 🟢 Baja)**. Cada tarea explica a detalle *cómo* se programó basándose en el análisis línea por línea del desarrollo.

---

## 🚩 Hito 1: Sistema de Autenticación y Seguridad (Login)
*Objetivo: Sentar las bases del servidor, la persistencia de datos y proteger el acceso mediante encriptación y sesiones.*

### Tarea 1: Backend Core y Base de Datos en Archivos (🔴 Alta)
**Asignado a:** I1
**Explicación de Desarrollo:** Se configuró un servidor Node.js utilizando Express 5.0. Debido a la ausencia de un motor SQL, se programó un sistema de persistencia usando el módulo `fs` de Node. Para evitar corrupción de datos al guardar (race conditions), la función `writeJSON` se programó escribiendo primero en un archivo `.tmp` usando `fs.writeFileSync` y luego renombrándolo con `fs.renameSync`. Se configuraron los *middlewares* de Express (body-parser y static files).
**Subtareas:**
- [x] Levantar servidor Express y enrutar carpetas estáticas (`HTML/CSS/JS`).
- [x] Programar lectura/escritura atómica segura en la carpeta `/data/`.

### Tarea 2: Autenticación, Registro y Cifrado Bcrypt (🔴 Alta)
**Asignado a:** I2
**Explicación de Desarrollo:** Se desarrollaron las APIs `/api/registro` y `/api/login`. En el registro, antes de manipular las cadenas de texto, se valida explícitamente el tipo de dato para prevenir crasheos del servidor (`typeof !== "string"`). Se implementó la librería `bcryptjs`, usando `await bcrypt.hash(password, 10)` para generar el hash de la contraseña antes de guardarla. La autenticación se conectó a `express-session`, almacenando el `userId` y `role` en la cookie activa de la petición.
**Subtareas:**
- [x] Desarrollar endpoint de registro con validaciones de tipo de dato y cifrado.
- [x] Configurar endpoint de login y enlazarlos al middleware de `express-session`.

### Tarea 3: Vistas de Acceso e Inscripción Frontend (🔴 Alta)
**Asignado a:** I3
**Explicación de Desarrollo:** Se programaron los archivos HTML (`acceso.html`, `inscripcion.html`) y su lógica JS (`acceso.js`). El código JS captura el evento `submit` nativo del DOM, previene el recargo de página (`e.preventDefault()`) y envía un objeto JSON a través de `fetch()`. Tras un login exitoso, una estructura de control `if/else if` redirige al usuario a `panel.html`, `control.html` o `admin_panel.html` dependiendo de si la variable `session.role` recibida de la API es aspirante, control_escolar o admin.
**Subtareas:**
- [x] Maquetar formularios de login y registro.
- [x] Conectar los formularios vía `fetch()` con redirección inteligente por rol.

---

## 🚩 Hito 2: Motor de Expediente y Subida Documental
*Objetivo: Permitir al estudiante vaciar sus datos y archivos probatorios de manera segura y controlada.*

### Tarea 4: Motor Backend de Carga de Archivos (Multer) (🔴 Alta)
**Asignado a:** I1
**Explicación de Desarrollo:** Se integró la librería `multer`. Se creó un `fileFilter` que lee la extensión (`path.extname`) y el tipo de contenido (`file.mimetype`), permitiendo únicamente `application/pdf`, `image/jpeg` y `image/png`. Se fijó un límite `limits: { fileSize: 5 * 1024 * 1024 }`. La API dinámica `/api/expediente/documentos/:tipo` extrae el archivo y, si un estudiante decide reemplazar un documento ya subido, el código utiliza `fs.unlinkSync` para borrar el archivo físico antiguo del disco duro para evitar archivos huérfanos.
**Subtareas:**
- [x] Configurar la instancia de Multer con filtros MIME y de peso.
- [x] Programar la API para guardar y sobreescribir archivos en la ruta dinámica del aspirante.

### Tarea 5: Interfaz del Expediente y Bloqueo Inteligente (🔴 Alta)
**Asignado a:** I4
**Explicación de Desarrollo:** Se desarrolló `expediente.js` con un alto nivel de interactividad. Para subir archivos, el JS utiliza un objeto `FormData()`, agregando el archivo físicamente (`fd.append('archivo', file)`) para no enviarlo como JSON. En la función `applyLockingLogic`, el frontend evalúa el `estado` actual: si está `en_revision` o `enviada`, itera todos los `<input>` inyectando la propiedad `disabled = true`. Si está `con_observaciones`, utiliza el método `filter` y `find` para comparar los campos del formulario con el arreglo de observaciones, habilitando en blanco los defectuosos e inyectando un nodo `div` rojo con el motivo.
**Subtareas:**
- [x] Consumir datos guardados y enviar nuevos archivos al servidor asíncronamente con FormData.
- [x] Programar lógica de bloqueo y desbloqueo de inputs de acuerdo a las observaciones previas.

### Tarea 6: Sistema de Diseño y Páginas Institucionales (🟡 Media)
**Asignado a:** I4
**Explicación de Desarrollo:** Antes de programar las lógicas complejas, se construyó el archivo `CSS/paginas.css` definiendo variables CSS (`--navy`, `--blue`, `--error`) y clases reutilizables (como los botones de anclaje `a.primary`). Con base en esta plantilla, se construyeron los archivos estáticos `oferta.html`, fichas de carreras y `ayuda.html`. Se aseguró que todas las páginas tuvieran enlaces cruzados que apunten al flujo del Hito 1 (Iniciar Sesión / Inscribirse).
**Subtareas:**
- [x] Desarrollar la hoja de estilos global con variables maestras.
- [x] Construir todas las vistas estáticas del portal para visitantes.

---

## 🚩 Hito 3: Plataforma de Dictamen y Gestión Escolar
*Objetivo: Herramientas para revisión documental del staff y configuración global de directivos.*

### Tarea 7: API de Dictamen y Transición de Estados (🔴 Alta)
**Asignado a:** I2
**Explicación de Desarrollo:** Se programó el endpoint `POST /api/control/solicitudes/:id/revisar`. En esta ruta, el código recibe un arreglo de decisiones enviadas por el staff. Se implementó una iteración sobre los documentos del aspirante; si una decisión es `rechazado`, se extrae el texto del campo observación (el cual es obligatorio). Dependiendo de si se detectó algún rechazo, el servidor muta manualmente la propiedad `estado` del usuario mutando la instancia JSON. Finalmente, el servidor inyecta (mediante `push`) un nuevo registro de objeto de bitácora en la propiedad `historial` del usuario.
**Subtareas:**
- [x] Programar la API que evalúa las revisiones y fuerza motivos de rechazo.
- [x] Automatizar la transición del estado final y el registro del historial (bitácora).

### Tarea 8: Interfaz y Modal de Control Escolar (🔴 Alta)
**Asignado a:** I5
**Explicación de Desarrollo:** Se diseñó `control.html` y su respectivo archivo JavaScript. Para evitar vulnerabilidades de tipo Cross-Site Scripting (XSS), la tabla dinámica que renderiza la lista de usuarios no se generó interpolando cadenas con `innerHTML`; en su lugar, se empleó `document.createElement('tr')` e inyección de datos con `textContent`. Se programó una ventana modal (Modal de HTML5 simulado con z-index alto en CSS) que, al abrirse, carga una etiqueta `<iframe>` del lado derecho inyectando la ruta estática hacia el PDF o Imagen del usuario dentro de `/uploads/`, permitiendo al staff ver el documento lado a lado con los Radio Buttons de evaluación.
**Subtareas:**
- [x] Prevenir vulnerabilidades XSS renderizando tablas con el uso estricto de nodos y textContent.
- [x] Desarrollar la ventana modal dividida (iframe para documentos + controles de dictamen JS).

### Tarea 9: Dashboard Administrativo e Indicadores (🟡 Media)
**Asignado a:** I5
**Explicación de Desarrollo:** Se construyó `admin_panel.html`. Desde `admin.js` se consume un endpoint que retorna la lista completa de todas las cuentas y la configuración global. A nivel frontend y backend se implementó el uso del método `.filter(u => u.role !== 'aspirante')` para segregar a los usuarios. Los datos se pintan en tarjetas tipo *Dashboard* actualizando el texto interno (número de aspirantes inscritos, carreras bloqueadas por cupo, documentos pendientes).
**Subtareas:**
- [x] Crear APIs de lectura general y agregación estadística en el backend.
- [x] Consumir la API y renderizar métricas totales y listas en la interfaz del Administrador.

### Tarea 10: Edición de Parámetros Globales (Fechas y Cupos) (🟢 Baja)
**Asignado a:** I3
**Explicación de Desarrollo:** Se agregaron formularios POST y PUT en el panel de Administración. A nivel de servidor, al intentar modificar la fecha de apertura o cierre de la convocatoria, se utiliza la expresión regular `const dateRegex = /^\d{4}-\d{2}-\d{2}$/` forzando un formato de fecha estricto, previniendo el almacenamiento de fechas inválidas en `config.json`. Adicionalmente, se programó la creación de cuentas staff, forzando la validación del correo y creando instantáneamente el usuario en el archivo de JSON con el rol deseado (`admin` o `control_escolar`).
**Subtareas:**
- [x] Programar APIs y Regex para modificar la configuración de las carreras y las fechas.
- [x] Habilitar la inserción (alta) de nuevas cuentas para empleados desde el panel interno.
