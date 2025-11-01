// dashboard.js - Complete fixed version
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
            await this.loadDynamicFilters();
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

    async loadDynamicFilters() {
        try {
            const response = await fetch(`${API_URL}?action=getFilterOptions`);
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.populateDynamicFilters(result.data);
                    return;
                }
            }
        } catch (error) {
            console.warn('API load failed, using demo filters:', error);
        }
        await this.loadDemoFilters();
    }

    populateDynamicFilters(data) {
        const wasteCategoryFilter = document.getElementById('wasteCategoryFilter');
        if (wasteCategoryFilter && data.wasteCategories) {
            wasteCategoryFilter.innerHTML = '<option value="">所有類別</option>' +
                data.wasteCategories.map(category => 
                    `<option value="${category}">${category}</option>`
                ).join('');
        }

        const sourceFilter = document.getElementById('sourceFilter');
        if (sourceFilter && data.sourceRegions) {
            sourceFilter.innerHTML = '<option value="">所有地區</option>' +
                data.sourceRegions.map(region => 
                    `<option value="${region}">${region}</option>`
                ).join('');
        }
    }

    async loadDemoFilters() {
        const demoFilterData = {
            wasteCategories: [
                'P01.00 - 都市固體廢物',
                'P05.00 - 建築廢料', 
                'D01.00 - 危險廢物',
                'C01.00 - 商業廢物',
                'C02.00 - 工業廢物',
                'M01.00 - 混合廢物',
                'O01.00 - 有機廢物',
                'G01.00 - 園林廢物'
            ],
            sourceRegions: [
                '中西區', '灣仔區', '東區', '南區',
                '油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區',
                '葵青區', '荃灣區', '屯門區', '元朗區', '北區',
                '大埔區', '沙田區', '西貢區', '離島區'
            ]
        };
        this.populateDynamicFilters(demoFilterData);
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
        const dateRangeFilter = document.getElementById('dateRangeFilter');
        
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        if (compareBtn) compareBtn.addEventListener('click', () => this.loadComparisonData(this.getCurrentFilters()));
        if (exportCSVBtn) exportCSVBtn.addEventListener('click', () => this.exportCSV());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        if (dateRangeFilter) dateRangeFilter.addEventListener('change', () => this.handleDateRangeChange());
        
        this.setDefaultDates();
    }

    handleDateRangeChange() {
        const dateRangeType = document.getElementById('dateRangeFilter').value;
        const customDateRange = document.getElementById('customDateRange');
        const specificDateSelector = document.getElementById('specificDateSelector');
        
        customDateRange.classList.add('hidden');
        specificDateSelector.classList.add('hidden');
        
        if (dateRangeType === 'custom') {
            customDateRange.classList.remove('hidden');
            this.setDefaultCustomDates();
        } else if (dateRangeType === 'specificDate') {
            specificDateSelector.classList.remove('hidden');
            this.setDefaultSpecificDate();
        }
    }

    setDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('startDate').value = this.formatDateForInput(firstDay);
        document.getElementById('endDate').value = this.formatDateForInput(lastDay);
        document.getElementById('specificDate').value = this.formatDateForInput(today);
    }

    setDefaultCustomDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('startDate').value = this.formatDateForInput(firstDay);
        document.getElementById('endDate').value = this.formatDateForInput(lastDay);
    }

    setDefaultSpecificDate() {
        const today = new Date();
        document.getElementById('specificDate').value = this.formatDateForInput(today);
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
    
    loadNavigation() {
        const nav = document.getElementById('sidebarNav');
        if (!nav) return;
        
        const myStationSection = nav.querySelector('.nav-section:first-child');
        if (!myStationSection) return;
        
        myStationSection.innerHTML = '<div class="nav-title">我的轉運站</div>';
        
        Object.keys(this.tsConfig).forEach(tsCode => {
            const config = this.tsConfig[tsCode];
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'nav-link';
            link.innerHTML = `
                <span class="ts-color" style="background-color: ${config.color}"></span>
                <span class="ts-info">
                    <strong>${tsCode}</strong>
                    <small>${config.name}</small>
                </span>
            `;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTS(tsCode);
            });
            
            if (tsCode === this.currentUser && !config.isAdmin) {
                link.classList.add('active');
                myStationSection.appendChild(link);
            } else if (config.isAdmin && tsCode === this.currentUser) {
                link.classList.add('active');
                myStationSection.appendChild(link);
            } else if (this.isAdmin) {
                const adminSection = document.getElementById('adminSection');
                if (adminSection) {
                    if (!adminSection.querySelector('.nav-links')) {
                        const navLinks = document.createElement('div');
                        navLinks.className = 'nav-links';
                        adminSection.appendChild(navLinks);
                    }
                    adminSection.querySelector('.nav-links').appendChild(link);
                }
            }
        });
        
        if (this.isAdmin) {
            const compareLink = document.createElement('a');
            compareLink.href = '#';
            compareLink.className = 'nav-link compare-link';
            compareLink.innerHTML = `
                <span class="ts-color" style="background-color: #666"></span>
                <span class="ts-info">
                    <strong>比較所有轉運站</strong>
                    <small>多站數據對比</small>
                </span>
            `;
            
            compareLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTS('comparison');
            });
            
            const adminSection = document.getElementById('adminSection');
            if (adminSection) {
                if (!adminSection.querySelector('.nav-links')) {
                    const navLinks = document.createElement('div');
                    navLinks.className = 'nav-links';
                    adminSection.appendChild(navLinks);
                }
                adminSection.querySelector('.nav-links').appendChild(compareLink);
            }
        }
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
        const dateRangeType = document.getElementById('dateRangeFilter').value;
        let dateRange;
        
        if (dateRangeType === 'custom') {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            dateRange = { type: 'custom', startDate, endDate };
        } else if (dateRangeType === 'specificDate') {
            const specificDate = document.getElementById('specificDate').value;
            dateRange = { type: 'specificDate', date: specificDate };
        } else {
            dateRange = { type: dateRangeType, ...this.getDateRangeFromFilter(dateRangeType) };
        }
        
        return {
            dateRange: dateRange,
            wasteCategory: document.getElementById('wasteCategoryFilter').value || '',
            source: document.getElementById('sourceFilter').value || ''
        };
    }

    getDateRangeFromFilter(filterValue) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        switch(filterValue) {
            case 'currentQuarter':
                return this.getQuarterRange(currentYear, Math.floor(currentMonth / 3) + 1);
            case 'firstQuarter':
                return this.getQuarterRange(currentYear, 1);
            case 'secondQuarter':
                return this.getQuarterRange(currentYear, 2);
            case 'thirdQuarter':
                return this.getQuarterRange(currentYear, 3);
            case 'fourthQuarter':
                return this.getQuarterRange(currentYear, 4);
            case 'firstHalf':
                return {
                    start: new Date(currentYear, 0, 1),
                    end: new Date(currentYear, 5, 30)
                };
            case 'secondHalf':
                return {
                    start: new Date(currentYear, 6, 1),
                    end: new Date(currentYear, 11, 31)
                };
            case '1year':
                const oneYearAgo = new Date(currentYear - 1, currentMonth, now.getDate());
                return {
                    start: oneYearAgo,
                    end: now
                };
            default:
                return {
                    start: new Date(currentYear, 0, 1),
                    end: now
                };
        }
    }

    getQuarterRange(year, quarter) {
        switch(quarter) {
            case 1:
                return {
                    start: new Date(year, 0, 1),
                    end: new Date(year, 2, 31)
                };
            case 2:
                return {
                    start: new Date(year, 3, 1),
                    end: new Date(year, 5, 30)
                };
            case 3:
                return {
                    start: new Date(year, 6, 1),
                    end: new Date(year, 8, 30)
                };
            case 4:
                return {
                    start: new Date(year, 9, 1),
                    end: new Date(year, 11, 31)
                };
            default:
                return {
                    start: new Date(year, 0, 1),
                    end: new Date(year, 11, 31)
                };
        }
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

    // Mock data methods
    async loadMockSingleTSData(filters, page = 1) {
        const statsElement = document.getElementById('statsCards');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="ts-color" style="background-color: ${this.tsConfig[this.selectedTS]?.color || '#666'}"></span>
                        <h3>${this.tsConfig[this.selectedTS]?.name || this.selectedTS}</h3>
                    </div>
                    <div class="stat-value">1,247</div>
                    <div class="stat-label">總交易數</div>
                    <div class="stat-secondary">
                        <div>總重量: 8,542 噸</div>
                        <div>平均: 6.85 噸</div>
                        <div>最高: 15.2 噸</div>
                    </div>
                </div>
            `;
        }
        
        await this.loadMockTableData(filters, page);
    }

    async loadMockComparisonData(filters, page = 1) {
        const statsElement = document.getElementById('statsCards');
        if (statsElement) {
            const statsHTML = Object.keys(this.tsConfig)
                .filter(ts => !this.tsConfig[ts].isAdmin)
                .map(tsCode => {
                    const config = this.tsConfig[tsCode];
                    const totalTransactions = Math.floor(Math.random() * 2000) + 500;
                    const totalWeight = Math.floor(Math.random() * 15000) + 5000;
                    const avgWeight = (totalWeight / totalTransactions).toFixed(2);
                    const maxWeight = (Math.random() * 20 + 10).toFixed(1);
                    
                    return `
                        <div class="stat-card ${tsCode.toLowerCase()}">
                            <div class="stat-header">
                                <span class="ts-color" style="background-color: ${config.color}"></span>
                                <h3>${config.name}</h3>
                            </div>
                            <div class="stat-value">${totalTransactions.toLocaleString()}</div>
                            <div class="stat-label">總交易數</div>
                            <div class="stat-secondary">
                                <div>總重量: ${totalWeight.toLocaleString()} 噸</div>
                                <div>平均: ${avgWeight} 噸</div>
                                <div>最高: ${maxWeight} 噸</div>
                            </div>
                        </div>
                    `;
                }).join('');
            statsElement.innerHTML = statsHTML;
        }
        
        await this.loadComparisonTable(filters, page);
    }

    async loadMockTableData(filters, page = 1) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        const mockData = Array.from({ length: 10 }, (_, i) => ({
            TS_Name: this.tsConfig[this.selectedTS]?.name || this.selectedTS,
            日期: `2024-${String(page).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
            交收狀態: ['已完成', '進行中', '已取消'][i % 3],
            車輛任務: ['收集', '轉運', '處理'][i % 3],
            入磅時間: `08:${String(i * 5).padStart(2, '0')}`,
            物料重量: (Math.random() * 10 + 5).toFixed(1),
            廢物類別: ['P01.00', 'P05.00', 'D01.00'][i % 3],
            來源: ['葵青區', '深水埗區', '灣仔區', '荃灣區', '觀塘區'][i % 5]
        }));
        
        const tableHTML = mockData.map(record => `
            <tr>
                <td>${record.TS_Name}</td>
                <td>${record.日期}</td>
                <td>${record.交收狀態}</td>
                <td>${record.車輛任務}</td>
                <td>${record.入磅時間}</td>
                <td>${record.物料重量}</td>
                <td>${record.廢物類別}</td>
                <td>${record.來源}</td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = tableHTML;
        
        this.setupPagination({
            currentPage: page,
            totalPages: 5,
            totalRecords: 50,
            pageSize: 10
        }, filters);
    }

    async loadComparisonTable(filters, page = 1) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        const stations = Object.keys(this.tsConfig).filter(ts => !this.tsConfig[ts].isAdmin);
        const mockData = Array.from({ length: 10 }, (_, i) => {
            const randomTS = stations[Math.floor(Math.random() * stations.length)];
            return {
                TS_Name: this.tsConfig[randomTS].name,
                日期: `2024-${String(page).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
                交收狀態: ['已完成', '進行中', '已取消'][i % 3],
                車輛任務: ['收集', '轉運', '處理'][i % 3],
                入磅時間: `08:${String(i * 5).padStart(2, '0')}`,
                物料重量: (Math.random() * 10 + 5).toFixed(1),
                廢物類別: ['P01.00', 'P05.00', 'D01.00'][i % 3],
                來源: ['葵青區', '深水埗區', '灣仔區', '荃灣區', '觀塘區'][i % 5]
            };
        });
        
        const tableHTML = mockData.map(record => `
            <tr>
                <td>${record.TS_Name}</td>
                <td>${record.日期}</td>
                <td>${record.交收狀態}</td>
                <td>${record.車輛任務}</td>
                <td>${record.入磅時間}</td>
                <td>${record.物料重量}</td>
                <td>${record.廢物類別}</td>
                <td>${record.來源}</td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = tableHTML;
        
        this.setupPagination({
            currentPage: page,
            totalPages: 5,
            totalRecords: 50,
            pageSize: 10
        }, filters);
    }
    
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
            
            controlsElement.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.target.getAttribute('data-page'));
                    if (this.selectedTS === 'comparison') {
                        this.loadComparisonData(filters, page);
                    } else {
                        this.loadSingleTSData(filters, page);
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
            
        } catch (error) {
            console.error('Export error:', error);
            this.showError('導出失敗: ' + error.message);
        }
    }

    showLoading(show) {
        let loader = document.getElementById('loadingIndicator');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loadingIndicator';
            loader.className = 'global-loader hidden';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>加載數據中...</p>
                    <small>一年數據可能需要 10-15 秒</small>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.classList.toggle('hidden', !show);
    }

    showSkeletonUI() {
        const statsCards = document.getElementById('statsCards');
        const dataTable = document.getElementById('dataTable');
        
        if (statsCards) statsCards.innerHTML = '<div class="stat-skeleton"></div>';
        if (dataTable) dataTable.innerHTML = '<tr><td colspan="8"><div class="skeleton-cell"></div></td></tr>';
    }
    
    showError(message) {
        alert('錯誤: ' + message);
    }

    setupComparisonFilters() {
        // Implementation for comparison filters
    }

    initMobileNavigation() {
        if (typeof MobileNavigation !== 'undefined') {
            this.mobileNav = new MobileNavigation();
        }
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
