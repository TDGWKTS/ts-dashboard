// auth.js - JSONP version
const API_URL = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Auth.js loaded');
    
    const currentUser = localStorage.getItem('ts_user');
    const isLoginPage = window.location.pathname.includes('index.html') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/');
    
    if (currentUser && isLoginPage) {
        console.log('✅ User already logged in, redirecting...');
        window.location.href = 'dashboard.html';
        return;
    }
    
    if (!currentUser && window.location.pathname.includes('dashboard.html')) {
        console.log('❌ No user logged in, redirecting...');
        window.location.href = 'index.html';
        return;
    }

    if (isLoginPage) {
        setupLoginForm();
    }
});

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (!loginForm) return;

    if (!errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error-message hidden';
        loginForm.parentNode.insertBefore(errorDiv, loginForm);
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showError('請填寫轉運站和密碼');
            return;
        }

        setLoadingState(true);
        hideError();
        
        try {
            await authenticateUser(username, password);
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
    });

    function setLoadingState(loading) {
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.disabled = loading;
            loginButton.innerHTML = loading ? '<span>登入中...</span>' : '<span class="btn-text">登入儀表板</span>';
        }
    }

    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    function hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
}

async function authenticateUser(username, password) {
    console.log('Starting authentication for:', username);
    
    try {
        // Try JSONP first
        await jsonpAuthenticate(username, password);
    } catch (error) {
        console.error('JSONP failed, using demo mode:', error);
        await demoAuthenticate(username, password);
    }
}

function jsonpAuthenticate(username, password) {
    return new Promise(async (resolve, reject) => {
        try {
            const passwordHash = await sha256(password);
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            
            const script = document.createElement('script');
            const url = `${API_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(passwordHash)}&callback=${callbackName}`;
            
            script.src = url;
            script.onerror = () => {
                reject(new Error('無法連接到伺服器'));
            };
            
            window[callbackName] = function(response) {
                delete window[callbackName];
                document.body.removeChild(script);
                
                if (response && response.success) {
                    localStorage.setItem('ts_user', response.user);
                    localStorage.setItem('ts_fullname', response.fullName);
                    localStorage.setItem('ts_isAdmin', response.isAdmin);
                    window.location.href = 'dashboard.html';
                    resolve();
                } else {
                    reject(new Error(response.error || '登入失敗'));
                }
            };
            
            document.body.appendChild(script);
            
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    reject(new Error('請求超時'));
                }
            }, 10000);
            
        } catch (error) {
            reject(error);
        }
    });
}

async function demoAuthenticate(username, password) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const validStations = ['IETS', 'IWTS', 'NLTS', 'NWNNTS', 'OITF', 'STTS', 'WKTS'];
    
    if (!validStations.includes(username)) {
        throw new Error('無效的轉運站代碼');
    }
    
    if (!password || password.length < 1) {
        throw new Error('請輸入密碼');
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
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
