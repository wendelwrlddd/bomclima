// Authentication Logic for Bom Clima Dashboard
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorBox = document.getElementById('error-box');
    const loginBtn = document.getElementById('login-btn');

    // Target credentials
    const TARGET_USER = 'laise';
    const TARGET_PASS = 'bomclima1.9';

    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;

            // Reset UI
            errorBox.style.display = 'none';
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span>VERIFICANDO...</span>';

            // Simulate slight delay for professional feel
            setTimeout(() => {
                if (usernameInput === TARGET_USER && passwordInput === TARGET_PASS) {
                    // Success: Store session
                    // We use localStorage so it persists even if the tab is closed, 
                    // until they explicitly logout or clear cache.
                    localStorage.setItem('bomclima_auth_session', JSON.stringify({
                        user: TARGET_USER,
                        timestamp: new Date().getTime(),
                        active: true
                    }));

                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // Failure
                    errorBox.style.display = 'block';
                    errorBox.classList.add('animate__animated', 'animate__headShake');
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>ENTRAR</span><i data-lucide="arrow-right" style="width: 18px;"></i>';
                    lucide.createIcons();
                    
                    // Remove animation class after it finishes
                    setTimeout(() => {
                        errorBox.classList.remove('animate__animated', 'animate__headShake');
                    }, 1000);
                }
            }, 800);
        };
    }
});
