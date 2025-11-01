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