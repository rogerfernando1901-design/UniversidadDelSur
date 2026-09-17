# Requerimientos Funcionales del Sistema (UHS)

Este documento de Ingeniería de Software enumera y describe todos los Requerimientos Funcionales (RF) implementados en el Portal de la Universidad Horizonte del Sureste. El sistema está diseñado en una arquitectura monolítica con persistencia basada en archivos JSON estructurados.

---

## 1. Módulo de Autenticación y Cuentas de Usuario

*   **RF1.1 - Registro Público:** El sistema permite que usuarios públicos se registren creando una cuenta con su Nombre, Correo y Contraseña. Las cuentas creadas a través del portal público adquieren automáticamente el rol de `aspirante`.
*   **RF1.2 - Validación de Formatos:** El sistema debe validar en el *backend* que el correo electrónico cumpla con un patrón válido, y que los datos obligatorios no estén vacíos antes de procesarlos.
*   **RF1.3 - Cifrado de Contraseñas:** El sistema no guarda contraseñas en texto plano. Todas las contraseñas deben cifrarse utilizando un algoritmo hash robusto (`bcrypt` con salt de 10) antes de ser guardadas en la base de datos (`usuarios.json`).
*   **RF1.4 - Inicio de Sesión y Roles:** El sistema autentica a los usuarios verificando el correo y el hash de la contraseña. Una vez verificado, genera una cookie de sesión (`express-session`) identificando el usuario y su rol (`aspirante`, `control_escolar`, o `admin`).
*   **RF1.5 - Restricción de Rutas:** El sistema redirige automáticamente a los usuarios a sus respectivos paneles basándose en su rol, y bloquea activamente el acceso a APIs y páginas que no correspondan a sus privilegios.

## 2. Módulo de Expediente Electrónico (Aspirante)

*   **RF2.1 - Captura de Datos Personales:** El sistema permite al aspirante rellenar y guardar borradores de su información personal, como domicilio, teléfono, apellido materno/paterno, y la selección de la carrera de interés.
*   **RF2.2 - Subida de Documentos Obligatorios:** El sistema permite la subida de exactamente tres documentos probatorios: Acta de Nacimiento, Certificado de Bachillerato e Identificación Oficial.
*   **RF2.3 - Restricciones de Subida (Seguridad):** El servidor rechaza la carga de cualquier archivo que supere los 5 Megabytes, y valida a nivel de cabecera MIME que el archivo sea estrictamente un formato `PDF`, `PNG` o `JPEG`.
*   **RF2.4 - Transición de Estado a Enviado:** El sistema previene que un aspirante envíe su solicitud a revisión a menos que haya proporcionado los 3 archivos documentales y completado los datos marcados como obligatorios.
*   **RF2.5 - Bloqueo Inteligente de Edición:** El sistema congela/bloquea la interfaz gráfica del formulario (desactivando campos e inputs) si el estado de la solicitud es diferente a "Borrador" o "Con Observaciones".
*   **RF2.6 - Edición Selectiva de Correcciones:** Cuando el estado es "Con Observaciones", el sistema habilita (desbloquea) en la interfaz gráfica **únicamente** los campos o archivos que el equipo de revisión marcó explícitamente como defectuosos, inyectando el motivo del defecto en la pantalla, y manteniendo el resto de la información inmutable.

## 3. Módulo de Revisión y Dictamen (Control Escolar)

*   **RF3.1 - Bandeja de Solicitudes:** El sistema proporciona al personal de control escolar un listado dinámico (tabla) de todos los expedientes que se encuentran listos para revisión (Estado "Enviada" o "Con Observaciones").
*   **RF3.2 - Visualizador Integrado:** El personal puede consultar los datos escritos y visualizar los archivos PDF o imágenes directamente dentro del portal sin tener que descargarlos previamente.
*   **RF3.3 - Evaluación Individual de Elementos:** El sistema obliga al revisor a calificar por separado cada documento (Acta, Certificado, INE) y sección de datos. Puede marcarlos como "Aprobado" o "Rechazado".
*   **RF3.4 - Obligatoriedad de Motivos de Rechazo:** El sistema impide al revisor enviar su dictamen si ha marcado un elemento como "Rechazado" sin redactar en texto plano cuál fue la falla (observación).
*   **RF3.5 - Transición Automática Tras Revisión:** 
    *   Si el revisor aprueba todo, el sistema transiciona el estado del aspirante a `aprobada`.
    *   Si el revisor marca al menos un rechazo, el sistema transiciona el estado a `con_observaciones`.
*   **RF3.6 - Bitácora de Historial:** Toda acción de revisión, envío o cambio de estado genera una nota automática con fecha y hora que es visible tanto para el staff como para el aspirante en su panel.

## 4. Módulo de Configuración Global (Administrador)

*   **RF4.1 - Modificación de Fechas de Convocatoria:** El sistema permite al administrador editar la fecha de inicio, fecha de cierre de recepción, y fecha de cierre de correcciones, validando siempre el formato (`YYYY-MM-DD`).
*   **RF4.2 - Gestión de Oferta Académica y Cupos:** El administrador puede activar o desactivar carreras para ocultarlas de la oferta pública, así como modificar la cantidad máxima de lugares (cupos) permitidos.
*   **RF4.3 - Alta de Personal Interno:** El administrador puede registrar nuevas cuentas de usuario especificando si son Administradores o miembros de Control Escolar, quedando activas inmediatamente para inicio de sesión.
*   **RF4.4 - Métricas Operativas:** El dashboard del administrador compila y muestra estadísticas en vivo de los datos almacenados en los archivos JSON, informando la cantidad total de solicitudes en revisión, observadas, y completadas.

## 5. Módulo Público e Informativo (Front-End)

*   **RF5.1 - Páginas Estáticas Descriptivas:** El sitio provee URLs accesibles sin inicio de sesión para informar sobre la convocatoria, instrucciones de inscripción, requisitos, preguntas frecuentes y oferta académica.
*   **RF5.2 - Catálogo Dinámico de Carreras:** La página de inscripción extrae del backend los cupos disponibles y la disponibilidad real para bloquear automáticamente carreras que se encuentren sin cupo o inactivas.
*   **RF5.3 - Diseño Consistente:** Todas las interfaces del proyecto comparten un archivo CSS unificado (`paginas.css`), garantizando que la tipografía, barras de navegación y el esquema de colores de la institución se mantengan estables.
