# Requerimientos Funcionales del Sistema (UHS) - Detalle a Nivel Código

Este documento describe con absoluto detalle cada Requerimiento Funcional (RF) exigido por el proyecto, alineado de manera 1 a 1 con los **3 Hitos Principales** del desarrollo del Portal de la Universidad Horizonte del Sureste.

---

## 🚩 Hito 1: Sistema de Autenticación y Seguridad (Login)
*Soporte funcional para la arquitectura del Servidor, Base de Datos JSON y Gestión de Accesos (Alineado con Tareas 1, 2 y 3).*

### RF1.1 - Persistencia Atómica en Archivos
El sistema debe ser capaz de almacenar toda la información en archivos estáticos `.json`. El Requisito Funcional estricto exige que ninguna lectura o escritura se haga de manera insegura; el sistema debe escribir la memoria primero en un archivo `.tmp` temporal y luego sobreescribirlo usando el comando `renameSync` del sistema de archivos, asegurando la integridad si múltiples usuarios se registran al mismo segundo.

### RF1.2 - Autenticación con Bcrypt y Tipado Estricto
El sistema tiene prohibido guardar contraseñas que puedan ser legibles. Al recibir los datos, el sistema debe primero verificar el tipo de dato nativo del motor (`typeof`) para evitar caídas. Acto seguido, la contraseña debe enviarse al motor criptográfico `bcryptjs` forzando 10 iteraciones criptográficas (salt). Sólo el *hash* resultante será guardado. Durante el inicio de sesión, el sistema evalúa si el *hash* de la entrada coincide con el guardado en base de datos.

### RF1.3 - Manejo de Sesiones Activas
El sistema debe retener el estado de conexión sin exponer el password de vuelta al cliente. Para ello, el servidor debe despachar cookies seguras a través de `express-session`, almacenando a nivel de memoria RAM del servidor el `Id` del usuario y su respectivo Rol (`aspirante`, `control_escolar`, `admin`). El navegador cliente sólo guarda un ID de sesión ininteligible.

### RF1.4 - Enrutamiento Inteligente Post-Login
Al hacer submit del formulario (interrumpiendo la recarga de página nativa en Javascript), la plataforma debe analizar la respuesta JSON y realizar un redireccionamiento del lado del cliente evaluando el `role` retornado.
*   **Si es aspirante:** `window.location.href = /Paginas/panel.html`.
*   **Si es staff:** `window.location.href = /Paginas/control.html`.
*   **Si es directivo:** `window.location.href = /Paginas/admin_panel.html`.

---

## 🚩 Hito 2: Motor de Expediente y Subida Documental
*Soporte funcional para la Interfaz del Aspirante, Lógica de Subida y Bloqueos de Interfaz (Alineado con Tareas 4, 5 y 6).*

### RF2.1 - Inyección Segura de Archivos
El aspirante debe adjuntar sus evidencias documentales a través de un objeto Javascript `FormData` que viaja asíncronamente vía red (`fetch`). El servidor, mediante su motor de subida (`multer`), tiene como requerimiento rechazar la petición antes de guardarla si el flujo de bytes supera los 5 Megabytes (5 * 1024 * 1024).

### RF2.2 - Verificación MIME Dinámica
No basta con que el usuario envíe un archivo con terminación `.pdf`. El sistema funcionalmente extrae las cabeceras reales (MIME-Type) recibidas por protocolo HTTP. El sistema debe lanzar un error explícito en la pantalla del usuario si el archivo introducido es diferente de un archivo de documento (PDF) o imágenes convencionales de cámaras (JPEG, PNG).

### RF2.3 - Mantenimiento del Sistema de Archivos
Si el aspirante decide modificar su expediente y subir una nueva versión de su acta de nacimiento (antes de enviarlo), el sistema tiene el requerimiento funcional de buscar físicamente el primer archivo en el disco y destruirlo usando la orden `unlink` antes de sobreescribir la referencia JSON, salvaguardando así el espacio del servidor.

### RF2.4 - Congelamiento Preventivo de la Interfaz Visual (Bloqueo JS)
Una vez que el estado guardado del aspirante muta de `borrador` a `enviada`, toda la Interfaz HTML de captura debe entrar en un estado de congelamiento. El código del lado del cliente rastrea todos los selectores de tipo *input, textarea* y botones, inyectándoles la propiedad nativa de HTML `disabled`. El usuario puede ver, pero no clickear.

### RF2.5 - Habilitación Selectiva (Desbloqueo Inteligente)
Cuando el servidor contesta que el aspirante está `con_observaciones`, el sistema no puede desbloquear todo. Funcionalmente, el sistema cruza el listado de todos los *inputs* contra el historial de observaciones del servidor. Todo lo aprobado permanece congelado (`disabled=true`) y se desactiva el congelamiento **únicamente** en la fila observada, a la cual adicionalmente se le tiñe el borde de color rojo y se le adjunta textualmente abajo un mensaje con la orden que dejó Control Escolar, guiando al usuario.

### RF2.6 - Portal Informativo Cohesionado
El proyecto requiere páginas de acceso público (`oferta.html`, fichas de carreras, etc.) construidas con variables maestras globales en su código CSS, permitiendo centralizar paletas de color institucionales y ofreciendo links fluidos desde el *Front-Page* hacia las páginas de registro e inicio de sesión.

---

## 🚩 Hito 3: Plataforma de Dictamen y Gestión Escolar
*Soporte funcional para Revisiones Académicas, Paneles Estadísticos y Ediciones Globales (Alineado con Tareas 7, 8, 9 y 10).*

### RF3.1 - Transición Forzosa y Generación de Bitácoras
Cuando Control Escolar presiona "Dictaminar" tras revisar los PDFs del estudiante, la API recibe el arreglo. El sistema debe comprobar funcionalmente que en **todos** los rechazos marcados exista un texto del motivo explícito superior a 0 caracteres; de lo contrario aborta el guardado. Luego de evaluar y decidir el estado final, el servidor inyecta una cadena de texto (Nota + Fecha) en la matriz del `historial` JSON, proveyendo auditoría permanente de qué fecha y en qué estado se dejó un expediente.

### RF3.2 - Rendereo de Interfaz Anti-Vulnerabilidades
El módulo del Staff lista información proveniente del exterior (Aspirantes), lo cual es vector de ataque (Cross-Site Scripting). El sistema requiere que absolutamente cada fila y dato de la tabla en `control.html` se renderice aislando su texto. Bajo ninguna circunstancia un registro de nombre o dirección proveniente del backend será plasmado vía `.innerHTML`. Siempre se requerirá el uso de Nodos (`createElement`) asignándole valor puro a través de `.textContent`.

### RF3.3 - Visualizador Integrado Multipantalla
El personal evaluador no necesita descargar decenas de PDFs por día. El Requerimiento Funcional define una ventana virtual (Modal CSS) que hospede una etiqueta `<IFrame>`. El Javascript extrae la ruta URL de la nube local `/uploads/...` y la empotra en dicho cuadro, permitiendo hacer zoom o leer el PDF nativamente a la derecha, teniendo a la izquierda los botones (Radios) de Aprobado/Rechazado al instante.

### RF3.4 - Tableros de Administración y Filtrado de Entidades
La ruta `/api/admin/...` expone toda la inteligencia de los archivos del disco duro hacia el rol `admin`. El frontend tiene el requerimiento de filtrar (`filter(u => u.role !== "aspirante")`) la lista pura recibida del JSON y renderizar, como un panel de inteligencia en tarjetas cuadradas HTML, la sumatoria absoluta de lugares utilizados vs lugares restantes calculados matemáticamente.

### RF3.5 - Restricción Regex para Modificación de Fechas
Cuando el administrador modifica las fechas globales en que se admiten registros (Apertura, Cierre de Recepción, etc.), los datos se envían a `/api/admin/convocatoria`. El sistema obliga estrictamente a que se comparen dichos datos contra una Máscara Regular (RegEx): `/^\d{4}-\d{2}-\d{2}$/`. El servidor fallará arrojando Código de Error 400 si se envía cualquier texto diferente a un año, mes y día válidos.
