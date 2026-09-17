# Manual y Flujo del Sistema - Universidad Horizonte del Sureste

Este documento explica de principio a fin cómo funciona el desarrollo programado, cómo probarlo y la lógica técnica detrás de cada paso del proceso.

---

## 🛠️ Cómo Correr el Proyecto

1.  Abre tu terminal en la carpeta del proyecto.
2.  Instala las dependencias (solo la primera vez) con: `npm install`
3.  Inicia el servidor backend ejecutando: `node index.js`
4.  Abre en tu navegador la dirección: **`http://localhost:3000`**

### 🔑 Credenciales Base del Sistema
El sistema inicializa automáticamente dos cuentas principales para que puedas probar los paneles internos. 

*   **Administrador del Sistema (Rol: `admin`)**
    *   **Correo:** `admin@uhs.edu.mx`
    *   **Contraseña:** `admin1234admin`
*   **Control Escolar (Rol: `control_escolar`)**
    *   **Correo:** `control@uhs.edu.mx`
    *   **Contraseña:** `control1234ctrl`

*(Las contraseñas no están en texto plano en la base de datos, están fuertemente encriptadas usando la librería `bcryptjs` con 10 rondas de salt).*

---

## 🔄 Flujo Completo del Sistema Paso a Paso

El desarrollo fue programado utilizando **Node.js con Express** como cerebro central. En lugar de una base de datos pesada, el servidor lee y escribe en archivos locales `.json` (dentro de la carpeta `/data/`). Las sesiones se mantienen vivas usando `express-session` con cookies en el navegador.

A continuación se explica la ruta técnica y funcional del proyecto:

### Paso 1: El Portal Público (Front-End)
Cualquier visitante puede navegar por las páginas estáticas (Inicio, Oferta, Requisitos, etc.). Todo el diseño visual se controla mediante un único archivo maestro de estilos (`CSS/paginas.css`). Cuando el usuario está listo, hace clic en "Iniciar Inscripción".

### Paso 2: Registro e Inicio de Sesión (Seguridad)
Al registrarse, el aspirante introduce su correo y una contraseña. 
*   **Backend:** La ruta `/api/registro` recibe los datos, valida el formato del correo, cifra la contraseña usando `bcrypt` (haciendo imposible que nadie, ni los programadores, la conozcan) y guarda al usuario en `usuarios.json` asignándole automáticamente el rol de `aspirante`. 
*   Una vez registrado o logueado, se genera una cookie segura y el usuario es redirigido a su panel.

### Paso 3: Llenado del Expediente y Subida de Archivos
En su panel, el aspirante entra a la sección "Mi Expediente".
*   Rellena campos de texto (CURP, Domicilio, Fecha de Nacimiento) y selecciona su Carrera.
*   **Subida (Multer):** El aspirante debe subir obligatoriamente 3 archivos (Acta, Certificado, INE). El backend captura estos archivos mediante la librería `multer`. Se verifica que sean **PDF, JPG o PNG** y que pesen **menos de 5MB**. Si pasan la prueba, se guardan físicamente en el servidor dentro de `/uploads/[ID_USUARIO]/`.

### Paso 4: Envío y Bloqueo de la Solicitud
Cuando el expediente está completo, el aspirante da clic en "Enviar Solicitud".
*   El estado interno en la base de datos cambia de `borrador` a `enviada`.
*   **Javascript Frontend:** Detecta que el estado ya no es borrador y ejecuta un "bloqueo inteligente": desactiva todos los *inputs* de la pantalla, oscurece los botones de guardado y previene cualquier modificación adicional por parte del estudiante.

### Paso 5: Revisión de Control Escolar
El personal de la universidad entra a `acceso.html` e inicia sesión con el correo `control@uhs.edu.mx`. El sistema detecta su rol y lo envía a su bandeja de solicitudes.
*   **Evaluación:** Al abrir a un aspirante, ven los datos y los archivos en un visor dual.
*   **Regla de Negocio Estricta:** El revisor debe aprobar o rechazar cada documento. Si selecciona "Rechazar", el *frontend* le obliga a escribir el motivo exacto del rechazo (ej. "El acta está ilegible").
*   Al enviar el dictamen al servidor, si hubo rechazos, el estado cambia a `con_observaciones`. Si todo fue aprobado, cambia a `aprobada`.

### Paso 6: Corrección del Aspirante (Flujo Cíclico)
Si hubo un rechazo, el aspirante entra de nuevo a su expediente (estado `con_observaciones`).
*   **Desbloqueo Inteligente:** El código Javascript lee cuáles campos fueron rechazados. Mantiene bloqueado todo lo que Control Escolar ya aprobó (para evitar que se manipule), y **solamente desbloquea y resalta en color rojo** el campo o archivo específico que tiene el error, mostrando el mensaje que dejó el revisor.
*   El aspirante corrige el archivo y vuelve a enviar, regresando al Paso 4.

### Paso 7: Configuración de Administrador
El director o encargado de sistemas entra con `admin@uhs.edu.mx`.
*   El backend le entrega las métricas totales leyendo los JSON en vivo.
*   Desde ahí puede abrir o cerrar el periodo de inscripciones (modificando las fechas de la convocatoria).
*   Puede ajustar el "Cupo Máximo" de las carreras. Si una carrera se queda sin cupo, automáticamente desaparece del formulario de los aspirantes.
*   Puede crear nuevas cuentas con acceso administrativo para sus compañeros.
