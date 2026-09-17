"use strict";
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

/* ═══════════════════════════════════════════════════════════
   Almacenamiento JSON en disco
   ═══════════════════════════════════════════════════════════ */
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function readJSON(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return null;
  try {
    const content = fs.readFileSync(p, "utf-8").trim();
    return content ? JSON.parse(content) : null;
  } catch (err) {
    console.error(`Error leyendo ${file}:`, err.message);
    return null;
  }
}
function writeJSON(file, data) {
  const target = path.join(DATA_DIR, file);
  const tmp = target + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, target);
}
function readList(file) { return readJSON(file) || []; }
function readObj(file)  { return readJSON(file) || {}; }

/* ── Datos iniciales ────────────────────────────────────── */
function initData() {
  if (!readJSON("usuarios.json")) {
    const hash = bcrypt.hashSync("admin1234admin", 10);
    writeJSON("usuarios.json", [
      { id: uuidv4(), email: "admin@uhs.edu.mx", passwordHash: hash, role: "admin", nombre: "Administrador UHS", verified: true, createdAt: new Date().toISOString() },
      { id: uuidv4(), email: "control@uhs.edu.mx", passwordHash: bcrypt.hashSync("control1234ctrl", 10), role: "control_escolar", nombre: "Control Escolar", verified: true, createdAt: new Date().toISOString() }
    ]);
  }
  if (!readJSON("expedientes.json")) writeJSON("expedientes.json", []);
  if (!readJSON("convocatoria.json")) {
    writeJSON("convocatoria.json", {
      activa: true,
      fechaApertura: "2026-09-15",
      fechaCierreRecepcion: "2026-10-15",
      fechaCierreCorrecciones: "2026-10-22"
    });
  }
  if (!readJSON("carreras.json")) {
    writeJSON("carreras.json", [
      { id: "sistemas", nombre: "Ingeniería en Sistemas Computacionales", campus: "Campus Central", modalidad: "Presencial", cupo: 40, inscritos: 0 },
      { id: "administracion", nombre: "Licenciatura en Administración", campus: "Campus Central", modalidad: "Presencial", cupo: 40, inscritos: 0 },
      { id: "diseno", nombre: "Licenciatura en Diseño Gráfico", campus: "Campus Central", modalidad: "Presencial", cupo: 35, inscritos: 0 }
    ]);
  }
}
initData();

/* ═══════════════════════════════════════════════════════════
   Middleware global
   ═══════════════════════════════════════════════════════════ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "uhs-portal-dev-2026-secreto",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" }
}));

/* ── Subida de archivos ─────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.session.userId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.params.tipo}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = [".pdf", ".jpg", ".jpeg", ".png"];
    const allowedMime = ["application/pdf", "image/jpeg", "image/png"];
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = allowedExt.includes(ext) && allowedMime.includes(file.mimetype);
    cb(ok ? null : new Error("Formato no permitido. Usa PDF, JPG o PNG."), ok);
  }
});

/* ── Autenticación ──────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "No autenticado. Inicia sesión." });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: "No autenticado." });
    if (!roles.includes(req.session.role)) return res.status(403).json({ error: "No tienes permisos para esta acción." });
    next();
  };
}

/* ═══════════════════════════════════════════════════════════
   Archivos estáticos
   ═══════════════════════════════════════════════════════════ */
app.use("/CSS", express.static(path.join(__dirname, "CSS")));
app.use("/Java", express.static(path.join(__dirname, "Java")));
app.use("/Paginas", express.static(path.join(__dirname, "Paginas")));

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "Paginas", "Pagina_principal.html")));
app.get("/index.html", (_req, res) => res.redirect("/"));

/* ═══════════════════════════════════════════════════════════
   API — Autenticación
   ═══════════════════════════════════════════════════════════ */

// Registro de aspirante
app.post("/api/registro", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Datos de entrada inválidos." });
  }
  const emailNorm = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return res.status(400).json({ error: "Escribe un correo electrónico válido." });
  if (emailNorm.length > 254) return res.status(400).json({ error: "El correo es demasiado largo." });
  if (password.length < 12 || password.length > 128) return res.status(400).json({ error: "La contraseña debe tener entre 12 y 128 caracteres." });

  const hash = await bcrypt.hash(password, 10);
  const usuarios = readList("usuarios.json");
  if (usuarios.find(u => u.email === emailNorm)) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo." });
  }
  const user = {
    id: uuidv4(), email: emailNorm, passwordHash: hash,
    role: "aspirante", nombre: "", verified: true,
    createdAt: new Date().toISOString()
  };
  usuarios.push(user);
  writeJSON("usuarios.json", usuarios);

  // Crear expediente vacío
  const expedientes = readList("expedientes.json");
  expedientes.push({
    id: uuidv4(), userId: user.id, folio: null,
    estado: "borrador",
    datos: { nombre: "", apellidoPaterno: "", apellidoMaterno: "", fechaNacimiento: "", telefono: "", domicilio: "", bachillerato: "", curp: "", carrera: "" },
    documentos: [],
    observaciones: [],
    historial: [{ estado: "borrador", fecha: new Date().toISOString(), nota: "Cuenta creada" }],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), submittedAt: null
  });
  writeJSON("expedientes.json", expedientes);

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.email = user.email;
  req.session.nombre = user.nombre || user.email;
  res.json({ ok: true, message: "Cuenta creada. En un entorno real se enviaría un correo de verificación.", redirect: "/Paginas/panel.html" });
});

// Inicio de sesión
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Datos de entrada inválidos." });
  }
  const emailNorm = email.trim().toLowerCase();
  const usuarios = readList("usuarios.json");
  const user = usuarios.find(u => u.email === emailNorm);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos." });
  }
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.email = user.email;
  req.session.nombre = user.nombre || user.email;

  let redirect = "/Paginas/panel.html";
  if (user.role === "control_escolar") redirect = "/Paginas/control.html";
  if (user.role === "admin") redirect = "/Paginas/admin_panel.html";
  res.json({ ok: true, redirect });
});

// Cerrar sesión
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Estado de sesión
app.get("/api/sesion", (req, res) => {
  if (!req.session.userId) return res.json({ autenticado: false });
  res.json({ autenticado: true, userId: req.session.userId, role: req.session.role, email: req.session.email, nombre: req.session.nombre });
});

/* ═══════════════════════════════════════════════════════════
   API — Pública
   ═══════════════════════════════════════════════════════════ */

app.get("/api/convocatoria", (_req, res) => {
  res.json(readObj("convocatoria.json"));
});

app.get("/api/carreras", (_req, res) => {
  const carreras = readList("carreras.json");
  res.json(carreras.map(c => ({ ...c, disponible: c.cupo - c.inscritos })));
});

/* ═══════════════════════════════════════════════════════════
   API — Expediente del aspirante
   ═══════════════════════════════════════════════════════════ */

// Obtener mi expediente
app.get("/api/expediente", requireRole("aspirante"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const exp = expedientes.find(e => e.userId === req.session.userId);
  if (!exp) return res.status(404).json({ error: "No se encontró tu expediente." });
  res.json(exp);
});

// Guardar borrador
app.put("/api/expediente", requireRole("aspirante"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const idx = expedientes.findIndex(e => e.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: "No se encontró tu expediente." });

  const exp = expedientes[idx];
  if (["enviada", "en_revision", "aprobada", "confirmada"].includes(exp.estado)) {
    return res.status(400).json({ error: "Tu solicitud ya fue enviada y no se puede editar libremente." });
  }

  const campos = ["nombre", "apellidoPaterno", "apellidoMaterno", "fechaNacimiento", "telefono", "domicilio", "bachillerato", "curp", "carrera"];

  // Si tiene observaciones, solo se pueden editar campos señalados
  if (exp.estado === "con_observaciones") {
    const camposPermitidos = exp.observaciones.filter(o => !o.resuelto).map(o => o.campo);
    for (const key of Object.keys(req.body.datos || {})) {
      if (campos.includes(key) && camposPermitidos.includes(key)) {
        exp.datos[key] = req.body.datos[key];
      }
    }
  } else {
    for (const key of campos) {
      if (req.body.datos && req.body.datos[key] !== undefined) {
        exp.datos[key] = req.body.datos[key];
      }
    }
  }

  // Actualizar nombre en sesión
  if (exp.datos.nombre) {
    const usuarios = readList("usuarios.json");
    const uIdx = usuarios.findIndex(u => u.id === req.session.userId);
    if (uIdx !== -1) {
      usuarios[uIdx].nombre = `${exp.datos.nombre} ${exp.datos.apellidoPaterno || ""}`.trim();
      writeJSON("usuarios.json", usuarios);
      req.session.nombre = usuarios[uIdx].nombre;
    }
  }

  exp.updatedAt = new Date().toISOString();
  expedientes[idx] = exp;
  writeJSON("expedientes.json", expedientes);
  res.json({ ok: true, expediente: exp });
});

// Enviar solicitud
app.post("/api/expediente/enviar", requireRole("aspirante"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const idx = expedientes.findIndex(e => e.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: "No se encontró tu expediente." });

  const exp = expedientes[idx];
  if (exp.estado !== "borrador" && exp.estado !== "con_observaciones") {
    return res.status(400).json({ error: "Tu solicitud ya fue enviada." });
  }

  // Verificar convocatoria abierta
  const conv = readObj("convocatoria.json");
  if (!conv.activa) return res.status(400).json({ error: "La convocatoria no está activa." });
  const hoy = new Date().toISOString().slice(0, 10);
  if (conv.fechaCierreRecepcion && hoy > conv.fechaCierreRecepcion && exp.estado === "borrador") {
    return res.status(400).json({ error: "El periodo de recepción ha cerrado." });
  }
  if (conv.fechaCierreCorrecciones && hoy > conv.fechaCierreCorrecciones && exp.estado === "con_observaciones") {
    return res.status(400).json({ error: "El periodo de correcciones ha cerrado." });
  }

  // Validar campos obligatorios
  const obligatorios = ["nombre", "apellidoPaterno", "fechaNacimiento", "telefono", "bachillerato", "carrera"];
  const faltantes = obligatorios.filter(c => !exp.datos[c] || !exp.datos[c].trim());
  if (faltantes.length) {
    return res.status(400).json({ error: "Faltan campos obligatorios.", faltantes });
  }

  // Verificar cupo
  const carreras = readList("carreras.json");
  const carrera = carreras.find(c => c.id === exp.datos.carrera);
  if (!carrera) return res.status(400).json({ error: "La carrera seleccionada no es válida." });
  if (carrera.cupo - carrera.inscritos <= 0) return res.status(400).json({ error: `La carrera ${carrera.nombre} no tiene cupo disponible.` });

  // Verificar documentos mínimos
  const docsRequeridos = ["acta_nacimiento", "certificado_bachillerato"];
  const docsFaltantes = docsRequeridos.filter(d => !exp.documentos.find(doc => doc.tipo === d));
  if (docsFaltantes.length && exp.estado === "borrador") {
    return res.status(400).json({ error: "Faltan documentos obligatorios.", docsFaltantes });
  }

  // Generar folio
  if (!exp.folio) {
    const year = new Date().getFullYear();
    const count = expedientes.filter(e => e.folio).length + 1;
    exp.folio = `UHS-${year}-${String(count).padStart(4, "0")}`;
  }

  const esCorreccion = exp.estado === "con_observaciones";
  exp.estado = "enviada";
  exp.submittedAt = new Date().toISOString();
  exp.updatedAt = new Date().toISOString();
  exp.historial.push({ estado: "enviada", fecha: new Date().toISOString(), nota: esCorreccion ? "Correcciones enviadas" : "Solicitud enviada" });

  // Marcar observaciones como resueltas
  exp.observaciones.forEach(o => { o.resuelto = true; });

  expedientes[idx] = exp;
  writeJSON("expedientes.json", expedientes);
  res.json({ ok: true, folio: exp.folio, expediente: exp });
});

// Subir documento
app.post("/api/expediente/documentos/:tipo", requireRole("aspirante"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const exp = expedientes.find(e => e.userId === req.session.userId);
  if (!exp) return res.status(404).json({ error: "No se encontró tu expediente." });

  if (["enviada", "en_revision", "aprobada", "confirmada"].includes(exp.estado)) {
    return res.status(400).json({ error: "No puedes modificar documentos en este momento." });
  }
  if (exp.estado === "con_observaciones") {
    const tieneObs = exp.observaciones.some(o => o.campo === req.params.tipo && !o.resuelto);
    if (!tieneObs) {
      return res.status(400).json({ error: "Solo puedes modificar documentos con observaciones pendientes." });
    }
  }

  const tiposValidos = ["acta_nacimiento", "certificado_bachillerato", "identificacion"];
  if (!tiposValidos.includes(req.params.tipo)) {
    return res.status(400).json({ error: "Tipo de documento no válido." });
  }

  upload.single("archivo")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "El archivo excede 5 MB." });
      return res.status(400).json({ error: err.message || "Error al subir el archivo." });
    }
    if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo." });

    const docIdx = exp.documentos.findIndex(d => d.tipo === req.params.tipo);
    if (docIdx >= 0 && exp.documentos[docIdx].archivo !== req.file.filename) {
      const oldFile = path.join(UPLOADS_DIR, req.session.userId, exp.documentos[docIdx].archivo);
      if (fs.existsSync(oldFile)) try { fs.unlinkSync(oldFile); } catch(_) {}
    }
    const docData = {
      tipo: req.params.tipo,
      archivo: req.file.filename,
      nombreOriginal: req.file.originalname,
      tamano: req.file.size,
      estado: "pendiente",
      observacion: "",
      subidoEn: new Date().toISOString()
    };
    if (docIdx >= 0) exp.documentos[docIdx] = docData;
    else exp.documentos.push(docData);

    exp.updatedAt = new Date().toISOString();
    const idx = expedientes.findIndex(e => e.userId === req.session.userId);
    expedientes[idx] = exp;
    writeJSON("expedientes.json", expedientes);
    res.json({ ok: true, documento: docData });
  });
});

// Eliminar documento
app.delete("/api/expediente/documentos/:tipo", requireRole("aspirante"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const idx = expedientes.findIndex(e => e.userId === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: "No se encontró tu expediente." });

  const exp = expedientes[idx];
  if (exp.estado !== "borrador") return res.status(400).json({ error: "No puedes eliminar documentos en este estado." });

  const docIdx = exp.documentos.findIndex(d => d.tipo === req.params.tipo);
  if (docIdx === -1) return res.status(404).json({ error: "Documento no encontrado." });

  // Eliminar archivo físico
  const userDir = path.join(UPLOADS_DIR, req.session.userId);
  const files = fs.existsSync(userDir) ? fs.readdirSync(userDir) : [];
  const match = files.find(f => f.startsWith(req.params.tipo));
  if (match) fs.unlinkSync(path.join(userDir, match));

  exp.documentos.splice(docIdx, 1);
  exp.updatedAt = new Date().toISOString();
  expedientes[idx] = exp;
  writeJSON("expedientes.json", expedientes);
  res.json({ ok: true });
});

// Ver mi propio documento
app.get("/api/expediente/documentos/:tipo/archivo", requireRole("aspirante"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const exp = expedientes.find(e => e.userId === req.session.userId);
  if (!exp) return res.status(404).json({ error: "Expediente no encontrado." });
  const doc = exp.documentos.find(d => d.tipo === req.params.tipo);
  if (!doc) return res.status(404).json({ error: "Documento no encontrado." });
  const filePath = path.join(UPLOADS_DIR, req.session.userId, doc.archivo);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo no encontrado en el servidor." });
  res.sendFile(filePath);
});

/* ═══════════════════════════════════════════════════════════
   API — Control Escolar
   ═══════════════════════════════════════════════════════════ */

// Listar solicitudes
app.get("/api/control/solicitudes", requireRole("control_escolar", "admin"), (_req, res) => {
  const expedientes = readList("expedientes.json");
  const usuarios = readList("usuarios.json");
  const carreras = readList("carreras.json");
  const lista = expedientes
    .filter(e => e.estado !== "borrador")
    .map(e => {
      const user = usuarios.find(u => u.id === e.userId);
      const car = carreras.find(c => c.id === e.datos.carrera);
      return {
        id: e.id, folio: e.folio, estado: e.estado,
        nombre: `${e.datos.nombre} ${e.datos.apellidoPaterno} ${e.datos.apellidoMaterno || ""}`.trim(),
        email: user?.email || "", carrera: car?.nombre || e.datos.carrera,
        submittedAt: e.submittedAt, updatedAt: e.updatedAt
      };
    });
  res.json(lista);
});

// Ver detalle de una solicitud
app.get("/api/control/solicitudes/:id", requireRole("control_escolar", "admin"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const exp = expedientes.find(e => e.id === req.params.id);
  if (!exp) return res.status(404).json({ error: "Solicitud no encontrada." });
  const usuarios = readList("usuarios.json");
  const user = usuarios.find(u => u.id === exp.userId);
  res.json({ ...exp, email: user?.email || "" });
});

// Ver documento de un aspirante
app.get("/api/control/solicitudes/:id/documentos/:tipo/archivo", requireRole("control_escolar", "admin"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const exp = expedientes.find(e => e.id === req.params.id);
  if (!exp) return res.status(404).json({ error: "Solicitud no encontrada." });
  const doc = exp.documentos.find(d => d.tipo === req.params.tipo);
  if (!doc) return res.status(404).json({ error: "Documento no encontrado." });
  const filePath = path.join(UPLOADS_DIR, exp.userId, doc.archivo);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo no encontrado." });
  res.sendFile(filePath);
});

// Revisar solicitud (aprobar/rechazar documentos con observaciones)
app.post("/api/control/solicitudes/:id/revisar", requireRole("control_escolar", "admin"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const idx = expedientes.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Solicitud no encontrada." });

  const exp = expedientes[idx];
  if (exp.estado !== "enviada" && exp.estado !== "en_revision") {
    return res.status(400).json({ error: "Esta solicitud no está en estado de revisión." });
  }

  const { revisiones } = req.body;
  // revisiones: [{ campo: "acta_nacimiento", aprobado: true/false, observacion: "..." }]
  if (!revisiones || !Array.isArray(revisiones)) {
    return res.status(400).json({ error: "Envía las revisiones." });
  }
  if (revisiones.length === 0 && (!req.body.observacionesDatos || req.body.observacionesDatos.length === 0)) {
    return res.status(400).json({ error: "Debes revisar al menos un documento o dato." });
  }

  let hayRechazos = false;
  for (const rev of revisiones) {
    // Actualizar estado del documento
    const docIdx = exp.documentos.findIndex(d => d.tipo === rev.campo);
    if (docIdx >= 0) {
      exp.documentos[docIdx].estado = rev.aprobado ? "aprobado" : "rechazado";
      exp.documentos[docIdx].observacion = rev.observacion || "";
    }
    if (!rev.aprobado) {
      hayRechazos = true;
      exp.observaciones.push({
        campo: rev.campo, mensaje: rev.observacion || "Requiere corrección",
        fecha: new Date().toISOString(), resuelto: false
      });
    }
  }

  // Si hay datos con observaciones
  if (req.body.observacionesDatos && Array.isArray(req.body.observacionesDatos)) {
    for (const obs of req.body.observacionesDatos) {
      hayRechazos = true;
      exp.observaciones.push({
        campo: obs.campo, mensaje: obs.mensaje,
        fecha: new Date().toISOString(), resuelto: false
      });
    }
  }

  exp.estado = hayRechazos ? "con_observaciones" : "aprobada";
  exp.updatedAt = new Date().toISOString();
  exp.historial.push({
    estado: exp.estado, fecha: new Date().toISOString(),
    nota: hayRechazos ? "Revisión con observaciones" : "Documentos aprobados"
  });

  expedientes[idx] = exp;
  writeJSON("expedientes.json", expedientes);
  res.json({ ok: true, expediente: exp });
});

// Confirmar inscripción
app.post("/api/control/solicitudes/:id/confirmar", requireRole("control_escolar", "admin"), (req, res) => {
  const expedientes = readList("expedientes.json");
  const idx = expedientes.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Solicitud no encontrada." });

  const exp = expedientes[idx];
  if (exp.estado !== "aprobada") {
    return res.status(400).json({ error: "Solo se pueden confirmar solicitudes aprobadas." });
  }

  // Verificar cupo
  const carreras = readList("carreras.json");
  const carIdx = carreras.findIndex(c => c.id === exp.datos.carrera);
  if (carIdx === -1) return res.status(400).json({ error: "Carrera no encontrada." });
  if (carreras[carIdx].cupo - carreras[carIdx].inscritos <= 0) {
    return res.status(400).json({ error: "No hay cupo disponible en esta carrera." });
  }

  // Consumir plaza
  carreras[carIdx].inscritos += 1;
  writeJSON("carreras.json", carreras);

  exp.estado = "confirmada";
  exp.updatedAt = new Date().toISOString();
  exp.historial.push({ estado: "confirmada", fecha: new Date().toISOString(), nota: "Inscripción confirmada" });

  expedientes[idx] = exp;
  writeJSON("expedientes.json", expedientes);
  res.json({ ok: true, expediente: exp });
});

/* ═══════════════════════════════════════════════════════════
   API — Administrador
   ═══════════════════════════════════════════════════════════ */

// Listar usuarios internos
app.get("/api/admin/usuarios", requireRole("admin"), (_req, res) => {
  const usuarios = readList("usuarios.json");
  res.json(usuarios.filter(u => u.role !== "aspirante").map(u => ({ id: u.id, email: u.email, role: u.role, nombre: u.nombre, createdAt: u.createdAt })));
});

// Crear usuario interno
app.post("/api/admin/usuarios", requireRole("admin"), async (req, res) => {
  const { email, password, role, nombre } = req.body;
  if (!email || !password || !role || !nombre) return res.status(400).json({ error: "Todos los campos son obligatorios." });
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Datos de entrada inválidos." });
  }
  if (!["control_escolar", "admin"].includes(role)) return res.status(400).json({ error: "Rol no válido." });
  if (password.length < 12) return res.status(400).json({ error: "La contraseña debe tener al menos 12 caracteres." });

  const hash = await bcrypt.hash(password, 10);
  const usuarios = readList("usuarios.json");
  if (usuarios.find(u => u.email === email.trim().toLowerCase())) {
    return res.status(409).json({ error: "Ya existe un usuario con ese correo." });
  }
  const user = { id: uuidv4(), email: email.trim().toLowerCase(), passwordHash: hash, role, nombre, verified: true, createdAt: new Date().toISOString() };
  usuarios.push(user);
  writeJSON("usuarios.json", usuarios);
  res.json({ ok: true, usuario: { id: user.id, email: user.email, role: user.role, nombre: user.nombre } });
});

// Eliminar usuario (no permite eliminar al propio admin)
app.delete("/api/admin/usuarios/:id", requireRole("admin"), (req, res) => {
  if (req.params.id === req.session.userId) return res.status(400).json({ error: "No puedes eliminarte a ti mismo." });
  const usuarios = readList("usuarios.json");
  const idx = usuarios.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Usuario no encontrado." });
  usuarios.splice(idx, 1);
  writeJSON("usuarios.json", usuarios);
  res.json({ ok: true });
});

// Obtener convocatoria (admin)
app.get("/api/admin/convocatoria", requireRole("admin"), (_req, res) => {
  res.json(readObj("convocatoria.json"));
});

// Actualizar convocatoria
app.put("/api/admin/convocatoria", requireRole("admin"), (req, res) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const c of ["fechaApertura", "fechaCierreRecepcion", "fechaCierreCorrecciones"]) {
    if (req.body[c] !== undefined && typeof req.body[c] === "string" && !dateRegex.test(req.body[c])) {
      return res.status(400).json({ error: `Formato de fecha inválido para ${c}. Usa YYYY-MM-DD.` });
    }
  }

  const conv = readObj("convocatoria.json");
  const campos = ["activa", "fechaApertura", "fechaCierreRecepcion", "fechaCierreCorrecciones"];
  for (const c of campos) {
    if (req.body[c] !== undefined) conv[c] = req.body[c];
  }
  writeJSON("convocatoria.json", conv);
  res.json({ ok: true, convocatoria: conv });
});

// Obtener carreras (admin)
app.get("/api/admin/carreras", requireRole("admin"), (_req, res) => {
  res.json(readList("carreras.json"));
});

// Agregar carrera
app.post("/api/admin/carreras", requireRole("admin"), (req, res) => {
  const { nombre, campus, modalidad, cupo } = req.body;
  if (!nombre || !campus || !modalidad || !cupo) return res.status(400).json({ error: "Todos los campos son obligatorios." });
  const cupoNum = parseInt(cupo, 10);
  if (!Number.isInteger(cupoNum) || cupoNum <= 0) return res.status(400).json({ error: "El cupo debe ser un número entero positivo." });
  const carreras = readList("carreras.json");
  const id = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (carreras.find(c => c.id === id)) return res.status(409).json({ error: "Ya existe una carrera con ese nombre." });
  const carrera = { id, nombre, campus, modalidad, cupo: parseInt(cupo, 10), inscritos: 0 };
  carreras.push(carrera);
  writeJSON("carreras.json", carreras);
  res.json({ ok: true, carrera });
});

// Editar carrera
app.put("/api/admin/carreras/:id", requireRole("admin"), (req, res) => {
  if (req.body.cupo !== undefined) {
    const cupoNum = parseInt(req.body.cupo, 10);
    if (!Number.isInteger(cupoNum) || cupoNum <= 0) return res.status(400).json({ error: "El cupo debe ser un número entero positivo." });
  }
  const carreras = readList("carreras.json");
  const idx = carreras.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Carrera no encontrada." });
  const campos = ["nombre", "campus", "modalidad", "cupo"];
  for (const c of campos) {
    if (req.body[c] !== undefined) carreras[idx][c] = c === "cupo" ? parseInt(req.body[c], 10) : req.body[c];
  }
  writeJSON("carreras.json", carreras);
  res.json({ ok: true, carrera: carreras[idx] });
});

// Estadísticas
app.get("/api/admin/estadisticas", requireRole("admin"), (_req, res) => {
  const expedientes = readList("expedientes.json");
  const carreras = readList("carreras.json");
  const usuarios = readList("usuarios.json");
  const stats = {
    totalAspirantes: usuarios.filter(u => u.role === "aspirante").length,
    expedientesPorEstado: {},
    carrerasResumen: carreras.map(c => ({ id: c.id, nombre: c.nombre, cupo: c.cupo, inscritos: c.inscritos, disponible: c.cupo - c.inscritos }))
  };
  for (const e of expedientes) {
    stats.expedientesPorEstado[e.estado] = (stats.expedientesPorEstado[e.estado] || 0) + 1;
  }
  res.json(stats);
});

/* ═══════════════════════════════════════════════════════════
   Manejo de errores
   ═══════════════════════════════════════════════════════════ */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

/* ═══════════════════════════════════════════════════════════
   Arranque
   ═══════════════════════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`\n  Portal UHS: http://localhost:${PORT}`);
  console.log(`  Admin:   admin@uhs.edu.mx / admin1234admin`);
  console.log(`  Control: control@uhs.edu.mx / control1234ctrl`);
  console.log(`  Para detener: Ctrl+C\n`);
});
