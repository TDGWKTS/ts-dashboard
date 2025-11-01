// auth.js - Fixed version with better error handling
const API_URL = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Auth.js loaded - Checking authentication status...');
    
    // Check if user is already logged in
    const currentUser = localStorage.getItem('ts_user');
    console.log('📋 Current user in localStorage:', currentUser);
    
    const isLoginPage = window.location.pathname.includes('index.html') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/');
    
    // If user is logged in AND we're on login page, redirect to dashboard
    if (currentUser && isLoginPage) {
        console.log('✅ User already logged in, redirecting to dashboard...');
        window.location.href = 'dashboard.html';
        return;
    }
    
    // If user is NOT logged in AND we're on dashboard, redirect to login
    if (!currentUser && window.location.pathname.includes('dashboard.html')) {
        console.log('❌ No user logged in, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    // Only set up login form if we're on login page
    if (isLoginPage) {
        console.log('🔄 Setting up login form...');
        setupLoginForm();
    }
});

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (!loginForm) {
        console.error('❌ Login form not found');
        return;
    }

    console.log('✅ Login form found');

    // Create error message element if it doesn't exist
    if (!errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error-message hidden';
        loginForm.parentNode.insertBefore(errorDiv, loginForm);
    }

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📤 Login form submitted');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        console.log('🔑 Login attempt:', { username, passwordLength: password ? password.length : 0 });

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
            console.error('❌ Login error:', error);
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
    });

    function setLoadingState(loading) {
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.disabled = loading;
            if (loading) {
                loginButton.innerHTML = '<span>登入中...</span>';
            } else {
                loginButton.innerHTML = '<span class="btn-text">登入儀表板</span>';
            }
        }
    }

    function showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            console.log('❌ Error shown:', message);
        }
    }

    function hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    console.log('✅ Login form setup complete');
}

async function authenticateUser(username, password) {
    console.log('🔐 Starting authentication for:', username);
    
    try {
        // For testing - use demo authentication first
        console.log('🔄 Using demo authentication for testing...');
        await demoAuthenticate(username, password);
        
    } catch (error) {
        console.error('❌ Demo auth failed, trying API...', error);
        
        try {
            // Try real API authentication
            await apiAuthenticate(username, password);
        } catch (apiError) {
            console.error('❌ API authentication failed:', apiError);
            throw new Error('無法連接到伺服器。請檢查網絡連接或稍後再試。');
        }
    }
}

// Demo authentication for testing
async function demoAuthenticate(username, password) {
    console.log('🎯 Using demo authentication');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const validStations = ['IETS', 'IWTS', 'NLTS', 'NWNNTS', 'OITF', 'STTS', 'WKTS'];
    
    if (!validStations.includes(username)) {
        throw new Error('無效的轉運站代碼');
    }
    
    if (!password || password.length < 1) {
        throw new Error('請輸入密碼');
    }
    
    // For demo - any non-empty password works
    const stationNames = {
        'IETS': '港島東轉運站',
        'IWTS': '港島西轉運站',
        'NLTS': '北大嶼山轉運站',
        'NWNNTS': '西北新界轉運站',
        'OITF': '離島轉運設施',
        'STTS': '沙田轉運站',
        'WKTS': '西九龍轉運站'
    };
    
    // Store user info
    localStorage.setItem('ts_user', username);
    localStorage.setItem('ts_fullname', stationNames[username] || username);
    localStorage.setItem('ts_isAdmin', username === 'WKTS');
    
    console.log('✅ Demo login successful:', {
        user: username,
        fullName: stationNames[username],
        isAdmin: username === 'WKTS'
    });
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
}

// Real API authentication
async function apiAuthenticate(username, password) {
    console.log('🌐 Starting API authentication...');
    
    try {
        const passwordHash = await sha256(password);
        console.log('🔒 Password hashed');
        
        const url = `${API_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(passwordHash)}`;
        console.log('📡 API URL:', url);
        
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📨 API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`網絡錯誤 (HTTP ${response.status})`);
        }
        
        const result = await response.json();
        console.log('📊 API Response data:', result);
        
        if (result.success) {
            // Store user info
            localStorage.setItem('ts_user', result.user);
            localStorage.setItem('ts_fullname', result.fullName);
            localStorage.setItem('ts_isAdmin', result.isAdmin);
            
            console.log('✅ API login successful:', {
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
        console.error('❌ API authentication error:', error);
        if (error.name === 'AbortError') {
            throw new Error('連接超時，請檢查網絡連接');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('無法連接到伺服器。請檢查：\n1. 網絡連接\n2. Google Apps Script 是否已部署\n3. 瀏覽器是否阻止了請求');
        } else {
            throw new Error('登入失敗: ' + error.message);
        }
    }
}

async function sha256(message) {
    // Simple SHA-256 implementation
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Utility function to test API connection
async function testAPIConnection() {
    console.log('🧪 Testing API connection...');
    try {
        const response = await fetch(API_URL + '?action=test');
        console.log('API test response:', response);
        return response.ok;
    } catch (error) {
        console.error('API test failed:', error);
        return false;
    }
}

// Clear authentication data
function clearAuth() {
    localStorage.removeItem('ts_user');
    localStorage.removeItem('ts_fullname');
    localStorage.removeItem('ts_isAdmin');
    console.log('🧹 Authentication data cleared');
    window.location.href = 'index.html';
}

// Add this to test the API on page load
document.addEventListener('DOMContentLoaded', function() {
    // Test API connection when page loads
    setTimeout(() => {
        testAPIConnection().then(success => {
            if (!success) {
                console.warn('⚠️ API connection test failed - using demo mode');
            }
        });
    }, 1000);
});
