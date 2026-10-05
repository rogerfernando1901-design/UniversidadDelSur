"use strict";

// RF-05: Si el usuario ya cuenta con sesión activa, redirigir a su panel correspondiente
(async () => {
  try {
    const res = await fetch("/api/sesion");
    if (res.ok) {
      const data = await res.json();
      if (data.autenticado) {
        const panels = {
          aspirante: "/Paginas/panel.html",
          control_escolar: "/Paginas/control.html",
          admin: "/Paginas/admin_panel.html"
        };
        window.location.replace(panels[data.role] || "/Paginas/panel.html");
      }
    }
  } catch (_) {}
})();

// Contrato de navegación
const routes = {
  oferta: "/Paginas/oferta.html",
  requisitos: "/Paginas/requisitos.html",
  ayuda: "/Paginas/ayuda.html",
  acceso: "/Paginas/acceso.html",
  inscripcion: "/Paginas/inscripcion.html",
  seguimiento: "/Paginas/seguimiento.html",
  convocatoria: "/Paginas/convocatoria.html",
  privacidad: "/Paginas/privacidad.html",
  personal: "/Paginas/personal.html"
};

const careerRoutes = {
  sistemas: "/Paginas/sistemas.html",
  administracion: "/Paginas/administracion.html",
  diseno: "/Paginas/diseno.html"
};

// Navegación estática
document.querySelectorAll("[data-panel]").forEach(button => {
  button.addEventListener("click", () => window.location.assign(routes[button.dataset.panel]));
});

// Menú móvil
const menu = document.getElementById("navigation");
const toggle = document.getElementById("menu-toggle");
if (toggle && menu) {
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "Cerrar menú" : "Menú";
    menu.classList.toggle("open", expanded);
  });
  menu.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Menú";
      toggle.focus();
    }
  });
}

// ── Formateador de fechas ────────────────────────────────────
function formatFechaEspanol(fechaStr) {
  if (!fechaStr) return "Por confirmar";
  try {
    const [year, month, day] = fechaStr.split("-").map(Number);
    if (!year || !month || !day) return fechaStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  } catch (_) {
    return fechaStr;
  }
}

// ── Carga dinámica de la Convocatoria ────────────────────────
async function cargarConvocatoriaHome() {
  const badge = document.getElementById("conv-status-badge");
  const aperturaEl = document.getElementById("conv-apertura-val");
  const cierreEl = document.getElementById("conv-cierre-val");
  const costoEl = document.getElementById("conv-costo-val");

  if (!badge && !aperturaEl) return;

  try {
    const res = await fetch("/api/convocatoria");
    if (!res.ok) return;
    const data = await res.json();

    if (badge) {
      if (data.activa) {
        badge.textContent = "Abierta";
        badge.style.backgroundColor = "#DCFCE7";
        badge.style.color = "#166534";
      } else {
        badge.textContent = "Cerrada";
        badge.style.backgroundColor = "#F1F5F9";
        badge.style.color = "#64748B";
      }
    }

    if (aperturaEl) aperturaEl.textContent = formatFechaEspanol(data.fechaApertura);
    if (cierreEl) cierreEl.textContent = formatFechaEspanol(data.fechaCierreRecepcion);
    if (costoEl) costoEl.textContent = data.costo || "Gratuito";
  } catch (err) {
    console.error("Error al cargar convocatoria:", err);
  }
}

// ── Carga dinámica de Carreras en Home ───────────────────────
async function cargarCarrerasHome() {
  const container = document.getElementById("career-grid-container");
  if (!container) return;

  try {
    const res = await fetch("/api/carreras");
    if (!res.ok) return;
    const carreras = await res.json();

    if (!Array.isArray(carreras) || carreras.length === 0) return;

    container.innerHTML = "";

    carreras.forEach((c, index) => {
      const article = document.createElement("article");
      article.className = "career-card";

      // Número y tag de área
      const numberSpan = document.createElement("span");
      numberSpan.className = "career-number";
      const numStr = String(index + 1).padStart(2, "0");
      numberSpan.textContent = `${numStr} / OFERTA ACADÉMICA`;
      article.appendChild(numberSpan);

      // Título
      const h3 = document.createElement("h3");
      h3.textContent = c.nombre;
      article.appendChild(h3);

      // Cupos y descripción
      const pDesc = document.createElement("p");
      const cupoDisp = c.disponible !== undefined ? c.disponible : (c.cupo - (c.inscritos || 0));
      pDesc.textContent = `Lugares disponibles: ${cupoDisp} de ${c.cupo}. Prepárate para ingresar a esta carrera.`;
      article.appendChild(pDesc);

      // Metadata (Campus y Modalidad)
      const pMeta = document.createElement("p");
      pMeta.className = "metadata";
      pMeta.textContent = `${c.campus || "Campus Central"} · ${c.modalidad || "Presencial"}`;
      article.appendChild(pMeta);

      // Botón de acción
      const btn = document.createElement("button");
      btn.className = "text-button";
      btn.innerHTML = `Ver plan de estudios <span aria-hidden="true">↗</span>`;
      
      const targetUrl = careerRoutes[c.id] || `/Paginas/carrera.html?id=${encodeURIComponent(c.id)}`;
      btn.onclick = () => window.location.assign(targetUrl);
      article.appendChild(btn);

      container.appendChild(article);
    });
  } catch (err) {
    console.error("Error al cargar carreras:", err);
  }
}

// Inicializar cuando cargue el DOM
document.addEventListener("DOMContentLoaded", () => {
  cargarConvocatoriaHome();
  cargarCarrerasHome();
});
