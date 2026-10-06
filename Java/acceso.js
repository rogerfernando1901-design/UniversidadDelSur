document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('login-form');
    const activeSession = document.getElementById('active-session');
    const switchAccount = document.getElementById('switch-account');
    switchAccount.addEventListener('click', async () => {
        const error = document.getElementById('session-error');
        error.hidden = true;
        switchAccount.disabled = true;
        try {
            const res = await fetch('/api/logout', { method: 'POST' });
            if (!res.ok) throw new Error('No se pudo cerrar la sesión. Intenta de nuevo.');
            activeSession.hidden = true;
            form.hidden = false;
            form.reset();
            document.getElementById('email').focus();
        } catch (e) {
            error.textContent = 'No se pudo cerrar la sesión. Intenta de nuevo.';
            error.hidden = false;
        } finally {
            switchAccount.disabled = false;
        }
    });
    try {
        const res = await fetch('/api/sesion');
        if (res.ok) {
            const session = await res.json();
            if (session.autenticado) {
                const panels = {
                    aspirante: '/Paginas/panel.html',
                    control_escolar: '/Paginas/control.html',
                    admin: '/Paginas/admin_panel.html'
                };
                window.location.replace(panels[session.role] || '/Paginas/panel.html');
                return;
            }
        }
    } catch (e) {
        console.error('Error al comprobar sesión:', e);
    }

    const errorSummary = document.getElementById('error-summary');

    // Prellenar correo si viene desde el enlace de registro
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('email');
        if (emailParam) {
            const emailInput = document.getElementById('email');
            if (emailInput) {
                emailInput.value = emailParam;
                const pwdInput = document.getElementById('password');
                if (pwdInput) pwdInput.focus();
            }
        }
    } catch (_) {}

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorSummary.style.display = 'none';
        
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const submitBtn = form.querySelector('button[type="submit"]');

        // Validación de formato de correo RFC
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!email || !emailRegex.test(email) || email.length > 254) {
            errorSummary.textContent = 'Escribe un correo electrónico válido (ejemplo: usuario@dominio.com).';
            errorSummary.style.display = 'block';
            emailInput.focus();
            return;
        }

        // Validación de complejidad de contraseña (RF-01 / RF-02)
        if (password.length < 8 || password.length > 128) {
            errorSummary.textContent = 'La contraseña debe tener entre 8 y 128 caracteres.';
            errorSummary.style.display = 'block';
            passwordInput.focus();
            return;
        }
        if (!/[A-Z]/.test(password)) {
            errorSummary.textContent = 'La contraseña debe incluir al menos una letra mayúscula.';
            errorSummary.style.display = 'block';
            passwordInput.focus();
            return;
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~^`]/.test(password)) {
            errorSummary.textContent = 'La contraseña debe incluir al menos un carácter especial.';
            errorSummary.style.display = 'block';
            passwordInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Iniciando sesión...';
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (data.ok) {
                window.location.href = data.redirect || '/Paginas/panel.html';
            } else {
                if (data.noVerificado && data.email) {
                    errorSummary.innerHTML = `
                        <div style="text-align:left;">
                            <strong style="color:#991B1B; display:block; margin-bottom:4px;">⚠️ Cuenta no verificada</strong>
                            <p style="margin:4px 0 10px; color:#7F1D1D;">${data.error}</p>
                            <a href="/Paginas/inscripcion.html?email=${encodeURIComponent(data.email)}&verificar=1" class="primary" style="display:inline-block; padding:6px 12px; font-size:13px; text-decoration:none; border-radius:4px; font-weight:600; background:var(--blue); color:white;">Ingresar código de verificación →</a>
                        </div>
                    `;
                } else {
                    errorSummary.textContent = data.error || 'Credenciales inválidas.';
                }
                errorSummary.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        } catch (error) {
            errorSummary.textContent = 'Error de conexión. Intente más tarde.';
            errorSummary.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    });
});
