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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  reviewed = true;
  result.hidden = true;
  const errors = validate();
  renderErrors(errors);
  if (errors.length) {
    summary.focus();
    return;
  }

  // Enviar al servidor
  const btn = document.getElementById("review-button");
  btn.disabled = true;
  btn.textContent = "Creando cuenta…";

  try {
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value.trim(), password: password.value })
    });
    const data = await res.json();

    if (!res.ok) {
      result.textContent = data.error || "Error al crear la cuenta.";
      result.style.borderColor = "var(--error)";
      result.style.background = "#FEF2F2";
      result.style.color = "var(--error)";
      result.hidden = false;
      result.focus();
      btn.disabled = false;
      btn.textContent = "Revisar datos de registro";
      return;
    }

    // Éxito
    result.style.borderColor = "var(--success)";
    result.style.background = "#F0FDF4";
    result.style.color = "var(--success)";
    result.innerHTML = `<strong>¡Cuenta creada!</strong> ${data.message} <br>Serás redirigido a tu panel en unos segundos.`;
    result.hidden = false;
    result.focus();

    // Redirigir al panel
    setTimeout(() => {
      window.location.href = data.redirect || "/Paginas/panel.html";
    }, 2500);

  } catch (err) {
    result.textContent = "No se pudo conectar con el servidor. Verifica que esté en ejecución.";
    result.style.borderColor = "var(--error)";
    result.style.background = "#FEF2F2";
    result.style.color = "var(--error)";
    result.hidden = false;
    result.focus();
    btn.disabled = false;
    btn.textContent = "Revisar datos de registro";
  }
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

// Verificar si ya tiene sesión activa
(async () => {
  try {
    const res = await fetch("/api/sesion");
    const data = await res.json();
    if (data.autenticado) {
      const notice = document.querySelector(".notice");
      if (notice) {
        notice.innerHTML = `<strong>Ya tienes una sesión activa</strong><p>Estás conectado como ${data.email}. <a href="/Paginas/panel.html">Ir a tu panel</a> o <a href="#" id="logout-link">cerrar sesión</a> para crear otra cuenta.</p>`;
        const logoutLink = document.getElementById("logout-link");
        if (logoutLink) {
          logoutLink.addEventListener("click", async (e) => {
            e.preventDefault();
            await fetch("/api/logout", { method: "POST" });
            window.location.reload();
          });
        }
      }
    }
  } catch (_) { /* servidor no disponible */ }
})();
