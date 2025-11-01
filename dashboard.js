// dashboard.js - Fixed version with working pagination and CSV export
const API_URL = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

class Dashboard {
    constructor() {
        this.currentUser = localStorage.getItem('ts_user');
        this.userFullName = localStorage.getItem('ts_fullname');
        this.isAdmin = localStorage.getItem('ts_isAdmin') === 'true';
        this.currentData = [];
        this.tsConfig = {};
        this.comparisonData = {};
        this.currentPage = 1;
        this.pageSize = 10;
        this.mobileNav = null;
        this.selectedTS = null;
        
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadTSConfig();
            this.setupUI();
            this.setupEventListeners();
            this.loadNavigation();
            this.initMobileNavigation();
            
            if (this.isAdmin) {
                this.setupComparisonFilters();
            }
            
            this.autoSelectStation();
            
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
        }
    }
    
    autoSelectStation() {
        if (!this.isAdmin) {
            this.selectedTS = this.currentUser;
            this.showFilterPanel();
            this.loadSingleTSData(this.getCurrentFilters());
        }
    }
    
    async loadTSConfig() {
        try {
            this.tsConfig = {
                'IETS': { name: '港島東轉運站', color: '#FF6B6B', isAdmin: false },
                'IWTS': { name: '港島西轉運站', color: '#4ECDC4', isAdmin: false },
                'NLTS': { name: '北大嶼山轉運站', color: '#45B7D1', isAdmin: false },
                'NWNNTS': { name: '西北新界轉運站', color: '#96CEB4', isAdmin: false },
                'OITF': { name: '離島轉運設施', color: '#FFEAA7', isAdmin: false },
                'STTS': { name: '沙田轉運站', color: '#DDA0DD', isAdmin: false },
                'WKTS': { name: '西九龍轉運站', color: '#98D8C8', isAdmin: true }
            };
        } catch (error) {
            console.error('Error loading TS config:', error);
            this.tsConfig = {
                'IETS': { name: '港島東轉運站', color: '#FF6B6B', isAdmin: false },
                'WKTS': { name: '西九龍轉運站', color: '#98D8C8', isAdmin: true }
            };
        }
    }
    
    setupUI() {
        document.getElementById('currentUser').textContent = this.userFullName;
        document.getElementById('userFullName').textContent = this.userFullName;
        document.getElementById('userRole').textContent = this.isAdmin ? '管理員' : '轉運站用戶';
        
        if (this.isAdmin) {
            document.getElementById('adminSection').classList.remove('hidden');
            document.getElementById('compareBtn').classList.remove('hidden');
        }
    }
    
    setupEventListeners() {
        const applyFiltersBtn = document.getElementById('applyFilters');
        const compareBtn = document.getElementById('compareBtn');
        const exportCSVBtn = document.getElementById('exportCSV');
        const logoutBtn = document.getElementById('logout');
        
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        if (compareBtn) compareBtn.addEventListener('click', () => this.loadComparisonData(this.getCurrentFilters()));
        if (exportCSVBtn) exportCSVBtn.addEventListener('click', () => this.exportCSV());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    }
    
    async selectTS(tsCode) {
        console.log('Selected TS:', tsCode);
        
        document.querySelectorAll('#sidebarNav .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        event.target.closest('.nav-link').classList.add('active');
        
        this.selectedTS = tsCode;
        this.showFilterPanel();
        
        if (tsCode === 'comparison') {
            await this.loadComparisonData(this.getCurrentFilters());
        } else {
            await this.loadSingleTSData(this.getCurrentFilters());
        }
    }
    
    showFilterPanel() {
        const welcomePage = document.getElementById('welcomePage');
        const dashboardContent = document.getElementById('dashboardContent');
        
        if (welcomePage) welcomePage.classList.add('hidden');
        if (dashboardContent) dashboardContent.classList.remove('hidden');
    }
    
    getCurrentFilters() {
        return {
            dateRange: document.getElementById('dateRangeFilter')?.value || '1year',
            wasteCategory: document.getElementById('wasteCategoryFilter')?.value || '',
            source: document.getElementById('sourceFilter')?.value || ''
        };
    }
    
    async applyFilters() {
        if (!this.selectedTS) {
            this.showError('請先選擇轉運站');
            return;
        }
        
        const filters = this.getCurrentFilters();
        
        if (this.selectedTS === 'comparison') {
            await this.loadComparisonData(filters);
        } else {
            await this.loadSingleTSData(filters);
        }
    }
    
    async loadSingleTSData(filters = {}, page = 1) {
        console.log('Loading single station data:', this.selectedTS, filters, 'Page:', page);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.currentPage = page;
        
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            await this.loadMockSingleTSData(filters, page);
        } catch (error) {
            this.showError('加載數據失敗: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadComparisonData(filters = {}, page = 1) {
        console.log('Loading comparison data with filters:', filters, 'Page:', page);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.selectedTS = 'comparison';
        this.currentPage = page;
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.loadMockComparisonData(filters, page);
        } catch (error) {
            this.showError('加載比較數據失敗: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    // ... (keep all your existing mock data methods the same, but ensure they accept page parameter)
    
    setupPagination(pagination, filters) {
        const infoElement = document.getElementById('paginationInfo');
        const controlsElement = document.getElementById('paginationControls');
        
        if (infoElement) {
            const startRecord = ((pagination.currentPage - 1) * pagination.pageSize) + 1;
            const endRecord = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords);
            infoElement.textContent = `顯示 ${startRecord}-${endRecord} 條，共 ${pagination.totalRecords.toLocaleString()} 條記錄`;
        }
        
        if (controlsElement) {
            let controlsHTML = '';
            
            if (pagination.currentPage > 1) {
                controlsHTML += `<button class="pagination-btn" data-page="${pagination.currentPage - 1}">上一頁</button>`;
            }
            
            controlsHTML += `<span class="pagination-info">第 ${pagination.currentPage} 頁，共 ${pagination.totalPages} 頁</span>`;
            
            if (pagination.currentPage < pagination.totalPages) {
                controlsHTML += `<button class="pagination-btn" data-page="${pagination.currentPage + 1}">下一頁</button>`;
            }
            
            controlsElement.innerHTML = controlsHTML;
            
            // Add event listeners to pagination buttons
            controlsElement.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.target.getAttribute('data-page'));
                    if (this.selectedTS === 'comparison') {
                        this.loadComparisonTable(filters, page);
                    } else {
                        this.loadMockTableData(filters, page);
                    }
                });
            });
        }
    }
    
    exportCSV() {
        if (!this.selectedTS) {
            this.showError('請先選擇轉運站或比較模式');
            return;
        }
        
        try {
            const table = document.getElementById('dataTable');
            if (!table) {
                this.showError('沒有數據可導出');
                return;
            }
            
            const rows = table.querySelectorAll('tr');
            if (rows.length === 0) {
                this.showError('沒有數據可導出');
                return;
            }
            
            const headers = ['轉運站', '日期', '交收狀態', '車輛任務', '入磅時間', '物料重量 (噸)', '廢物類別', '來源'];
            let csvContent = headers.join(',') + '\n';
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length > 0) {
                    const rowData = Array.from(cells).map(cell => {
                        let cellText = cell.textContent.trim();
                        if (cellText.includes(',') || cellText.includes('"') || cellText.includes('\n')) {
                            cellText = '"' + cellText.replace(/"/g, '""') + '"';
                        }
                        return cellText;
                    });
                    csvContent += rowData.join(',') + '\n';
                }
            });
            
            const filename = this.selectedTS === 'comparison' 
                ? `轉運站比較數據_${new Date().toISOString().split('T')[0]}.csv`
                : `${this.selectedTS}_數據_${new Date().toISOString().split('T')[0]}.csv`;
            
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('CSV exported successfully:', filename);
            
        } catch (error) {
            console.error('Export error:', error);
            this.showError('導出失敗: ' + error.message);
        }
    }
    
    showError(message) {
        alert('錯誤: ' + message);
    }
    
    logout() {
        localStorage.removeItem('ts_user');
        localStorage.removeItem('ts_fullname');
        localStorage.removeItem('ts_isAdmin');
        window.location.href = 'index.html';
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = localStorage.getItem('ts_user');
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    window.dashboard = new Dashboard();
});
