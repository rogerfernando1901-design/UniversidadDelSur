# Requerimientos Funcionales del Sistema (UHS) - Detalle Técnico a Nivel Código

Este documento describe con absoluto rigor técnico cada **Requerimiento Funcional (RF)** implementado en la plataforma de inscripciones de la **Universidad Horizonte del Sureste (UHS)**. Cada requerimiento está documentado con su justificación funcional, los archivos involucrados, los métodos y funciones exactas del código, y los mecanismos de seguridad y validación aplicados.

---

## 🚩 Hito 1: Sistema de Autenticación, Seguridad y Gestión de Cuentas

Soporte funcional para la arquitectura del Servidor Express, capa de persistencia JSON atómica, control de sesiones, protección perimetral y validación de usuarios.

---

### RF1.1 - Persistencia Atómica en Archivos JSON
* **Objetivo:** Garantizar la integridad total de la base de datos basada en archivos (`data/*.json`), evitando la corrupción de datos por escrituras concurrentes o caídas del proceso en mitad de una operación I/O.
* **Archivos involucrados:** `index.js`
* **Implementación a nivel de código:**
  - Función `writeJSON(file, data)`:
    En lugar de sobrescribir el archivo directamente con `fs.writeFileSync`, el sistema crea primero un archivo temporal con sufijo `.tmp` (`const tmp = target + ".tmp"`). Una vez que el archivo temporal se escribió por completo en disco, se invoca de manera síncrona y atómica `fs.renameSync(tmp, target)`. Esto asegura que el sistema operativo reemplace el archivo original en una sola operación del sistema de archivos sin dejar archivos a medio escribir.
  - Función `readJSON(file)`:
    Envuelve la lectura en un bloque `try/catch`. Comprueba la existencia con `fs.existsSync(p)` y si el contenido está vacío o corrupto, captura el error (`JSON.parse`), registra el fallo en consola y retorna `null` para evitar que el proceso de Node.js se interrumpa.
  - Función `readList(file)`:
    Garantiza que las colecciones (`usuarios.json`, `expedientes.json`, `carreras.json`) siempre retornen un arreglo (`Array`), devolviendo `[]` si el archivo no existe o no contiene datos válidos.

---

### RF1.2 - Autenticación Criptográfica con Bcrypt y Tipado Estricto
* **Objetivo:** Proteger las credenciales de los usuarios impidiendo contraseñas legibles y ataques por inyección de tipos en Node.js.
* **Archivos involucrados:** `index.js`, `Java/acceso.js`, `Java/inscripcion.js`
* **Implementación a nivel de código:**
  - **Tipado estricto previo a manipulación:** En los endpoints `POST /api/registro`, `POST /api/login` y `POST /api/admin/usuarios`, el servidor comprueba explícitamente:
    ```javascript
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Datos de entrada inválidos." });
    }
    ```
    Esto evita caídas por llamadas a `.trim()` o `.length` si un atacante envía tipos no string (objetos, números, booleanos).
  - **Normalización y hashing:** Se limpia y normaliza el correo (`email.trim().toLowerCase()`). La contraseña se procesa a través del motor `bcryptjs` con un factor de costo de 10 rondas de salteo criptográfico (`await bcrypt.hash(password, 10)`).
  - **Verificación en login:** En `POST /api/login`, se consulta al usuario en `usuarios.json` y se comprueba la correspondencia con `await bcrypt.compare(password, user.passwordHash)`. Nunca se retorna información que distinga si falló el correo o la contraseña ("Correo o contraseña incorrectos", HTTP 401).

---

### RF1.3 - Manejo de Sesiones Activas y Destrucción Total de Cookies
* **Objetivo:** Mantener el estado de conexión del usuario sin exponer credenciales en el cliente y garantizar el cierre de sesión seguro tanto en memoria como en el navegador.
* **Archivos involucrados:** `index.js`, `Java/control.js`, `Java/admin.js`, `Java/acceso.js`, `Java/panel.js`, `Java/expediente.js`
* **Implementación a nivel de código:**
  - **Configuración de sesión:** `express-session` configurado con secreto desacoplado por variable de entorno (`process.env.SESSION_SECRET || "uhs-portal-dev-2026-secreto"`), cookie `httpOnly: true`, `sameSite: "lax"`, y duración de 8 horas (`maxAge: 8 * 60 * 60 * 1000`).
  - **Cierre de sesión seguro (`POST /api/logout`):** Destruye la sesión en el servidor con `req.session.destroy()` y limpia explícitamente la cookie en la cabecera de respuesta del cliente con `res.clearCookie("connect.sid")`.
  - **Botón visible de cierre de sesión (`#logout-btn`):** Implementado en los paneles de control escolar (`control.html`), administrador (`admin_panel.html`) y aspirante (`panel.html`, `expediente.html`), con estilos de alto contraste en `CSS/staff.css` para evitar el problema de texto blanco sobre fondo blanco.

---

### RF1.4 - Enrutamiento Inteligente por Roles Post-Login
* **Objetivo:** Redirigir al usuario automáticamente a su interfaz correspondiente según su perfil institucional.
* **Archivos involucrados:** `index.js`, `Java/acceso.js`, `Paginas/acceso.html`
* **Implementación a nivel de código:**
  - El backend resuelve en `POST /api/login` la URL de destino según `user.role`:
    - `aspirante` $\rightarrow$ `/Paginas/panel.html`
    - `control_escolar` $\rightarrow$ `/Paginas/control.html`
    - `admin` $\rightarrow$ `/Paginas/admin_panel.html`
  - En `Java/acceso.js`, la petición asíncrona redirige mediante `window.location.href = data.redirect`.
  - Al cargar `acceso.html`, si ya existe una sesión activa (`GET /api/sesion`), el script bloquea el formulario de login, muestra el banner `#active-session` indicando el usuario activo y ofrece enlaces directos a su panel o un botón para cambiar de cuenta.

---

### RF1.5 - Detección en Tiempo Real de Cuentas Existentes (Live Email Check)
* **Objetivo:** Evitar que un aspirante intente registrarse con un correo que ya posee una cuenta activa o que se confunda creyendo que el sistema no guardó su usuario, ofreciéndole una vía inmediata para iniciar sesión.
* **Archivos involucrados:** `index.js`, `Java/inscripcion.js`, `Paginas/inscripcion.html`, `Java/acceso.js`
* **Implementación a nivel de código:**
  - **Endpoint de verificación (`GET /api/verificar-correo`):**
    Recibe el parámetro query `?email=...`, normaliza la dirección y consulta `usuarios.json`. Responde `{ existe: true|false, email: "..." }`.
  - **Escucha en tiempo real en el frontend (`Java/inscripcion.js`):**
    Se conectan eventos `blur` y `input` con debounce de 350 milisegundos en el campo `#email`. Si el formato es válido (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) y el endpoint reporta `existe: true`:
    1. Se activa el contenedor `#email-exists-alert` con borde rojo y fondo `#FEF2F2`.
    2. Se marca el campo con `aria-invalid="true"` y borde de advertencia.
    3. Se inyecta un botón destacado: `Iniciar sesión con esta cuenta →` que redirige a `/Paginas/acceso.html?email=${encodeURIComponent(email)}`.
  - **Manejo de conflicto en submit (HTTP 409):**
    Si el usuario ignora la advertencia y pulsa "Crear cuenta", el servidor rechaza con código 409 (`{ error: "Ya existe una cuenta con ese correo.", existe: true }`), y el formulario muestra un banner de error bloqueando el envío y destacando el acceso a login.
  - **Prellenado automático en login (`Java/acceso.js`):**
    Al abrir `acceso.html`, `URLSearchParams` inspecciona el parámetro `?email=...`. Si existe, prellena el input `#email` y transfiere el foco directamente al campo de contraseña `#password`.

---

### RF1.6 - Rate Limiting en Memoria contra Ataques de Fuerza Bruta
* **Objetivo:** Proteger los endpoints críticos de autenticación contra abusos automatizados sin requerir dependencias externas pesadas.
* **Archivos involucrados:** `index.js`
* **Implementación a nivel de código:**
  - Middleware `rateLimit(maxRequests, windowMs)` implementado mediante una estructura `Map()` nativa.
  - La clave de rastreo es `req.ip || req.socket.remoteAddress`.
  - Se configuró `loginLimiter = rateLimit(100, 5 * 60 * 1000)` para permitir hasta 100 solicitudes cada 5 minutos por IP en las rutas `POST /api/login` y `POST /api/registro`. Si se rebasa la cuota, devuelve inmediatamente un código HTTP 429 con mensaje informativo: `"Demasiados intentos. Espera un momento antes de intentarlo de nuevo."`.

---

### RF1.7 - Cabeceras de Endurecimiento HTTP (Security Headers)
* **Objetivo:** Mitigar ataques comunes en navegadores web (Clickjacking, MIME Sniffing, Cross-Site Scripting y fuga de Referrer).
* **Archivos involucrados:** `index.js`
* **Implementación a nivel de código:**
  Middleware global en `app.use()` antes de servir cualquier recurso estático o ruta API:
  - `X-Content-Type-Options: nosniff`: Impide que el navegador interprete archivos con tipos MIME distintos a los declarados.
  - `X-Frame-Options: SAMEORIGIN`: Protege contra incrustaciones de tipo Clickjacking en dominios no autorizados (permitiendo iframes propios del sistema como el visor de documentos).
  - `X-XSS-Protection: 1; mode=block`: Fuerza la activación del filtro XSS nativo de los navegadores clásicos.
  - `Referrer-Policy: strict-origin-when-cross-origin`: Restringe el envío de rutas completas a orígenes externos.

---

## 🚩 Hito 2: Motor de Expediente, Captura, Validación CURP y Oferta Académica

Soporte funcional para la Interfaz del Aspirante, Lógica de Subida y Carga Documental, Validaciones Oficiales y Oferta Dinámica.

---

### RF2.1 - Inyección Segura y Almacenamiento Documental con Multer
* **Objetivo:** Permitir la subida de los tres documentos obligatorios (`acta_nacimiento`, `certificado_bachillerato`, `identificacion`) asegurando cuotas de almacenamiento y rutas aisladas por usuario.
* **Archivos involucrados:** `index.js`, `Java/expediente.js`, `Paginas/expediente.html`
* **Implementación a nivel de código:**
  - `multer.diskStorage`: Genera una carpeta única por aspirante basada en su `userId` dentro del directorio `uploads/` (`path.join(UPLOADS_DIR, req.session.userId)`).
  - El nombre del archivo en disco se estandariza según el tipo: `${req.params.tipo}${ext}` (ej. `acta_nacimiento.pdf`).
  - Límite estricto de tamaño (`limits: { fileSize: 5 * 1024 * 1024 }`): Peticiones que superen los 5 Megabytes son rechazadas automáticamente con error HTTP.

---

### RF2.2 - Verificación Doble de Tipo MIME y Extensión
* **Objetivo:** Evitar la subida de scripts maliciosos o ejecutables camuflados con extensiones falsas.
* **Archivos involucrados:** `index.js`
* **Implementación a nivel de código:**
  - El filtro `fileFilter` de Multer aplica una comprobación cruzada:
    ```javascript
    const allowedExt = [".pdf", ".jpg", ".jpeg", ".png"];
    const allowedMime = ["application/pdf", "image/jpeg", "image/png"];
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = allowedExt.includes(ext) && allowedMime.includes(file.mimetype);
    cb(ok ? null : new Error("Formato no permitido. Usa PDF, JPG o PNG."), ok);
    ```
  - Si alguna de las dos validaciones falla, se rechaza la carga antes de persistir cualquier byte en el almacenamiento local.

---

### RF2.3 - Limpieza de Archivos Huérfanos al Reemplazar Documentos
* **Objetivo:** Evitar el desperdicio de almacenamiento en disco cuando un aspirante sube una nueva versión de un documento previamente cargado.
* **Archivos involucrados:** `index.js`
* **Implementación a nivel de código:**
  - En el controlador de `POST /api/expediente/documentos/:tipo`, el backend verifica si en `expediente.documentos` ya existe un registro con el mismo `tipo`.
  - Si existe (`docIdx >= 0`), localiza físicamente el archivo anterior en la carpeta del usuario y lo elimina con `fs.unlinkSync(oldFile)` protegido en un bloque `try/catch` antes de registrar el nuevo archivo en la base de datos.

---

### RF2.4 - Congelamiento Preventivo de la Interfaz (Bloqueo JS)
* **Objetivo:** Prevenir modificaciones accidentales o no autorizadas una vez que el aspirante envió su solicitud a revisión o cuando ya fue aprobada/confirmada.
* **Archivos involucrados:** `Java/expediente.js`, `index.js`
* **Implementación a nivel de código:**
  - **En el cliente (`Java/expediente.js`):** La función `bloquearFormulario(bloqueado)` selecciona todos los inputs, selects, textareas y botones de subida de archivo. Si `["enviada", "en_revision", "aprobada", "confirmada"].includes(exp.estado)`, aplica la propiedad `disabled = true` a todos los controles, oculta los botones de guardado/envío y muestra un banner informativo con el estado actual.
  - **En el servidor (`index.js`):** En `PUT /api/expediente` y `POST /api/expediente/documentos/:tipo`, se rechaza con HTTP 400 cualquier intento de modificación si el expediente se encuentra en uno de los estados congelados.

---

### RF2.5 - Habilitación Selectiva para Corrección de Observaciones
* **Objetivo:** Guiar al aspirante de forma intuitiva cuando Control Escolar rechaza uno o más documentos o datos, permitiendo editar únicamente lo observado.
* **Archivos involucrados:** `Java/expediente.js`, `index.js`
* **Implementación a nivel de código:**
  - Si el expediente se encuentra en estado `con_observaciones`, el cliente desbloquea **exclusivamente** los campos o filas de documentos que tienen una observación pendiente (`!o.resuelto`).
  - Cada elemento observado se resalta con borde de advertencia (color rojo institucional), y se le inserta un bloque de alerta con el texto de la observación emitida por el revisor.
  - En el backend, `POST /api/expediente/documentos/:tipo` valida que si `exp.estado === "con_observaciones"`, el tipo de documento enviado corresponda a una observación no resuelta (`exp.observaciones.some(o => o.campo === req.params.tipo && !o.resuelto)`). De lo contrario, rechaza la operación con código 400.

---

### RF2.6 - Validación Oficial y Generador Asistido de CURP
* **Objetivo:** Cumplir con la norma oficial mexicana de la Clave Única de Registro de Población (CURP), admitiendo nacidos antes y después del año 2000, además de asistir al usuario en su cálculo automático.
* **Archivos involucrados:** `Paginas/expediente.html`, `Java/expediente.js`, `index.js`
* **Implementación a nivel de código:**
  - **Expresión Regular Oficial:**
    ```regex
    ^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$
    ```
    Soporta los 18 caracteres alfanuméricos oficiales, incluyendo el dígito diferenciador de siglo (`[A-Z\d]`).
  - **Formateo y saneamiento en vivo:** En el evento `input`, el script convierte automáticamente a mayúsculas y remueve caracteres no válidos (`e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')`).
  - **Generador Inteligente ("⚡ Generar con mis datos"):**
    Botón interactivo en `expediente.html` que ejecuta la función `generarCurpAuto()`. Toma los datos ya introducidos en el formulario:
    - 4 letras de nombres y apellidos (primera letra y primera vocal interna del primer apellido, primera letra del segundo apellido, primera letra del primer nombre ignorando nombres comunes como José/María).
    - 6 dígitos de fecha de nacimiento (`AAMMDD` extraídos del selector de fecha).
    - 1 letra de género (`H` o `M`).
    - 2 letras de entidad federativa (asignando por defecto `QR` para Quintana Roo o entidad detectada).
    - Primeras consonantes internas no iniciales de apellidos y nombre.
    - Homoclave provisional calculada.
    Inserta el resultado en el campo, dispara la validación y notifica al usuario con un toast de confirmación.

---

### RF2.7 - Oferta Académica Dinámica y Fichas de Carreras Universales
* **Objetivo:** Permitir que cualquier carrera nueva creada por el Administrador aparezca de forma automática en la oferta pública y cuente con su plan de estudios interactivo sin necesidad de crear archivos HTML estáticos manualmente.
* **Archivos involucrados:** `Paginas/oferta.html`, `Java/oferta.js`, `Pagina_principal.html`, `Java/index.js`, `Paginas/carrera.html`, `Java/carrera.js`, `index.js`
* **Implementación a nivel de código:**
  - **Consumo dinámico de `/api/carreras`:**
    Tanto `Pagina_principal.html` como `oferta.html` consultan en tiempo de ejecución la API pública `GET /api/carreras`. Renderizan las tarjetas con nombre, modalidad, campus, duración y badge de cupo disponible (`c.cupo - c.inscritos lugares`).
  - **Plantilla Dinámica Universal (`/Paginas/carrera.html?id=...`):**
    Recibe el identificador de la carrera en la URL (ej. `?id=arquitectura`, `?id=ingenieria_civil`, `?id=licenciatura_en_derecho`, `?id=sistemas`).
    El script `carrera.js`:
    1. Si la carrera existe en la base de datos `carreras.json`, extrae sus atributos (título, descripción, perfil de ingreso y egreso, campo laboral, modalidad y duración).
    2. Si la carrera incluye un arreglo de `planEstudios` o materias, lo renderiza organizado por periodos/cuatrimestres. Si es una carrera recién creada sin plan detallado, genera una malla curricular estructurada de 9 cuatrimestres con materias formativas, especializadas y talleres profesionales acordes al área disciplinar.
    3. Provee navegación contextual de retorno con el enlace `← Volver a Oferta Académica` que regresa a `oferta.html` sin perder el contexto.

---

### RF2.8 - Convocatoria Centralizada y Sincronización de Costos y Fechas
* **Objetivo:** Mantener sincronizadas todas las vistas públicas que anuncian los periodos y cuotas de la convocatoria vigente.
* **Archivos involucrados:** `index.js`, `data/convocatoria.json`, `Java/index.js`, `Paginas/convocatoria.html`, `Paginas/oferta.html`, `Pagina_principal.html`
* **Implementación a nivel de código:**
  - El archivo `data/convocatoria.json` centraliza los parámetros:
    `fechaApertura`, `fechaCierreRecepcion`, `fechaCierreCorrecciones`, `costo`, `cupoMaximoPorGrupo` y `periodo`.
  - El endpoint `GET /api/convocatoria` expone esta información públicamente.
  - Los scripts del frontend formatean las fechas en formato legible en español (ej. *"15 de noviembre de 2026"*) y actualizan los textos del costo del examen de admisión (ej. `"$1,200 MXN"`), reflejando inmediatamente cualquier cambio hecho por el Administrador.

---

### RF2.9 - Arquitectura de Navegación Contextual y Botones de Retorno Limpios
* **Objetivo:** Eliminar la duplicidad de controles de navegación (botones repetidos en cabecera y pie de página) y asegurar que el usuario siempre pueda regresar a la pantalla anterior adecuada.
* **Archivos involucrados:** Todas las páginas en `Paginas/*.html` y `CSS/paginas.css`
* **Implementación a nivel de código:**
  - Se eliminaron las redundancias donde coexistían botones duplicados arriba y abajo.
  - Se definieron reglas claras de retorno:
    - Páginas informativas públicas (`convocatoria.html`, `requisitos.html`, `ayuda.html`, `privacidad.html`): Enlace único en el encabezado `← Volver al inicio` hacia `/`.
    - Fichas de carreras (`carrera.html`, `sistemas.html`, `administracion.html`, `diseno.html`): Enlace específico `← Volver a Oferta Académica` hacia `/Paginas/oferta.html`.
    - Paneles de gestión (`control.html`, `admin_panel.html`): Enlace de navegación hacia el inicio acompañado del botón destacado `#logout-btn` para cierre de sesión.

---

## 🚩 Hito 3: Plataforma de Dictamen, Control Escolar y Panel de Administración

Soporte funcional para Revisiones Académicas, Visor Multipantalla de Documentos, Auditoría y Paneles Estadísticos.

---

### RF3.1 - Transición Forzosa de Estados y Bitácora de Auditoría en Historial
* **Objetivo:** Exigir justificación documental en cada rechazo y mantener una trazabilidad histórica imborrable de las revisiones de cada expediente.
* **Archivos involucrados:** `index.js`, `Java/control.js`
* **Implementación a nivel de código:**
  - **Validación de motivos en rechazos:**
    En `POST /api/control/solicitudes/:id/revisar`, el servidor itera sobre las decisiones recibidas. Si una decisión tiene `aprobado === false`, exige que `observacion` sea un string no vacío:
    ```javascript
    if (!r.aprobado && (!r.observacion || r.observacion.trim().length === 0)) {
      return res.status(400).json({ error: "Las observaciones de rechazo no pueden estar vacías." });
    }
    ```
  - **Determinación automática del estado:**
    Si todas las decisiones son aprobatorias y todos los documentos obligatorios fueron evaluados, el estado muta a `aprobada`. Si existe al menos un rechazo, el estado pasa a `con_observaciones`.
  - **Registro en historial:**
    Cada dictamen genera un nuevo registro en la matriz `expediente.historial`:
    `{ estado: nuevoEstado, fecha: new Date().toISOString(), nota: "Revisión realizada por Control Escolar" }`.
  - **Detección de correcciones en el reenvío:**
    En `POST /api/expediente/enviar`, se detecta si el estado previo era `con_observaciones`. En caso afirmativo, la nota del historial se etiqueta automáticamente como `"Correcciones enviadas"`, permitiendo auditar cuántas veces un aspirante ha reenviado su documentación.

---

### RF3.2 - Rendereo Seguro del DOM Anti-Vulnerabilidades (Protección contra XSS)
* **Objetivo:** Prevenir ataques de Cross-Site Scripting (XSS) al desplegar datos proporcionados externamente por los aspirantes en los paneles de Control Escolar y Administración.
* **Archivos involucrados:** `Java/control.js`, `Java/admin.js`, `Java/panel.js`
* **Implementación a nivel de código:**
  - Se eliminó la interpolación de variables directas mediante template strings en `.innerHTML` para datos de usuarios.
  - La construcción de tablas y resúmenes se realiza mediante la API nativa de nodos del DOM:
    ```javascript
    const tdNombre = document.createElement("td");
    tdNombre.textContent = s.nombreCompleto || "Sin nombre"; // Seguro contra XSS
    tr.appendChild(tdNombre);
    ```
  - Esto garantiza que caracteres maliciosos como `<script>`, `onerror=`, o `<iframe>` sean tratados estrictamente como texto plano por el motor de renderizado del navegador.

---

### RF3.3 - Visualizador de Documentos Integrado Multipantalla (Modal IFrame Side-by-Side)
* **Objetivo:** Optimizar el flujo de trabajo de Control Escolar permitiendo visualizar documentos y dictaminar en una misma pantalla sin abrir pestañas secundarias ni descargar archivos al equipo local.
* **Archivos involucrados:** `Paginas/control.html`, `Java/control.js`, `CSS/staff.css`, `index.js`
* **Implementación a nivel de código:**
  - **Servicio seguro de archivos (`GET /api/control/solicitudes/:id/documentos/:tipo/archivo`):**
    El backend valida la sesión y el rol (`requireRole("control_escolar", "admin")`), localiza el archivo en el sistema y lo transmite al navegador con la cabecera adecuada para previsualización (`res.sendFile`).
  - **Estructura Modal Flexbox en dos paneles (`Paginas/control.html` y `CSS/staff.css`):**
    - Contenedor `#doc-viewer-modal` con dimensiones optimizadas (`width: 92vw; height: 88vh;`).
    - **Panel izquierdo (Controles de Revisión):** Título del documento, nombre del aspirante, botones de opción radial (`Aprobar` / `Rechazar`), caja de texto para motivo de rechazo (que se despliega dinámicamente si se marca rechazar) y botón para guardar la decisión.
    - **Panel derecho (Visor embebido):** Etiqueta `<iframe id="doc-viewer-iframe">` que carga el PDF o imagen en alta resolución con soporte nativo de zoom y desplazamiento.
  - **Lógica de gestión de decisiones en memoria (`Java/control.js`):**
    Se utiliza un `Map()` (`viewerDecisions`). Al guardar una decisión en el visor, se actualiza la tarjeta correspondiente en la vista principal con un indicador visual (ej. `✓ Marcado como APROBADO` en verde o `✗ Marcado como RECHAZADO` en rojo). Al enviar el dictamen general, `submitReview()` recolecta todas las decisiones registradas en el visor.

---

### RF3.4 - Tableros de Administración, Estadísticas en Tiempo Real y Gestión de Cupos
* **Objetivo:** Proporcionar a la Dirección Académica y Administrativa una panorámica cuantitativa de la demanda de aspirantes, ocupación de carreras y estados de los trámites.
* **Archivos involucrados:** `index.js`, `Java/admin.js`, `Paginas/admin_panel.html`
* **Implementación a nivel de código:**
  - **Endpoint de estadísticas (`GET /api/admin/stats`):**
    Agrupa los datos del sistema calculando:
    1. `totalAspirantes`: Total de cuentas con rol `aspirante`.
    2. `expedientesPorEstado`: Conteo agrupado por cada estado (`borrador`, `enviada`, `con_observaciones`, `aprobada`, `confirmada`).
    3. `carrerasResumen`: Objeto clave-valor con los lugares disponibles calculados dinámicamente:
       `Object.fromEntries(carreras.map(c => [c.nombre, c.cupo - c.inscritos]))`.
  - **Renderizado de tarjetas métricas:** `Java/admin.js` genera dinámicamente las tarjetas métricas en el contenedor `#stats-container` mostrando los cupos disponibles por carrera y el total de inscritos confirmados.
  - **Filtrado estricto de usuarios internos:** En la pestaña de gestión de usuarios (`GET /api/admin/usuarios`), se aplica un filtro explícito (`u.role !== "aspirante"`) para listar y administrar únicamente al personal de Control Escolar y Administradores, evitando mezclar cientos de registros de aspirantes con las cuentas del personal.

---

### RF3.5 - Validación Regex y Tipado en Configuración de Convocatoria
* **Objetivo:** Proteger la coherencia cronológica de la convocatoria impidiendo fechas mal formadas o cupos negativos.
* **Archivos involucrados:** `index.js`, `Java/admin.js`
* **Implementación a nivel de código:**
  - En `PUT /api/admin/convocatoria`, se comprueban las fechas recibidas contra la expresión regular de fecha estándar:
    ```javascript
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const c of ["fechaApertura", "fechaCierreRecepcion", "fechaCierreCorrecciones"]) {
      if (req.body[c] !== undefined && typeof req.body[c] === "string" && !dateRegex.test(req.body[c])) {
        return res.status(400).json({ error: `Formato de fecha inválido para ${c}. Usa YYYY-MM-DD.` });
      }
    }
    ```
  - La propiedad `costo` está expresamente admitida dentro de la lista blanca de campos modificables (`const campos = ["fechaApertura", "fechaCierreRecepcion", "fechaCierreCorrecciones", "costo", ...]`).

---

### RF3.6 - Alta y Edición de Carreras con Validación de Duplicados
* **Objetivo:** Permitir la creación de nuevos programas educativos desde el panel administrativo, garantizando identificadores limpios y evitando nombres duplicados.
* **Archivos involucrados:** `index.js`, `Java/admin.js`
* **Implementación a nivel de código:**
  - En `POST /api/admin/carreras`:
    1. Se valida que el `cupo` sea un entero positivo mayor a cero:
       `const cupoNum = parseInt(cupo, 10); if (!Number.isInteger(cupoNum) || cupoNum <= 0) ...`
    2. Se sanitiza el identificador para generar un slug limpio:
       `const carreraId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");`
    3. Se comprueba duplicidad de nombre sin importar mayúsculas o minúsculas:
       `if (carreras.some(c => c.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())) return res.status(409)...`
    4. Se validan las modalidades admitidas (`Presencial`, `Escolarizada`, `Mixta`, `En línea`).
    5. Se guarda la carrera en `carreras.json` inicializando `inscritos: 0`. Inmediatamente la carrera queda disponible en toda la oferta institucional del portal.

---

## 📊 Matriz de Trazabilidad Técnica

| Requerimiento Funcional | Archivos Principales | Funciones / Endpoints Clave | Mecanismo de Seguridad / Verificación |
| :--- | :--- | :--- | :--- |
| **RF1.1 Persistencia Atómica** | `index.js` | `writeJSON`, `readJSON`, `readList` | Archivos temporales `.tmp` y `fs.renameSync` |
| **RF1.2 Criptografía y Tipado** | `index.js` | `bcryptjs.hash`, `bcryptjs.compare` | Tipado estricto `typeof` y salteo a 10 rondas |
| **RF1.3 Sesiones y Logout** | `index.js`, `Java/control.js` | `express-session`, `POST /api/logout` | `httpOnly`, `res.clearCookie("connect.sid")` |
| **RF1.4 Enrutamiento por Roles** | `index.js`, `Java/acceso.js` | `POST /api/login`, `GET /api/sesion` | Redirección basada en claim de sesión validado |
| **RF1.5 Live Email Check** | `index.js`, `Java/inscripcion.js` | `GET /api/verificar-correo`, `checkEmail` | Debounce 350ms, alerta en vivo y link a login |
| **RF1.6 Rate Limiting** | `index.js` | `rateLimit`, `loginLimiter` | `Map` en memoria, cuota 100 req / 5 min, HTTP 429 |
| **RF1.7 Security Headers** | `index.js` | Middleware global `app.use` | `nosniff`, `SAMEORIGIN`, `strict-origin` |
| **RF2.1 Subida con Multer** | `index.js` | `multer.diskStorage`, `upload.single` | Aislamiento por `userId`, tope estricto 5 MB |
| **RF2.2 Validación MIME/Ext** | `index.js` | `fileFilter` | Cruce estricto de extensión y cabecera MIME |
| **RF2.3 Limpieza de Huérfanos** | `index.js` | `POST /api/expediente/documentos/:tipo` | `fs.unlinkSync` de archivos previos antes de guardar |
| **RF2.4 Congelamiento de UI** | `Java/expediente.js` | `bloquearFormulario`, `PUT /api/expediente` | Atributo `disabled` masivo en estados congelados |
| **RF2.5 Desbloqueo Selectivo** | `Java/expediente.js` | Manejo de estado `con_observaciones` | Desbloqueo condicionado a `!o.resuelto` |
| **RF2.6 Validación y Generador CURP** | `Java/expediente.js` | `generarCurpAuto`, validación Regex | Regex oficial mexicano pre/post 2000 |
| **RF2.7 Oferta Dinámica y Fichas** | `Java/carrera.js`, `oferta.js` | `GET /api/carreras`, `/Paginas/carrera.html` | Renderizado dinámico de mallas curriculares |
| **RF2.8 Convocatoria Central** | `index.js`, `data/convocatoria.json` | `GET /api/convocatoria`, `PUT ...` | Sincronización en vivo de fechas y costo |
| **RF2.9 Navegación Contextual** | `Paginas/*.html`, `CSS/paginas.css` | Enlaces contextuales y botón `#logout-btn` | Deduplicación de controles y contraste CSS |
| **RF3.1 Dictámenes y Bitácoras** | `index.js`, `Java/control.js` | `POST .../revisar`, `POST .../enviar` | Motivos obligatorios y bitácora en `historial` |
| **RF3.2 Rendereo Anti-XSS** | `Java/control.js`, `admin.js` | `createElement`, `textContent` | Inserción pura de texto sin interpolar HTML |
| **RF3.3 Visor Multipantalla IFrame**| `Java/control.js`, `control.html` | `openDocViewer`, `viewerDecisions` | Modal responsive side-by-side con streaming seguro |
| **RF3.4 Estadísticas y Cupos** | `index.js`, `Java/admin.js` | `GET /api/admin/stats` | Cálculo matemático de cupos y filtro no-aspirantes |
| **RF3.5 Validación de Convocatoria**| `index.js` | `PUT /api/admin/convocatoria` | Regex estricto `YYYY-MM-DD` y lista blanca |
| **RF3.6 Gestión de Carreras** | `index.js`, `Java/admin.js` | `POST /api/admin/carreras` | Validación de enteros, slug y nombres únicos |
