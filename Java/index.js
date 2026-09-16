"use strict";

// Contrato de navegación: crear estos archivos en Paginas; consultar README.md.
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

document.querySelectorAll("[data-panel]").forEach(button => {
  button.addEventListener("click", () => window.location.assign(routes[button.dataset.panel]));
});
document.querySelectorAll("[data-career]").forEach(button => {
  button.addEventListener("click", () => window.location.assign(careerRoutes[button.dataset.career]));
});

const menu = document.getElementById("navigation");
const toggle = document.getElementById("menu-toggle");
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
