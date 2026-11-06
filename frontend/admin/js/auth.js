/**
 * NOVASTORE ADMIN - AUTH
 * Handles login form, JWT storage, logout.
 */

const API_URL = window.location.origin + '/api';
const TOKEN_KEY = 'novaAdminToken';
const USER_KEY = 'novaAdminUser';

// ===================== LOGIN PAGE =====================
function initLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // If already logged in, redirect
    if (localStorage.getItem(TOKEN_KEY)) {
        window.location.href = '/admin/dashboard.html';
        return;
    }

    const errorBox = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginBtn');
    const btnText = submitBtn.querySelector('.btn-text');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showError('Email and password required');
            return;
        }

        // Disable button
        submitBtn.disabled = true;
        btnText.innerHTML = '<span class="btn-loader"></span>Signing in...';
        hideError();

        try {
            const res = await fetch(`${API_URL}/admin/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Login failed');
            }

            // Save token + user
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));

            // Redirect
            window.location.href = '/admin/dashboard.html';

        } catch (err) {
            showError(err.message || 'Login failed. Try again.');
        } finally {
            submitBtn.disabled = false;
            btnText.textContent = 'Sign In';
        }
    });

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.add('show');
    }

    function hideError() {
        errorBox.classList.remove('show');
    }
}

// ===================== DASHBOARD PAGE =====================
function initDashboardPage() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    // Check auth
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');

    if (!token || !user) {
        window.location.href = '/admin/index.html';
        return;
    }

    // Show user name
    const nameEl = document.getElementById('adminName');
    if (nameEl) nameEl.textContent = user.name || 'Admin';

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/admin/index.html';
    });
}

// ===================== EXPORT HELPERS =====================
window.novaAdmin = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getUser: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/admin/index.html';
    },
    authHeaders: () => {
        const token = localStorage.getItem(TOKEN_KEY);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initDashboardPage();
});
