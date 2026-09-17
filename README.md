# Portal de Inscripción - Universidad Horizonte del Sureste (UHS)

Este proyecto es una plataforma web desarrollada para gestionar el proceso de nuevo ingreso de aspirantes a la universidad. El sistema permite a los futuros estudiantes registrarse, capturar su información, subir documentación probatoria y revisar el estado de su solicitud. A su vez, el personal de control escolar puede revisar, dictaminar y aprobar estas solicitudes.

---

## 🚀 Cómo correr y usar el desarrollo

### Requisitos previos
Para ejecutar este proyecto de manera local, necesitas tener instalado en tu computadora:
- **Node.js** (versión 18 o superior). Puedes descargarlo desde [nodejs.org](https://nodejs.org/).

### Instalación
1. Abre una terminal (Símbolo del sistema, PowerShell o Git Bash).
2. Navega hasta la carpeta del proyecto (donde se encuentra este archivo y el archivo `package.json`):
   ```bash
   cd ruta/a/tu/carpeta/UniversidadDelSur
   ```
3. Instala las dependencias necesarias ejecutando:
   ```bash
   npm install
   ```
   *(Esto instalará Express, Multer, express-session, bcryptjs y demás librerías requeridas).*

### Ejecución
1. En la misma terminal, inicia el servidor con el siguiente comando:
   ```bash
   node index.js
   ```
2. Verás un mensaje en la terminal indicando que el servidor está corriendo en el puerto 3000.
3. Abre tu navegador web favorito (Chrome, Edge, Firefox, etc.) y visita:
   👉 **`http://localhost:3000`**

### Credenciales de Prueba por Defecto
El sistema pre-carga usuarios administrativos para que puedas probar los distintos roles.
- **Administrador del Sistema:**
  - Correo: `admin@uhs.edu.mx`
  - Contraseña: `admin1234admin`
- **Personal de Control Escolar:**
  - Correo: `control@uhs.edu.mx`
  - Contraseña: `control1234ctrl`

*(Para probar el rol de Aspirante, puedes registrar una cuenta nueva directamente en la página de inicio o en la sección de inscripción).*

---

## 🔄 Flujo del Sistema

El desarrollo está construido bajo una arquitectura monolítica con Node.js y Express, con una base de datos basada en archivos locales JSON (carpeta `data/`) para facilitar las demostraciones sin necesidad de configurar motores SQL.

El flujo principal se divide en tres actores o roles:

### 1. El Aspirante (Usuario Público)
- **Registro:** El usuario ingresa a la plataforma, revisa la oferta académica y se registra proporcionando un nombre, correo y contraseña.
- **Panel de Control:** Una vez dentro, ve una línea de tiempo y un botón para crear/editar su expediente.
- **Llenado de Expediente:** El aspirante llena sus datos generales (nombre, dirección, fecha de nacimiento, etc.) y selecciona la carrera a la que desea ingresar.
- **Subida de Documentos:** Sube sus archivos requeridos (Acta de Nacimiento, Certificado de Bachillerato, Identificación Oficial). *Formatos permitidos: PDF, JPG, PNG. Límite: 5MB.*
- **Envío:** Cuando ha completado todo y subido sus 3 documentos obligatorios, el sistema le permite cambiar el estado de la solicitud de "Borrador" a "Enviada".
- **Correcciones:** Si Control Escolar encuentra un error en un documento, el aspirante recibe el estado "Con Observaciones". La plataforma **bloquea** los campos aprobados y **solo le permite reemplazar el archivo o dato que fue rechazado**, asegurando la integridad del proceso.

### 2. Control Escolar (Administración Operativa)
- Ingresa mediante la URL de `acceso.html` con sus credenciales institucionales.
- Es redirigido automáticamente a su panel de gestión de solicitudes (`control.html`).
- **Bandeja de Entrada:** Ve una lista de todos los expedientes que están en estado "Enviada" o "Con Observaciones".
- **Revisión:** Entra al detalle de un aspirante. Visualiza los datos y puede abrir los documentos PDF o imágenes directamente en el navegador.
- **Dictamen:** Por cada documento y dato, Control Escolar puede marcarlo como "Aprobado" o "Rechazado". Si rechaza algo, el sistema le **obliga** a escribir un mensaje con la observación (ej. "El certificado está borroso").
- **Resolución:** Si todo está correcto, puede marcar el expediente como "Aprobada", lo que finaliza el trámite de validación para ese aspirante.

### 3. Administrador del Sistema (Configuración General)
- Ingresa de igual forma desde la página de acceso, pero es dirigido a `admin_panel.html`.
- **Panel de Métricas:** Visualiza un resumen (cantidad total de aspirantes, cuántos por carrera, documentos revisados, etc.).
- **Gestión de Fechas:** Puede modificar las fechas de apertura y cierre de la convocatoria, lo que bloquea o permite el ingreso de nuevos aspirantes en tiempo real.
- **Gestión de Cupos:** Puede abrir, cerrar o modificar el número de lugares disponibles por carrera académica.
- **Gestión de Personal:** Puede crear nuevas cuentas con rol de "admin" o "control_escolar" para sus compañeros de trabajo.

---

Este flujo asegura un proceso transparente, donde los expedientes físicos y las filas interminables se reemplazan por un proceso 100% auditable y digital, cumpliendo con el objetivo del proyecto planteado en la reunión de descubrimiento.
