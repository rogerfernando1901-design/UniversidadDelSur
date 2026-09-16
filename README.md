# Portal UHS · Página principal e inicio de inscripción

Universidad Horizonte del Sureste (institución ficticia). Proyecto académico de gestión ágil.

## Ejecutar

1. Instala un **JDK 17 o superior** si no lo tienes. Comprueba `java --version`.
2. En VS Code, abre la carpeta `GestionAgil2` y selecciona **Terminal → Nueva terminal**. Entra en la carpeta que contiene `Main.java`:

```powershell
cd UniversidadDelSur
```

   Si la terminal ya está en `UniversidadDelSur`, omite este comando.
3. Ejecuta:

```sh
java Main.java
```

4. Abre **http://localhost:8080** en tu navegador. Mantén la terminal abierta.
5. Para detenerlo, presiona **Ctrl+C** en la terminal.

Si el puerto está ocupado, ejecuta `java Main.java 8081` y abre http://localhost:8081.
No requiere Maven, Gradle, una base de datos ni paquetes externos. No necesitas ejecutar Node ni instalar paquetes con npm. No abras `Paginas/Pagina_principal.html` con doble clic: utiliza el servidor Java. Tanto `/` como `/index.html` muestran la página principal.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| Main.java | Servidor HTTP Java local y entrega de archivos. |
| Paginas/Pagina_principal.html | Estructura y contenido de la página. |
| CSS/Pagina_principal.css | Paleta, tipografía y diseño adaptable. |
| Java/index.js | Rutas fijas de navegación y menú móvil. |
| Paginas/inscripcion.html | Pantalla inicial de registro del aspirante. |
| CSS/inscripcion.css | Estilos del registro; reutiliza la paleta de la portada. |
| Java/inscripcion.js | Validación del correo, contraseña y confirmación; controles de visibilidad. |

El `index.js` de la raíz y la configuración de Node se conservan; el servidor Java utiliza `Java/index.js` para las interacciones de la página.

Java ejecuta el servidor. HTML, CSS y JavaScript componen la interfaz del navegador; Java y JavaScript son lenguajes diferentes. Esta separación permite conectar los módulos al servidor más adelante.

## Qué funciona ahora

- Iniciar inscripción abre el formulario de registro: correo válido, contraseña de 12 a 128 caracteres y confirmación coincidente. Los errores aparecen junto a cada campo y en un resumen con foco y enlaces; los datos válidos se conservan al corregir.
- Mostrar/ocultar contraseñas y revisar el formato de los datos. Esta etapa solo implementa la interfaz: no crea cuentas, no envía correos ni guarda credenciales en el servidor o en almacenamiento local.
- Página pública con oferta académica, convocatoria, requisitos y orientación.
- Los botones de contenido navegan a rutas fijas; si el archivo todavía no existe, se muestra un aviso HTTP 404 con un enlace al inicio.
- Accesos a páginas futuras de las tres carreras de ejemplo.
- Menú adaptable a celular.
- Navegación por teclado, enlace para saltar al contenido y foco visible.
- Recursos locales: sin fuentes externas, rastreadores o dependencias de terceros.

## Integración de las páginas del equipo

Cada compañero debe crear su HTML con el nombre exacto de esta tabla dentro de `UniversidadDelSur/Paginas`. Los botones ya apuntan a estas rutas: no hace falta modificar la portada, el JavaScript ni el servidor al agregar los archivos.

| Botón | Ruta y archivo esperado |
|---|---|
| Oferta académica | `/Paginas/oferta.html` |
| Requisitos / Consultar requisitos | `/Paginas/requisitos.html` |
| Ayuda / Recibir ayuda | `/Paginas/ayuda.html` |
| Ingresar | `/Paginas/acceso.html` |
| Iniciar inscripción | `/Paginas/inscripcion.html` |
| Ya tengo una solicitud | `/Paginas/seguimiento.html` |
| Ver información de la convocatoria | `/Paginas/convocatoria.html` |
| Privacidad | `/Paginas/privacidad.html` |
| Acceso de personal | `/Paginas/personal.html` |
| Conocer Ingeniería en Sistemas | `/Paginas/sistemas.html` |
| Conocer Administración | `/Paginas/administracion.html` |
| Conocer Diseño Gráfico | `/Paginas/diseno.html` |

Java sirve automáticamente los archivos `.html` de `Paginas`, `.css` de `CSS` y `.js` de `Java`, incluyendo subcarpetas. Usa rutas absolutas para los recursos, por ejemplo `/CSS/inscripcion.css` y `/Java/inscripcion.js`, y scripts externos. No se exponen los archivos de la raíz ni `node_modules`.

Hasta que el compañero agregue el archivo, su URL devuelve HTTP 404 con un aviso y un enlace para volver al inicio. Al agregarlo, basta con recargar la página; no es necesario reiniciar Java por cambios en HTML, CSS o JavaScript. Reinicia el servidor una vez después de actualizar `Main.java` (Ctrl+C y `java Main.java`). Los futuros formularios y servicios de datos requieren su propia implementación.

El botón Menú conserva su función de abrir y cerrar la navegación móvil; Escape también la cierra.

## Relación con los requerimientos

| Requerimiento | Cobertura de esta entrega |
|---|---|
| RF01: oferta y convocatoria | Interfaz pública implementada; catálogo de ejemplo y fechas/costos por confirmar. Aún no hay apertura o cierre de solicitudes en servidor. |
| RF02: cuenta y acceso | Pantalla de registro con validaciones de interfaz. Pendientes: persistencia, verificación de correo, acceso, recuperación y validaciones de servidor. |
| RF03–RF05: borrador, documentos y envío | Destinos previstos en inscripción y requisitos; sin formularios, carga ni persistencia. |
| RF06–RF10: observaciones, pago, resolución, seguimiento y constancia | Entrada Ya tengo una solicitud; dirige a la página futura de seguimiento. |
| RF11–RF12: administración, consulta y auditoría | Entrada Acceso de personal con una ruta a la página futura del personal. |

Los botones de operaciones internas aparecerán en sus paneles correspondientes cuando se construyan. No es necesario saturar la página pública con acciones de Tesorería o Administración. No se simulan pagos, cuentas creadas, autenticación ni inscripciones exitosas.

## Diseño aplicado

Azul institucional #17365D; acción #1D4ED8; texto #111827; secundario #475569; fondo #F8FAFC; blanco #FFFFFF; bordes de controles #64748B. Colores previstos para futuras validaciones: éxito #166534, advertencia #92400E, error #B91C1C.

Tipografía del sistema, cuerpo de 16 px, secciones de 24 px, tarjetas de 20 px. El título principal usa 32–52 px según ancho. Contenido útil máximo de 1120 px, márgenes móviles de 16 px. Botones con altura mínima de 44 px y foco azul visible.

## Personalizar y continuar

Para abrir el registro, ejecuta `java Main.java` desde `UniversidadDelSur` y pulsa **Iniciar inscripción** en la portada, o visita `http://localhost:8080/Paginas/inscripcion.html`. Usa el servidor actualizado que permite servir los archivos de `Paginas`, `CSS` y `Java`.

Prueba con datos ficticios: envía vacío para ver los errores, introduce un correo incorrecto, una contraseña de menos de 12 caracteres y una confirmación diferente. Después prueba `aspirante@example.com` y una frase de 12 a 128 caracteres repetida en ambos campos. El resultado indica que el formato es válido y que todavía no se ha creado una cuenta. El enlace **Ingresar** conserva `/Paginas/acceso.html`, pendiente de implementación. No se solicitan aún datos personales ni archivos del expediente.

- Cambia nombre, textos generales y tarjetas en `Paginas/Pagina_principal.html`.
- Cambia la paleta en las variables `:root` de `CSS/Pagina_principal.css`.
- Las rutas de los botones están centralizadas en `Java/index.js`. Conserva los nombres acordados en la tabla siguiente.
- Usa los atributos `data-panel` y `data-career` como puntos de conexión de las siguientes entregas.
- Siguiente módulo sugerido: registro e inicio de sesión, con validación de servidor y persistencia. Después, solicitud y documentos.

La universidad debe aprobar catálogo, documentos, costos, calendario y contacto. El 2 de octubre es la fecha de entrega académica, no una fecha de admisiones.

## Límite de esta versión

Es una base funcional local de la portada, no un sistema de inscripciones listo para recibir datos reales. El servidor escucha solo en el equipo local. Una publicación posterior requerirá alojamiento, HTTPS, configuración de producción y los controles de seguridad de los módulos que se implementen.

## Verificación de esta entrega

Registro: sintaxis de `Java/inscripcion.js` comprobada y validaciones probadas con DOM simulado (campos vacíos, correo inválido, contraseñas de 11/12/128/129 caracteres, coincidencia, conservación de valores, foco y mostrar/ocultar). HTML, CSS y JavaScript entregados por Java con HTTP 200 y contenido idéntico al archivo local. No se ha realizado una revisión visual en navegador real.

Integración de botones comprobada: los 14 botones de contenido invocan la navegación a su destino esperado mediante una prueba de JavaScript con DOM simulado. El servidor actualizado se probó en el puerto 8081: portada y recursos con HTTP 200, un HTML temporal agregado sin cambiar el servidor con HTTP 200, y rutas pendientes o fuera de las carpetas públicas con HTTP 404. El archivo temporal se eliminó. No se probaron clics en un navegador real.

Comprobado en este entorno con JDK 25: arranque mediante `java Main.java` y respuestas HTTP 200 en `http://localhost:8080/`, `/index.html`, `/CSS/Pagina_principal.css` y `/Java/index.js`, con tipos de contenido correctos y contenido idéntico a los archivos locales. El requisito del proyecto sigue siendo JDK 17 o superior; no se repitió la prueba con JDK 17. No se realizó una revisión visual ni de clics en un navegador.

Al abrirlo, comprueba: cada botón de contenido cambia a la URL acordada; el aviso de página pendiente permite volver al inicio; el menú funciona en pantalla pequeña; Tab permite recorrer los controles; no hay desplazamiento horizontal con anchos de 360, 768 y 1440 px ni pérdida de contenido al ampliar el navegador al 200 %.
