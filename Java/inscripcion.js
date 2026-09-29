"use strict";

const form = document.getElementById("registration-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmation = document.getElementById("confirmation");
const summary = document.getElementById("error-summary");
const errorList = document.getElementById("error-list");
const result = document.getElementById("review-result");
const btn = document.getElementById("review-button");
const emailExistsAlert = document.getElementById("email-exists-alert");
const emailExistsLoginBtn = document.getElementById("email-exists-login-btn");

let reviewed = false;
let emailAlreadyExists = false;
let checkTimeout = null;

// Verificación en vivo si el correo ya existe
async function checkEmailAvailability(emailVal) {
  if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    if (emailExistsAlert) emailExistsAlert.style.display = "none";
    emailAlreadyExists = false;
    return false;
  }

  try {
    const res = await fetch(`/api/verificar-correo?email=${encodeURIComponent(emailVal)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.existe) {
        emailAlreadyExists = true;
        if (emailExistsAlert) {
          emailExistsAlert.style.display = "block";
          if (emailExistsLoginBtn) {
            emailExistsLoginBtn.href = `/Paginas/acceso.html?email=${encodeURIComponent(emailVal)}`;
          }
        }
        email.style.borderColor = "var(--error)";
        email.setAttribute("aria-invalid", "true");
        return true;
      } else {
        emailAlreadyExists = false;
        if (emailExistsAlert) emailExistsAlert.style.display = "none";
        email.style.borderColor = "";
        email.setAttribute("aria-invalid", "false");
        return false;
      }
    }
  } catch (_) {
    // Si la API falla, no bloqueamos la experiencia
  }
  return false;
}

email.addEventListener("blur", () => {
  checkEmailAvailability(email.value.trim());
});

email.addEventListener("input", () => {
  clearTimeout(checkTimeout);
  checkTimeout = setTimeout(() => {
    checkEmailAvailability(email.value.trim());
  }, 350);
});

function validate() {
  const errors = [];
  const emailVal = email.value.trim();

  if (!emailVal || email.validity.typeMismatch || emailVal.length > 254) {
    errors.push([email, "Escribe un correo electrónico válido, por ejemplo aspirante@example.com."]);
  } else if (emailAlreadyExists) {
    errors.push([email, "Ya existe una cuenta con este correo. Inicia sesión en su lugar."]);
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
    if (output) {
      output.textContent = message || "";
      output.hidden = !message;
    }
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

  const emailVal = email.value.trim();

  // Validar campos
  const errors = validate();
  renderErrors(errors);
  if (errors.length) {
    summary.focus();
    return;
  }

  // Enviar al servidor
  btn.disabled = true;
  btn.textContent = "Creando cuenta…";

  try {
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailVal, password: password.value })
    });
    const data = await res.json();

    if (!res.ok) {
      btn.disabled = false;
      btn.textContent = "Crear cuenta de aspirante";

      if (res.status === 409 || data.existe || (data.error && data.error.toLowerCase().includes("ya existe"))) {
        emailAlreadyExists = true;
        if (emailExistsAlert) {
          emailExistsAlert.style.display = "block";
          if (emailExistsLoginBtn) {
            emailExistsLoginBtn.href = `/Paginas/acceso.html?email=${encodeURIComponent(emailVal)}`;
          }
        }
        email.style.borderColor = "var(--error)";
        email.setAttribute("aria-invalid", "true");

        result.innerHTML = `
          <div style="text-align:left;">
            <strong style="font-size:15px; color:#991B1B; display:block; margin-bottom:4px;">⚠️ Ya existe una cuenta con este correo</strong>
            <p style="margin:4px 0 12px; color:#7F1D1D;">El correo <strong>${emailVal}</strong> ya está registrado en el portal.</p>
            <a href="/Paginas/acceso.html?email=${encodeURIComponent(emailVal)}" class="primary" style="display:inline-block; padding:8px 16px; font-weight:600; text-decoration:none; border-radius:4px; background:var(--blue); color:white;">Iniciar sesión ahora →</a>
          </div>
        `;
        result.style.borderColor = "var(--error)";
        result.style.background = "#FEF2F2";
        result.style.color = "var(--error)";
        result.hidden = false;
        result.focus();
        return;
      }

      result.textContent = data.error || "Error al crear la cuenta.";
      result.style.borderColor = "var(--error)";
      result.style.background = "#FEF2F2";
      result.style.color = "var(--error)";
      result.hidden = false;
      result.focus();
      return;
    }

    // Éxito
    result.style.borderColor = "var(--success)";
    result.style.background = "#F0FDF4";
    result.style.color = "var(--success)";
    result.innerHTML = `<strong>¡Cuenta creada exitosamente!</strong> ${data.message} <br>Serás redirigido a tu panel en unos segundos.`;
    result.hidden = false;
    result.focus();

    // Redirigir al panel
    setTimeout(() => {
      window.location.href = data.redirect || "/Paginas/panel.html";
    }, 2000);

  } catch (err) {
    result.textContent = "No se pudo conectar con el servidor. Verifica que esté en ejecución.";
    result.style.borderColor = "var(--error)";
    result.style.background = "#FEF2F2";
    result.style.color = "var(--error)";
    result.hidden = false;
    result.focus();
    btn.disabled = false;
    btn.textContent = "Crear cuenta de aspirante";
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

btn.disabled = false;

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
