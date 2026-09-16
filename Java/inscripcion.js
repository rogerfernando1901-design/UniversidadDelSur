"use strict";

const form = document.getElementById("registration-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmation = document.getElementById("confirmation");
const summary = document.getElementById("error-summary");
const errorList = document.getElementById("error-list");
const result = document.getElementById("review-result");
let reviewed = false;

function validate() {
  const errors = [];
  if (!email.value.trim() || email.validity.typeMismatch || email.value.trim().length > 254) {
    errors.push([email, "Escribe un correo electrónico válido, por ejemplo aspirante@example.com."]);
  }
  if (password.value.length < 12 || password.value.length > 128) {
    errors.push([password, "La contraseña debe tener entre 12 y 128 caracteres."]);
  }
  if (!confirmation.value || confirmation.value !== password.value) {
    errors.push([confirmation, "La confirmación debe coincidir con la contraseña."]);
  }
  return errors;
}

function renderErrors(errors) {
  errorList.replaceChildren();
  for (const field of [email, password, confirmation]) {
    const message = errors.find(([input]) => input === field)?.[1];
    const output = document.getElementById(`${field.id}-error`);
    field.setAttribute("aria-invalid", String(Boolean(message)));
    output.textContent = message || "";
    output.hidden = !message;
    if (message) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${field.id}`;
      link.textContent = message;
      link.addEventListener("click", event => {
        event.preventDefault();
        field.focus();
      });
      item.append(link);
      errorList.append(item);
    }
  }
  summary.hidden = errors.length === 0;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  reviewed = true;
  result.hidden = true;
  const errors = validate();
  renderErrors(errors);
  if (errors.length) {
    summary.focus();
    return;
  }
  // Solo validación de interfaz. No persistir contraseñas ni simular cuentas.
  result.textContent = "Los datos cumplen el formato solicitado. El registro de cuentas aún no está habilitado: no se ha creado una cuenta ni enviado un correo. Podrás continuar cuando esté disponible.";
  result.hidden = false;
  result.focus();
});

form.addEventListener("input", () => {
  result.hidden = true;
  if (reviewed) renderErrors(validate());
});

document.querySelectorAll("[data-toggle]").forEach(button => {
  button.addEventListener("click", () => {
    const field = document.getElementById(button.dataset.toggle);
    const show = field.type === "password";
    field.type = show ? "text" : "password";
    button.textContent = show ? "Ocultar" : "Mostrar";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", `${show ? "Ocultar" : "Mostrar"} ${field === password ? "contraseña" : "confirmación de contraseña"}`);
  });
});

document.getElementById("review-button").disabled = false;
