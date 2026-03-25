// Authentication Logic for Bom Clima Dashboard
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorBox = document.getElementById('error-box');
    const loginBtn = document.getElementById('login-btn');

    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://api-production-ef9c.up.railway.app';

    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;

            // Reset UI
            errorBox.style.display = 'none';
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span><i data-lucide="loader-2" class="animate-spin" style="width: 18px; margin-right: 8px;"></i>VERIFICANDO...</span>';
            if (window.lucide) lucide.createIcons();

            try {
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Success: Store token
                    localStorage.setItem('bomclima_auth_session', JSON.stringify({
                        user: data.username,
                        token: data.token,
                        timestamp: new Date().getTime(),
                        active: true
                    }));

                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // Failure
                    throw new Error(data.error || 'Credenciais inválidas');
                }
            } catch (err) {
                errorBox.style.display = 'block';
                errorBox.textContent = err.message || 'Erro de conexão com o servidor';
                errorBox.classList.add('animate__animated', 'animate__headShake');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>ENTRAR</span><i data-lucide="arrow-right" style="width: 18px;"></i>';
                if (window.lucide) lucide.createIcons();

                // Remove animation class after it finishes
                setTimeout(() => {
                    errorBox.classList.remove('animate__animated', 'animate__headShake');
                }, 1000);
            }
        };
    }
});
