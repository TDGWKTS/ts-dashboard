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
        this.init();
    }
    
    async init() {
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        await this.loadTSConfig();
        this.setupUI();
        this.setupEventListeners();
        this.loadNavigation();
        
        if (this.isAdmin) {
            this.setupComparisonFilters();
        }
    }
    
    async loadTSConfig() {
        try {
            const response = await fetch(`${API_URL}?action=getTSConfig&user=${this.currentUser}`);
            const result = await response.json();
            this.tsConfig = result.tsConfig;
        } catch (error) {
            console.error('Error loading TS config:', error);
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
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('compareBtn').addEventListener('click', () => this.loadComparisonData(this.getCurrentFilters()));
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('logout').addEventListener('click', () => this.logout());
    }
    
    setupComparisonFilters() {
        // Already included in the HTML structure
    }
    
    loadNavigation() {
        const nav = document.getElementById('sidebarNav');
        const myStationSection = nav.querySelector('.nav-section:first-child');
        
        // Clear existing navigation
        myStationSection.innerHTML = '<div class="nav-title">我的轉運站</div>';
        
        Object.keys(this.tsConfig).forEach(tsCode => {
            const config = this.tsConfig[tsCode];
            const link = document.createElement('a');
            link.href = '#';
            link.innerHTML = `
                <span class="ts-color" style="background-color: ${config.color}"></span>
                <span class="ts-info">
                    <strong>${tsCode}</strong>
                    <small>${config.name}</small>
                </span>
            `;
            
            link.addEventListener('click', () => this.selectTS(tsCode));
            
            if (tsCode === this.currentUser && !config.isAdmin) {
                link.classList.add('active');
                myStationSection.appendChild(link);
            } else if (config.isAdmin && tsCode === this.currentUser) {
                link.classList.add('active');
                myStationSection.appendChild(link);
            } else if (this.isAdmin) {
                document.getElementById('adminSection').appendChild(link);
            }
        });
    }
    
    async selectTS(tsCode) {
        // Update active state
        document.querySelectorAll('#sidebarNav a').forEach(link => link.classList.remove('active'));
        event.target.closest('a').classList.add('active');
        
        this.selectedTS = tsCode;
        this.showFilterPanel();
    }
    
    showFilterPanel() {
        document.getElementById('welcomePage').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
    }
    
    getCurrentFilters() {
        return {
            dateRange: document.getElementById('dateRangeFilter').value,
            wasteCategory: document.getElementById('wasteCategoryFilter').value,
            source: document.getElementById('sourceFilter').value
        };
    }
    
    async applyFilters() {
        const filters = this.getCurrentFilters();
        
        if (this.isAdmin && this.selectedTS === 'comparison') {
            await this.loadComparisonData(filters);
        } else {
            await this.loadSingleTSData(filters);
        }
    }
    
    async loadComparisonData(filters = {}) {
        console.log('Loading comparison data with filters:', filters);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.selectedTS = 'comparison';
        
        try {
            // Load stats, charts, and table data
            await Promise.all([
                this.loadComparisonStats(filters),
                this.loadComparisonCharts(filters),
                this.loadComparisonTable(filters, 1)
            ]);
            
        } catch (error) {
            console.error('Error loading comparison data:', error);
            this.showError('加載比較數據失敗。請嘗試較小的日期範圍。');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadComparisonStats(filters) {
        const statsElement = document.getElementById('statsCards');
        statsElement.innerHTML = this.createStatsSkeleton();
        
        try {
            const response = await fetch(`${API_URL}?action=getComparisonStats&user=${this.currentUser}&filters=${JSON.stringify(filters)}`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            
            if (result.error) throw new Error(result.error);
            
            this.comparisonData.stats = result.data;
            this.renderComparisonStats(result.data);
            
            console.log(`Stats loaded in ${result.metadata.calculationTime}`);
            
        } catch (error) {
            console.error('Error loading stats:', error);
            statsElement.innerHTML = `
                <div class="error-card">
                    <h3>❌ 加載統計數據失敗</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    async loadComparisonCharts(filters) {
        const chartsContainer = document.getElementById('chartsContainer');
        chartsContainer.innerHTML = this.createChartsSkeleton();
        
        try {
            const response = await fetch(`${API_URL}?action=getComparisonCharts&user=${this.currentUser}&filters=${JSON.stringify(filters)}`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            
            if (result.error) throw new Error(result.error);
            
            this.comparisonData.charts = result;
            this.renderComparisonCharts(result);
            
            console.log(`Charts loaded in ${result.metadata.calculationTime}`);
            
        } catch (error) {
            console.error('Error loading charts:', error);
            chartsContainer.innerHTML = `
                <div class="error-card">
                    <h3>❌ 加載圖表失敗</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    async loadComparisonTable(filters, page = 1) {
        const tableContainer = document.getElementById('dataTable');
        tableContainer.innerHTML = this.createTableSkeleton();
        
        try {
            const response = await fetch(`${API_URL}?action=getComparisonTable&user=${this.currentUser}&filters=${JSON.stringify(filters)}&page=${page}&pageSize=${this.pageSize}`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            
            if (result.error) throw new Error(result.error);
            
            this.renderComparisonTable(result);
            this.setupPagination(result.pagination, filters);
            
            console.log(`Table data loaded in ${result.metadata.calculationTime}`);
            
        } catch (error) {
            console.error('Error loading table:', error);
            tableContainer.innerHTML = `
                <tr>
                    <td colspan="8" class="error-message">
                        ❌ 加載表格數據失敗: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    renderComparisonStats(statsData) {
        const statsContainer = document.getElementById('statsCards');
        
        if (!statsData || statsData.length === 0) {
            statsContainer.innerHTML = '<div class="no-data">選定的篩選條件沒有可用數據</div>';
            return;
        }
        
        const statsHTML = statsData.map(ts => `
            <div class="stat-card ${ts.tsCode.toLowerCase()}">
                <div class="stat-header">
                    <span class="ts-color" style="background-color: ${ts.color}"></span>
                    <h3>${ts.tsName}</h3>
                </div>
                <div class="stat-value">${ts.stats.totalTransactions.toLocaleString()}</div>
                <div class="stat-label">總交易數</div>
                <div class="stat-secondary">
                    <div>總重量: ${ts.stats.totalWeight.toLocaleString()} 噸</div>
                    <div>平均: ${ts.stats.avgWeight.toLocaleString()} 噸</div>
                    <div>最高: ${ts.stats.maxWeight.toLocaleString()} 噸</div>
                </div>
            </div>
        `).join('');
        
        statsContainer.innerHTML = statsHTML;
    }
    
    renderComparisonCharts(chartData) {
        const chartsContainer = document.getElementById('chartsContainer');
        
        if (!chartData.monthlyTrends) {
            chartsContainer.innerHTML = '<div class="no-data">沒有可用的圖表數據</div>';
            return;
        }
        
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
        
        // Render Monthly Trends Chart
        const trendsCtx = document.getElementById('monthlyTrendsChart').getContext('2d');
        new Chart(trendsCtx, {
            type: 'line',
            data: chartData.monthlyTrends,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '總重量 (噸)' }
                    }
                }
            }
        });
        
        // Render TS Comparison Chart
        const comparisonData = {
            labels: Object.keys(this.tsConfig).filter(ts => ts !== 'WKTS').map(ts => this.tsConfig[ts].name),
            datasets: [{
                label: '總重量 (噸)',
                data: Object.keys(this.tsConfig).filter(ts => ts !== 'WKTS').map(ts => {
                    const tsStats = chartData.monthlyTrends.datasets.find(d => d.label === this.tsConfig[ts].name);
                    return tsStats ? tsStats.data.reduce((a, b) => a + b, 0) : 0;
                }),
                backgroundColor: Object.keys(this.tsConfig).filter(ts => ts !== 'WKTS').map(ts => this.tsConfig[ts].color),
                borderColor: Object.keys(this.tsConfig).filter(ts => ts !== 'WKTS').map(ts => this.tsConfig[ts].color),
                borderWidth: 2
            }]
        };
        
        const comparisonCtx = document.getElementById('tsComparisonChart').getContext('2d');
        new Chart(comparisonCtx, {
            type: 'bar',
            data: comparisonData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '總重量 (噸)' }
                    }
                }
            }
        });
    }
    
    renderComparisonTable(result) {
        const tableBody = document.getElementById('dataTable');
        
        if (!result.data || result.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="no-data">沒有找到記錄</td></tr>';
            return;
        }
        
        const tableHTML = result.data.map(record => `
            <tr>
                <td>${record.TS_Name}</td>
                <td>${record.日期 || ''}</td>
                <td>${record.交收狀態 || ''}</td>
                <td>${record.車輛任務 || ''}</td>
                <td>${record.入磅時間 || ''}</td>
                <td>${record.物料重量 || ''}</td>
                <td>${record.廢物類別 || ''}</td>
                <td>${record.來源 || ''}</td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = tableHTML;
    }
    
    setupPagination(pagination, filters) {
        const infoElement = document.getElementById('paginationInfo');
        const controlsElement = document.getElementById('paginationControls');
        
        infoElement.textContent = `顯示 ${((pagination.currentPage - 1) * pagination.pageSize) + 1}-${Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)} 條，共 ${pagination.totalRecords.toLocaleString()} 條記錄`;
        
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
    
    // Skeleton UI methods
    createStatsSkeleton() {
        return Array(6).fill('<div class="stat-skeleton"></div>').join('');
    }
    
    createChartsSkeleton() {
        return Array(2).fill('<div class="chart-skeleton"></div>').join('');
    }
    
    createTableSkeleton() {
        return Array(5).fill('<tr><td colspan="8" class="skeleton-cell"></td></tr>').join('');
    }
    
    showSkeletonUI() {
        document.getElementById('statsCards').innerHTML = this.createStatsSkeleton();
        document.getElementById('chartsContainer').innerHTML = this.createChartsSkeleton();
        document.getElementById('dataTable').innerHTML = this.createTableSkeleton();
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
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message-global';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h3>⚠️ 錯誤</h3>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()">關閉</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 10000);
    }
    
    async loadSingleTSData(filters) {
        // Implementation for single station data
        console.log('Loading single station data:', this.selectedTS, filters);
        // Add your single station implementation here
    }
    
    exportCSV() {
        if (!this.comparisonData.table) {
            alert('沒有數據可導出');
            return;
        }
        
        const headers = ['轉運站', '日期', '交收狀態', '車輛任務', '入磅時間', '物料重量', '廢物類別', '來源'];
        const csvContent = [
            headers.join(','),
            ...this.comparisonData.table.map(record => 
                headers.map(header => {
                    const value = record[header] || '';
                    return `"${value.toString().replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `轉運站數據_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    logout() {
        localStorage.removeItem('ts_user');
        localStorage.removeItem('ts_fullname');
        localStorage.removeItem('ts_isAdmin');
        window.location.href = 'index.html';
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});

// Add this to your Dashboard class in dashboard.js
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
        this.mobileNav = null; // Add mobile nav reference
        this.init();
    }
    
    async init() {
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        await this.loadTSConfig();
        this.setupUI();
        this.setupEventListeners();
        this.loadNavigation();
        this.initMobileNavigation(); // Initialize mobile nav
        
        if (this.isAdmin) {
            this.setupComparisonFilters();
        }
    }
    
    initMobileNavigation() {
        // Mobile navigation will auto-initialize via mobile-nav.js
        // We just need to ensure it's available
        if (typeof MobileNavigation !== 'undefined') {
            this.mobileNav = new MobileNavigation();
        }
    }
    
    // ... rest of your existing dashboard.js code ...
}