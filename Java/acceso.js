document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/sesion');
        if (res.ok) {
            const session = await res.json();
            if (session.autenticado) {
                window.location.href = session.role === 'aspirante' ? '/Paginas/panel.html' : '/';
            }
        }
    } catch (e) {
        console.error('Error al comprobar sesión:', e);
    }

    const form = document.getElementById('login-form');
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
