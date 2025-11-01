// auth.js - Simple JSONP version
const API_URL = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

document.addEventListener('DOMContentLoaded', function() {
    const currentUser = localStorage.getItem('ts_user');
    const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    
    if (currentUser && isLoginPage) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    if (!currentUser && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
        return;
    }

    if (isLoginPage) {
        setupLoginForm();
    }
});

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showError('請填寫轉運站和密碼');
            return;
        }

        setLoadingState(true);
        hideError();
        
        // Always use demo mode for now to avoid CORS issues
        demoAuthenticate(username, password);
    });
}

function setLoadingState(loading) {
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.disabled = loading;
        loginButton.innerHTML = loading ? '<span>登入中...</span>' : '<span class="btn-text">登入儀表板</span>';
    }
}

function showError(message) {
    let errorElement = document.getElementById('errorMessage');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'errorMessage';
        errorElement.className = 'error-message';
        document.getElementById('loginForm').parentNode.insertBefore(errorElement, document.getElementById('loginForm'));
    }
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function demoAuthenticate(username, password) {
    setTimeout(() => {
        const validStations = ['IETS', 'IWTS', 'NLTS', 'NWNNTS', 'OITF', 'STTS', 'WKTS'];
        
        if (!validStations.includes(username)) {
            showError('無效的轉運站代碼');
            setLoadingState(false);
            return;
        }
        
        if (!password || password.length < 1) {
            showError('請輸入密碼');
            setLoadingState(false);
            return;
        }
        
        const stationNames = {
            'IETS': '港島東轉運站',
            'IWTS': '港島西轉運站',
            'NLTS': '北大嶼山轉運站',
            'NWNNTS': '西北新界轉運站',
            'OITF': '離島轉運設施',
            'STTS': '沙田轉運站',
            'WKTS': '西九龍轉運站'
        };
        
        localStorage.setItem('ts_user', username);
        localStorage.setItem('ts_fullname', stationNames[username] || username);
        localStorage.setItem('ts_isAdmin', username === 'WKTS');
        window.location.href = 'dashboard.html';
    }, 1000);
}
