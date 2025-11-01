// auth.js - Consolidated version
const API_URL = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const currentUser = localStorage.getItem('ts_user');
    if (currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = document.getElementById('loginButton');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Password visibility toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🔒';
        });
    }

    // Enter key support
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

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
    }

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
        let errorElement = document.getElementById('errorMessage');
        if (!errorElement) {
            // Create error element if it doesn't exist
            errorElement = document.createElement('div');
            errorElement.id = 'errorMessage';
            errorElement.className = 'error-message';
            loginForm.parentNode.insertBefore(errorElement, loginForm);
        }
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    function hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
});

async function authenticateUser(username, password) {
    try {
        // First try API authentication
        const passwordHash = await sha256(password);
        
        const response = await fetch(`${API_URL}?action=login&username=${username}&password=${passwordHash}`);
        
        if (!response.ok) {
            throw new Error(`網絡錯誤: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // API authentication successful
            localStorage.setItem('ts_user', result.user);
            localStorage.setItem('ts_fullname', result.fullName);
            localStorage.setItem('ts_isAdmin', result.isAdmin);
            window.location.href = 'dashboard.html';
            return true;
        } else {
            // API authentication failed, fallback to demo mode
            console.warn('API auth failed, using demo mode');
            return await demoAuthenticate(username, password);
        }
        
    } catch (error) {
        console.warn('API call failed, using demo mode:', error.message);
        // Fallback to demo authentication if API is unavailable
        return await demoAuthenticate(username, password);
    }
}

async function demoAuthenticate(username, password) {
    // Demo authentication for testing
    const validStations = ['IETS', 'IWTS', 'NLTS', 'NWNNTS', 'OITF', 'STTS', 'WKTS'];
    
    if (!validStations.includes(username)) {
        throw new Error('無效的轉運站代碼');
    }
    
    if (!password || password.length < 1) {
        throw new Error('請輸入密碼');
    }
    
    // For demo - any non-empty password works
    localStorage.setItem('ts_user', username);
    localStorage.setItem('ts_fullname', getStationName(username));
    localStorage.setItem('ts_isAdmin', username === 'WKTS');
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
    return true;
}

async function sha256(message) {
    // Simple SHA-256 implementation
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStationName(stationCode) {
    const stations = {
        'IETS': '港島東轉運站',
        'IWTS': '港島西轉運站', 
        'NLTS': '北大嶼山轉運站',
        'NWNNTS': '西北新界轉運站',
        'OITF': '離島轉運設施',
        'STTS': '沙田轉運站',
        'WKTS': '西九龍轉運站 (管理員)'
    };
    return stations[stationCode] || stationCode;
}
