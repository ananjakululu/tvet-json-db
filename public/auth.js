// public/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. SECURITY CHECK
    // If user is already logged in, send them to the dashboard
    const token = localStorage.getItem('authToken');
    if (token) {
        window.location.href = 'dashboard.html';
    }

    // 2. THEME INITIALIZATION
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) themeIcon.className = savedTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

    document.getElementById('themeToggle')?.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
});

// ==========================================================================
//   UI HELPER FUNCTIONS
// ==========================================================================

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function switchMode(mode) {
    const slider = document.getElementById('slider');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const btns = document.querySelectorAll('.toggle-btn');

    if (!slider || !loginForm || !signupForm) return;

    if (mode === 'login') {
        slider.style.transform = 'translateX(0)';
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        slider.style.transform = 'translateX(100%)';
        btns[1].classList.add('active');
        btns[0].classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================================================
//   EVENT LISTENERS
// ==========================================================================

// 1. LOGIN FORM HANDLER
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('loginBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    btn.disabled = true;

    const email = document.getElementById('loginUser').value; 
    const password = document.getElementById('loginPass').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showToast('Success! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html'; 
            }, 500);
        } else {
            showToast(data.message || 'Invalid credentials', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        showToast('Network error. Check connection.', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// 2. SIGNUP FORM HANDLER
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPass').value;

    try {
        const res = await fetch('/api/signup', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role: 'teacher' })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showToast('Account created! Please log in.', 'success');
            switchMode('login'); 
        } else {
            showToast(data.message || 'Signup failed', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});