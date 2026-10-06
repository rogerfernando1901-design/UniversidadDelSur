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
const privacyTerms = document.getElementById("privacy-terms");

let reviewed = false;
let emailAlreadyExists = false;
let checkTimeout = null;

const EMAIL_RFC_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Verificación en vivo si el correo ya existe
async function checkEmailAvailability(emailVal) {
  if (!emailVal || !EMAIL_RFC_REGEX.test(emailVal) || emailVal.length > 254) {
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

  if (!emailVal || !EMAIL_RFC_REGEX.test(emailVal) || emailVal.length > 254) {
    errors.push([email, "Escribe un correo electrónico válido, por ejemplo aspirante@example.com."]);
  } else if (emailAlreadyExists) {
    errors.push([email, "Ya existe una cuenta con este correo. Inicia sesión en su lugar."]);
  }

  if (password.value.length < 8 || password.value.length > 128) {
    errors.push([password, "La contraseña debe tener entre 8 y 128 caracteres."]);
  } else if (!/[A-Z]/.test(password.value)) {
    errors.push([password, "La contraseña debe incluir al menos una letra mayúscula."]);
  } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~^`]/.test(password.value)) {
    errors.push([password, "La contraseña debe incluir al menos un carácter especial."]);
  }
  if (!confirmation.value || confirmation.value !== password.value) {
    errors.push([confirmation, "La confirmación debe coincidir con la contraseña."]);
  }
  if (privacyTerms && !privacyTerms.checked) {
    errors.push([privacyTerms, "Debes aceptar los términos y el aviso de privacidad para continuar con tu registro."]);
  }
  return errors;
}

function renderErrors(errors) {
  errorList.replaceChildren();
  for (const field of [email, password, confirmation, privacyTerms]) {
    if (!field) continue;
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
      body: JSON.stringify({
        email: emailVal,
        password: password.value,
        aceptaPrivacidad: Boolean(privacyTerms && privacyTerms.checked)
      })
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

    // Manejo de verificación de token (RF-03)
    if (data.requiereVerificacion) {
      mostrarPasoVerificacion(emailVal, data);
      return;
    }

    // Éxito tradicional (si viniera ya verificado)
    result.style.borderColor = "var(--success)";
    result.style.background = "#F0FDF4";
    result.style.color = "var(--success)";
    result.innerHTML = `<strong>¡Cuenta creada exitosamente!</strong> ${data.message} <br>Serás redirigido a tu panel en unos segundos.`;
    result.hidden = false;
    result.focus();

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

// ── Control del Paso 02: Verificación de Token (RF-03) ───────
let currentVerifyingEmail = "";

function mostrarPasoVerificacion(emailToVerify, info = {}) {
  currentVerifyingEmail = emailToVerify;
  const accountCard = document.getElementById("account-card");
  const verificationCard = document.getElementById("verification-card");
  const emailDisplay = document.getElementById("verify-email-display");
  const tokenAlertBox = document.getElementById("token-alert-box");
  const tokenInput = document.getElementById("token-input");
  const verifyError = document.getElementById("verify-error");

  if (accountCard) accountCard.style.display = "none";
  if (verificationCard) verificationCard.style.display = "block";
  if (emailDisplay) emailDisplay.textContent = emailToVerify;
  if (verifyError) verifyError.style.display = "none";

  try {
    const newUrl = `${window.location.pathname}?email=${encodeURIComponent(emailToVerify)}&verificar=1`;
    window.history.replaceState({ paso: 2, email: emailToVerify }, "", newUrl);
  } catch (_) {}

  // Actualizar indicadores de pasos hacia Paso 02
  const stepItem1 = document.getElementById("step-item-1");
  const stepLabel1 = document.getElementById("step-label-1");
  const stepItem2 = document.getElementById("step-item-2");
  const stepLabel2 = document.getElementById("step-label-2");
  const stepItem3 = document.getElementById("step-item-3");
  const stepLabel3 = document.getElementById("step-label-3");

  if (stepItem1) stepItem1.removeAttribute("aria-current");
  if (stepLabel1) stepLabel1.textContent = "Completado";
  if (stepItem2) stepItem2.setAttribute("aria-current", "step");
  if (stepLabel2) stepLabel2.textContent = "Paso actual";
  if (stepItem3) stepItem3.removeAttribute("aria-current");
  if (stepLabel3) stepLabel3.textContent = "Siguiente paso";

  if (tokenAlertBox) {
    if (info.mailEnviado) {
      tokenAlertBox.style.background = "#F0FDF4";
      tokenAlertBox.style.borderColor = "#86EFAC";
      tokenAlertBox.style.color = "#166534";
      tokenAlertBox.innerHTML = `<strong>✅ Código enviado a tu Gmail</strong><br>Revisa tu bandeja de entrada en <strong>${emailToVerify}</strong> (también revisa spam). Válido por 15 minutos.`;
    } else if (info.tokenDev) {
      tokenAlertBox.style.background = "#FEF3C7";
      tokenAlertBox.style.borderColor = "#FCD34D";
      tokenAlertBox.style.color = "#92400E";
      tokenAlertBox.innerHTML = `<strong>⚠️ Modo de prueba (sin Gmail configurado en .env):</strong><br>Tu código de verificación generado es: <strong style="font-size:18px; letter-spacing:2px; color:#B45309;">${info.tokenDev}</strong>.<br><small>Para recibirlo por correo real en tiempo real, configura GMAIL_USER y GMAIL_PASS en tu archivo .env.</small>`;
    }
  }

  if (tokenInput) {
    tokenInput.value = "";
    tokenInput.focus();
  }
}

// Formulario de verificación
const verificationForm = document.getElementById("verification-form");
const tokenInput = document.getElementById("token-input");
const btnVerify = document.getElementById("btn-verify-token");
const verifyError = document.getElementById("verify-error");
const btnResend = document.getElementById("btn-resend-token");
const btnChangeEmail = document.getElementById("btn-change-email");

if (tokenInput) {
  tokenInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
  });
}

if (verificationForm) {
  verificationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!tokenInput || !currentVerifyingEmail) return;

    const tokenVal = tokenInput.value.trim();
    if (tokenVal.length !== 6) {
      if (verifyError) {
        verifyError.textContent = "Ingresa el código completo de 6 dígitos numéricos.";
        verifyError.style.display = "block";
      }
      tokenInput.focus();
      return;
    }

    if (btnVerify) {
      btnVerify.disabled = true;
      btnVerify.textContent = "Verificando código…";
    }

    try {
      const res = await fetch("/api/verificar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentVerifyingEmail, token: tokenVal })
      });
      const data = await res.json();

      if (!res.ok) {
        if (verifyError) {
          verifyError.textContent = data.error || "Código de verificación inválido.";
          verifyError.style.display = "block";
        }
        if (btnVerify) {
          btnVerify.disabled = false;
          btnVerify.textContent = "Verificar y acceder a mi panel →";
        }
        tokenInput.focus();
        return;
      }

      // Actualizar indicadores de pasos hacia Paso 03
      const stepItem2 = document.getElementById("step-item-2");
      const stepLabel2 = document.getElementById("step-label-2");
      const stepItem3 = document.getElementById("step-item-3");
      const stepLabel3 = document.getElementById("step-label-3");

      if (stepItem2) stepItem2.removeAttribute("aria-current");
      if (stepLabel2) stepLabel2.textContent = "Completado";
      if (stepItem3) stepItem3.setAttribute("aria-current", "step");
      if (stepLabel3) stepLabel3.textContent = "Paso actual";

      // Verificación exitosa
      if (verifyError) {
        verifyError.style.display = "block";
        verifyError.style.background = "#F0FDF4";
        verifyError.style.borderColor = "#86EFAC";
        verifyError.style.color = "#166534";
        verifyError.innerHTML = "<strong>¡Identidad confirmada exitosamente!</strong> Entrando a tu expediente (Paso 03)…";
      }

      setTimeout(() => {
        window.location.href = data.redirect || "/Paginas/expediente.html";
      }, 1000);

    } catch (err) {
      if (verifyError) {
        verifyError.textContent = "Error al conectar con el servidor.";
        verifyError.style.display = "block";
      }
      if (btnVerify) {
        btnVerify.disabled = false;
        btnVerify.textContent = "Verificar y continuar con mi expediente (Paso 3) →";
      }
    }
  });
}

// Botón de reenvío de token
if (btnResend) {
  btnResend.addEventListener("click", async () => {
    if (!currentVerifyingEmail) return;
    btnResend.disabled = true;
    btnResend.textContent = "Enviando nuevo código…";

    try {
      const res = await fetch("/api/reenviar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentVerifyingEmail })
      });
      const data = await res.json();

      btnResend.disabled = false;
      btnResend.textContent = "Reenviar código a mi correo";

      const tokenAlertBox = document.getElementById("token-alert-box");
      if (tokenAlertBox) {
        if (data.mailEnviado) {
          tokenAlertBox.innerHTML = `<strong>✅ Nuevo código enviado a tu Gmail</strong><br>Revisa tu correo: <strong>${currentVerifyingEmail}</strong>.`;
        } else if (data.tokenDev) {
          tokenAlertBox.innerHTML = `<strong>⚠️ Nuevo código generado (prueba):</strong> <strong style="font-size:18px; letter-spacing:2px; color:#B45309;">${data.tokenDev}</strong>`;
        }
      }
    } catch (_) {
      btnResend.disabled = false;
      btnResend.textContent = "Reenviar código a mi correo";
    }
  });
}

// Botón cambiar correo
if (btnChangeEmail) {
  btnChangeEmail.addEventListener("click", () => {
    const accountCard = document.getElementById("account-card");
    const verificationCard = document.getElementById("verification-card");
    if (verificationCard) verificationCard.style.display = "none";
    if (accountCard) accountCard.style.display = "block";
    try {
      window.history.replaceState({}, "", window.location.pathname);
    } catch (_) {}
    const stepItem1 = document.getElementById("step-item-1");
    const stepLabel1 = document.getElementById("step-label-1");
    const stepItem2 = document.getElementById("step-item-2");
    const stepLabel2 = document.getElementById("step-label-2");
    if (stepItem1) stepItem1.setAttribute("aria-current", "step");
    if (stepLabel1) stepLabel1.textContent = "Paso actual";
    if (stepItem2) stepItem2.removeAttribute("aria-current");
    if (stepLabel2) stepLabel2.textContent = "Siguiente paso";

    btn.disabled = false;
    btn.textContent = "Crear cuenta de aspirante";
    email.focus();
  });
}

// Detectar si viene desde login para verificar
try {
  const urlParams = new URLSearchParams(window.location.search);
  const verifyEmail = urlParams.get("email");
  const isVerificar = urlParams.get("verificar");
  if (verifyEmail && isVerificar) {
    mostrarPasoVerificacion(verifyEmail, {});
  }
} catch (_) {}

form.addEventListener("input", () => {
  result.hidden = true;
  if (reviewed) renderErrors(validate());
});

if (privacyTerms) {
  privacyTerms.addEventListener("change", () => {
    result.hidden = true;
    if (reviewed) renderErrors(validate());
  });
}

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

// RF-05: Redirigir al panel correspondiente si ya tiene sesión activa
(async () => {
  try {
    const res = await fetch("/api/sesion");
    const data = await res.json();
    if (data.autenticado) {
      const panels = {
        aspirante: "/Paginas/panel.html",
        control_escolar: "/Paginas/control.html",
        admin: "/Paginas/admin_panel.html"
      };
      window.location.replace(panels[data.role] || "/Paginas/panel.html");
    }
  } catch (_) { /* servidor no disponible */ }
})();
