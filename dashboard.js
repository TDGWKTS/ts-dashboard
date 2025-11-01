// Replace with your Google Apps Script deployment URL
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
        this.pageSize = 50;
        this.mobileNav = null;
        this.selectedTS = null;
        
        // Check authentication first
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
            
            // Auto-select user's station if not admin, or first station for admin
            this.autoSelectStation();
            
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
        }
    }
    
    autoSelectStation() {
        if (!this.isAdmin) {
            // For regular users, auto-select their station
            this.selectedTS = this.currentUser;
            this.showFilterPanel();
            this.loadSingleTSData(this.getCurrentFilters());
        } else {
            // For admin users, show welcome page until they select a station
            console.log('Admin user - please select a station from sidebar');
        }
    }
    
    async loadTSConfig() {
        try {
            // For demo - create a mock TS config
            this.tsConfig = {
                'IETS': { name: '港島東轉運站', color: '#FF6B6B', isAdmin: false },
                'IWTS': { name: '港島西轉運站', color: '#4ECDC4', isAdmin: false },
                'NLTS': { name: '北大嶼山轉運站', color: '#45B7D1', isAdmin: false },
                'NWNNTS': { name: '西北新界轉運站', color: '#96CEB4', isAdmin: false },
                'OITF': { name: '離島轉運設施', color: '#FFEAA7', isAdmin: false },
                'STTS': { name: '沙田轉運站', color: '#DDA0DD', isAdmin: false },
                'WKTS': { name: '西九龍轉運站', color: '#98D8C8', isAdmin: true }
            };
            
            console.log('TS Config loaded:', this.tsConfig);
            
        } catch (error) {
            console.error('Error loading TS config:', error);
            // Fallback config
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
        // Add null checks for event listeners
        const applyFiltersBtn = document.getElementById('applyFilters');
        const compareBtn = document.getElementById('compareBtn');
        const exportCSVBtn = document.getElementById('exportCSV');
        const logoutBtn = document.getElementById('logout');
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }
        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.loadComparisonData(this.getCurrentFilters()));
        }
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => this.exportCSV());
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Add event listeners for filter changes
        const dateFilter = document.getElementById('dateRangeFilter');
        const wasteFilter = document.getElementById('wasteCategoryFilter');
        const sourceFilter = document.getElementById('sourceFilter');
        
        if (dateFilter) dateFilter.addEventListener('change', () => this.onFilterChange());
        if (wasteFilter) wasteFilter.addEventListener('change', () => this.onFilterChange());
        if (sourceFilter) sourceFilter.addEventListener('change', () => this.onFilterChange());
    }
    
    onFilterChange() {
        // Auto-apply filters when they change (optional)
        // You can remove this if you prefer manual apply only
        if (this.selectedTS) {
            // this.applyFilters(); // Uncomment for auto-apply
        }
    }
    
    setupComparisonFilters() {
        // Already included in the HTML structure
        console.log('Comparison filters setup for admin');
    }
    
    loadNavigation() {
        const nav = document.getElementById('sidebarNav');
        if (!nav) return;
        
        const myStationSection = nav.querySelector('.nav-section:first-child');
        if (!myStationSection) return;
        
        // Clear existing navigation
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
                    // Create admin section if it doesn't exist
                    if (!adminSection.querySelector('.nav-links')) {
                        const navLinks = document.createElement('div');
                        navLinks.className = 'nav-links';
                        adminSection.appendChild(navLinks);
                    }
                    adminSection.querySelector('.nav-links').appendChild(link);
                }
            }
        });
        
        // Add comparison link for admin users
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
        
        // Update active state
        document.querySelectorAll('#sidebarNav .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`#sidebarNav .nav-link strong`);
        if (activeLink) {
            activeLink.closest('.nav-link').classList.add('active');
        }
        
        this.selectedTS = tsCode;
        this.showFilterPanel();
        
        // Load data based on selection
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
        console.log('Applying filters:', filters, 'for TS:', this.selectedTS);
        
        if (this.selectedTS === 'comparison') {
            await this.loadComparisonData(filters);
        } else {
            await this.loadSingleTSData(filters);
        }
    }
    
    async loadSingleTSData(filters = {}) {
        console.log('Loading single station data:', this.selectedTS, filters);
        
        this.showLoading(true);
        this.showSkeletonUI();
        
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // For demo - generate mock data
            await this.loadMockSingleTSData(filters);
            
        } catch (error) {
            console.error('Error loading single TS data:', error);
            this.showError('加載數據失敗: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadMockSingleTSData(filters) {
        // Mock stats data
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
        
        // Mock charts data
        const chartsContainer = document.getElementById('chartsContainer');
        if (chartsContainer) {
            chartsContainer.innerHTML = `
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>月度趨勢 - ${this.selectedTS}</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="singleTrendChart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>廢物類別分佈</h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="wasteDistributionChart"></canvas>
                    </div>
                </div>
            `;
            
            // Render mock charts
            this.renderMockCharts();
        }
        
        // Mock table data
        await this.loadMockTableData(filters);
    }
    
    renderMockCharts() {
        // Mock trend chart
        const trendCtx = document.getElementById('singleTrendChart')?.getContext('2d');
        if (trendCtx) {
            new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                    datasets: [{
                        label: '總重量 (噸)',
                        data: [650, 590, 800, 810, 560, 550, 600, 750, 820, 830, 780, 850],
                        borderColor: this.tsConfig[this.selectedTS]?.color || '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Mock distribution chart
        const distCtx = document.getElementById('wasteDistributionChart')?.getContext('2d');
        if (distCtx) {
            new Chart(distCtx, {
                type: 'doughnut',
                data: {
                    labels: ['P01.00', 'P05.00', 'D01.00', '其他'],
                    datasets: [{
                        data: [40, 25, 20, 15],
                        backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }
    
    async loadMockTableData(filters, page = 1) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        // Generate mock table data
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
        
        // Setup mock pagination
        this.setupPagination({
            currentPage: page,
            totalPages: 5,
            totalRecords: 50,
            pageSize: 10
        }, filters);
    }
    
    async loadComparisonData(filters = {}) {
        console.log('Loading comparison data with filters:', filters);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.selectedTS = 'comparison';
        
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // For demo - generate mock comparison data
            await this.loadMockComparisonData(filters);
            
        } catch (error) {
            console.error('Error loading comparison data:', error);
            this.showError('加載比較數據失敗: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadMockComparisonData(filters) {
        // Mock comparison stats
        await this.loadComparisonStats(filters);
        
        // Mock comparison charts
        await this.loadComparisonCharts(filters);
        
        // Mock comparison table
        await this.loadComparisonTable(filters, 1);
    }
    
    async loadComparisonStats(filters) {
        const statsElement = document.getElementById('statsCards');
        if (!statsElement) return;
        
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
    
    async loadComparisonCharts(filters) {
        const chartsContainer = document.getElementById('chartsContainer');
        if (!chartsContainer) return;
        
        chartsContainer.innerHTML = `
            <div class="chart-card">
                <div class="chart-header">
                    <h3>月度趨勢 - 總重量</h3>
                </div>
                <div class="chart-wrapper">
                    <canvas id="monthlyTrendsChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3>轉運站比較</h3>
                </div>
                <div class="chart-wrapper">
                    <canvas id="tsComparisonChart"></canvas>
                </div>
            </div>
        `;
        
        // Render comparison charts
        this.renderComparisonCharts();
    }
    
    renderComparisonCharts() {
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        const stations = Object.keys(this.tsConfig).filter(ts => !this.tsConfig[ts].isAdmin);
        
        // Monthly trends chart
        const trendsCtx = document.getElementById('monthlyTrendsChart')?.getContext('2d');
        if (trendsCtx) {
            const datasets = stations.map(tsCode => ({
                label: this.tsConfig[tsCode].name,
                data: months.map(() => Math.floor(Math.random() * 1000) + 500),
                borderColor: this.tsConfig[tsCode].color,
                backgroundColor: this.tsConfig[tsCode].color + '20',
                tension: 0.4
            }));
            
            new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Comparison chart
        const comparisonCtx = document.getElementById('tsComparisonChart')?.getContext('2d');
        if (comparisonCtx) {
            new Chart(comparisonCtx, {
                type: 'bar',
                data: {
                    labels: stations.map(ts => this.tsConfig[ts].name),
                    datasets: [{
                        label: '總重量 (噸)',
                        data: stations.map(() => Math.floor(Math.random() * 15000) + 5000),
                        backgroundColor: stations.map(ts => this.tsConfig[ts].color),
                        borderColor: stations.map(ts => this.tsConfig[ts].color),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
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
        
        // Setup pagination
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
            infoElement.textContent = `顯示 ${((pagination.currentPage - 1) * pagination.pageSize) + 1}-${Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)} 條，共 ${pagination.totalRecords.toLocaleString()} 條記錄`;
        }
        
        if (controlsElement) {
            let controlsHTML = '';
            
            if (pagination.currentPage > 1) {
                controlsHTML += `<button class="pagination-btn" onclick="dashboard.loadComparisonTable(${JSON.stringify(filters)}, ${pagination.currentPage - 1})">上一頁</button>`;
            }
            
            controlsHTML += `<span class="pagination-info">第 ${pagination.currentPage} 頁，共 ${pagination.totalPages} 頁</span>`;
            
            if (pagination.currentPage < pagination.totalPages) {
                controlsHTML += `<button class="pagination-btn" onclick="dashboard.loadComparisonTable(${JSON.stringify(filters)}, ${pagination.currentPage + 1})">下一頁</button>`;
            }
            
            controlsElement.innerHTML = controlsHTML;
        }
    }
    
    // Skeleton UI methods
    createStatsSkeleton() {
        return Array(3).fill(0).map(() => `
            <div class="stat-skeleton">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line long"></div>
                <div class="skeleton-line medium"></div>
            </div>
        `).join('');
    }
    
    createChartsSkeleton() {
        return Array(2).fill(0).map(() => `
            <div class="chart-skeleton">
                <div class="skeleton-line"></div>
                <div class="skeleton-chart"></div>
            </div>
        `).join('');
    }
    
    createTableSkeleton() {
        return Array(5).fill(0).map(() => `
            <tr>
                <td colspan="8">
                    <div class="skeleton-cell"></div>
                </td>
            </tr>
        `).join('');
    }
    
    showSkeletonUI() {
        const statsCards = document.getElementById('statsCards');
        const chartsContainer = document.getElementById('chartsContainer');
        const dataTable = document.getElementById('dataTable');
        
        if (statsCards) statsCards.innerHTML = this.createStatsSkeleton();
        if (chartsContainer) chartsContainer.innerHTML = this.createChartsSkeleton();
        if (dataTable) dataTable.innerHTML = this.createTableSkeleton();
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
    
    showError(message) {
        // Simple error display
        alert('錯誤: ' + message);
    }
    
    exportCSV() {
        if (!this.selectedTS) {
            this.showError('請先選擇轉運站或比較模式');
            return;
        }
        
        // Mock CSV export
        const filename = this.selectedTS === 'comparison' 
            ? `轉運站比較數據_${new Date().toISOString().split('T')[0]}.csv`
            : `${this.selectedTS}_數據_${new Date().toISOString().split('T')[0]}.csv`;
        
        alert(`導出功能演示: ${filename}`);
        // Actual CSV export implementation would go here
    }
    
    initMobileNavigation() {
        // Mobile navigation will auto-initialize via mobile-nav.js
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

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = localStorage.getItem('ts_user');
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    console.log('Dashboard initialized for authenticated user:', currentUser);
    window.dashboard = new Dashboard();
});
