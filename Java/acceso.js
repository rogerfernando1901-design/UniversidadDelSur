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
                document.getElementById('session-email').textContent = session.email;
                const panels = {
                    aspirante: '/Paginas/panel.html',
                    control_escolar: '/Paginas/control.html',
                    admin: '/Paginas/admin_panel.html'
                };
                document.getElementById('session-panel').href = panels[session.role] || '/';
                activeSession.hidden = false;
                form.hidden = true;
            }
        }
    } catch (e) {
        console.error('Error al comprobar sesión:', e);
    }

    const errorSummary = document.getElementById('error-summary');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorSummary.style.display = 'none';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
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
                errorSummary.textContent = data.error || 'Credenciales inválidas.';
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
