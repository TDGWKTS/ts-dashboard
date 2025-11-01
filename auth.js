// Replace with your Google Apps Script deployment URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('請填寫轉運站和密碼');
        return;
    }
    
    const loginBtn = e.target.querySelector('button[type="submit"]');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = '登入中...';
    loginBtn.disabled = true;
    
    try {
        const passwordHash = await sha256(password);
        
        const response = await fetch(`${API_URL}?action=login&username=${username}&password=${passwordHash}`);
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('ts_user', result.user);
            localStorage.setItem('ts_fullname', result.fullName);
            localStorage.setItem('ts_isAdmin', result.isAdmin);
            window.location.href = 'dashboard.html';
        } else {
            alert('登入失敗: ' + result.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('登入錯誤: ' + error.message);
    } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
});

// Enter key support
document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }

});
// auth.js
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

    // Create error message element if it doesn't exist
    if (!errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error-message hidden';
        loginForm.parentNode.insertBefore(errorDiv, loginForm);
    }

    // Password visibility toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🔒';
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
            
            try {
                await authenticateUser(username, password);
                
            } catch (error) {
                console.error('Login error:', error);
                showError(error.message);
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
            }
        }
    }

    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }
});

async function authenticateUser(username, password) {
    // For demo purposes - use simple authentication without API call
    // Remove this in production and use real API
    
    console.log('Authenticating:', username);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const validStations = ['IETS', 'IWTS', 'NLTS', 'NWNNTS', 'OITF', 'STTS', 'WKTS'];
    
    if (!validStations.includes(username)) {
        throw new Error('無效的轉運站代碼');
    }
    
    // Simple password check - in real app, this would be API call
    if (!password || password.length < 1) {
        throw new Error('請輸入密碼');
    }
    
    // For demo - any non-empty password works
    // Store user info
    localStorage.setItem('ts_user', username);
    localStorage.setItem('ts_fullname', getStationName(username));
    localStorage.setItem('ts_isAdmin', username === 'WKTS');
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
    
    return true;
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
