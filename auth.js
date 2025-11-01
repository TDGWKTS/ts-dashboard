// auth.js - Complete Revised Authentication
const API_URL = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth.js loaded - Checking authentication status...');
    
    // Check if user is already logged in
    const currentUser = localStorage.getItem('ts_user');
    console.log('Current user in localStorage:', currentUser);
    
    // If user is logged in AND we're on login page, redirect to dashboard
    if (currentUser && (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/'))) {
        console.log('User already logged in, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
        return;
    }
    
    // If user is NOT logged in AND we're on dashboard, redirect to login
    if (!currentUser && window.location.pathname.includes('dashboard.html')) {
        console.log('No user logged in, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    // Only set up login form if we're on login page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        console.log('Setting up login form...');
        setupLoginForm();
    }
});

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = document.getElementById('loginButton');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    console.log('Login form found, setting up event listeners...');

    // Create error message element if it doesn't exist
    if (!errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error-message hidden';
        loginForm.parentNode.insertBefore(errorDiv, loginForm);
        console.log('Error message element created');
    }

    // Password visibility toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🔒';
        });
        console.log('Password toggle setup complete');
    }

    // Enter key support for password field
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        console.log('Login attempt:', { username, passwordLength: password.length });

        if (!username || !password) {
            showError('請填寫轉運站和密碼');
            return;
        }

        // Show loading state
        setLoadingState(true);
        hideError();
        
        try {
            await authenticateUser(username, password);
        } catch (error) {
            console.error('Login error:', error);
            showError('登入錯誤: ' + error.message);
        } finally {
            setLoadingState(false);
        }
    });

    function setLoadingState(loading) {
        if (loginButton) {
            const btnText = loginButton.querySelector('.btn-text');
            const btnLoading = loginButton.querySelector('.btn-loading');
            
            if (btnText && btnLoading) {
                loginButton.disabled = loading;
                btnText.classList.toggle('hidden', loading);
                btnLoading.classList.toggle('hidden', !loading);
            } else {
                // Fallback for simple button
                loginButton.disabled = loading;
                loginButton.textContent = loading ? '登入中...' : '登入儀表板';
            }
        }
    }

    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            console.log('Error shown:', message);
        }
    }

    function hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    console.log('Login form setup complete');
}

async function authenticateUser(username, password) {
    console.log('Starting authentication for:', username);
    
    try {
        const passwordHash = await sha256(password);
        console.log('Password hashed, making API call...');
        
        const url = `${API_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(passwordHash)}`;
        console.log('API URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`網絡連接失敗 (HTTP ${response.status})`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
            // Store user info
            localStorage.setItem('ts_user', result.user);
            localStorage.setItem('ts_fullname', result.fullName);
            localStorage.setItem('ts_isAdmin', result.isAdmin);
            
            console.log('Login successful, user data stored:', {
                user: result.user,
                fullName: result.fullName,
                isAdmin: result.isAdmin
            });
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            throw new Error(result.error || '登入失敗：無效的憑證');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        throw new Error('登入失敗: ' + error.message);
    }
}

async function sha256(message) {
    // Simple SHA-256 implementation
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Utility function to clear authentication (for testing)
function clearAuth() {
    localStorage.removeItem('ts_user');
    localStorage.removeItem('ts_fullname');
    localStorage.removeItem('ts_isAdmin');
    console.log('Authentication cleared');
    window.location.href = 'index.html';
}
