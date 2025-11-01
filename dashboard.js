// dashboard.js - Frontend JavaScript only
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
            
            if (this.isAdmin) {
                this.setupComparisonFilters();
            }
            
            this.autoSelectStation();
            
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
        }
    }

    async loadTSConfig() {
        try {
            const response = await fetch(`${API_URL}?action=getTSConfig&user=${this.currentUser}`);
            const result = await response.json();
            
            if (result.success) {
                this.tsConfig = result.tsConfig;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error loading TS config:', error);
            // Fallback config
            this.tsConfig = {
                'IETS': { name: '港島東轉運站', color: '#FF6B6B', isAdmin: false },
                'WKTS': { name: '西九龍轉運站', color: '#98D8C8', isAdmin: true }
            };
        }
    }

    // Use the CORRECT API endpoints that exist in your code.gs
    async loadSingleTSData(filters = {}, page = 1) {
        console.log('Loading single station data:', this.selectedTS, filters, 'Page:', page);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.currentPage = page;
        
        try {
            // Use getTSData endpoint which exists in your code.gs
            const response = await fetch(`${API_URL}?action=getTSData&user=${this.currentUser}&targetTS=${this.selectedTS}&filters=${JSON.stringify(filters)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.renderSingleTSData(result.data, filters, page);
            } else {
                throw new Error(result.error || 'Failed to load data');
            }
            
        } catch (error) {
            console.error('Error loading TS data:', error);
            this.showError('加載數據失敗: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadComparisonData(filters = {}, page = 1) {
        if (!this.isAdmin) {
            this.showError('只有管理員可以查看比較數據');
            return;
        }
        
        console.log('Loading comparison data with filters:', filters, 'Page:', page);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.selectedTS = 'comparison';
        this.currentPage = page;
        
        try {
            // Use getComparisonStats endpoint which exists in your code.gs
            const [statsResponse, tableResponse] = await Promise.all([
                fetch(`${API_URL}?action=getComparisonStats&user=${this.currentUser}&filters=${JSON.stringify(filters)}`),
                fetch(`${API_URL}?action=getComparisonTable&user=${this.currentUser}&filters=${JSON.stringify(filters)}&page=${page}&pageSize=${this.pageSize}`)
            ]);
            
            if (!statsResponse.ok || !tableResponse.ok) {
                throw new Error('HTTP error loading comparison data');
            }
            
            const statsResult = await statsResponse.json();
            const tableResult = await tableResponse.json();
            
            if (statsResult.success && tableResult.success) {
                this.renderComparisonData(statsResult.data, tableResult.data, filters, page);
            } else {
                throw new Error('Failed to load comparison data');
            }
            
        } catch (error) {
            console.error('Error loading comparison data:', error);
            this.showError('加載比較數據失敗: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async renderSingleTSData(data, filters, page) {
        // Render stats
        await this.loadStats(data);
        
        // Render table data
        await this.loadTableData(data, filters, page);
    }

    async renderComparisonData(statsData, tableData, filters, page) {
        // Render comparison stats
        await this.loadComparisonStats(statsData);
        
        // Render comparison table
        await this.loadComparisonTable(tableData, filters, page);
    }

    async loadStats(data) {
        const statsElement = document.getElementById('statsCards');
        if (!statsElement) return;
        
        if (!data || data.length === 0) {
            statsElement.innerHTML = '<div class="no-data">沒有統計數據</div>';
            return;
        }
        
        // Calculate basic stats from the data
        const weights = data.map(item => parseFloat(item.物料重量) || 0).filter(w => w > 0);
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const avgWeight = weights.length ? totalWeight / weights.length : 0;
        const maxWeight = weights.length ? Math.max(...weights) : 0;
        
        const statsHTML = `
            <div class="stat-card">
                <div class="stat-header">
                    <span class="ts-color" style="background-color: ${this.tsConfig[this.selectedTS]?.color || '#666'}"></span>
                    <h3>${this.tsConfig[this.selectedTS]?.name || this.selectedTS}</h3>
                </div>
                <div class="stat-value">${data.length.toLocaleString()}</div>
                <div class="stat-label">總交易數</div>
                <div class="stat-secondary">
                    <div>總重量: ${totalWeight.toFixed(1)} 噸</div>
                    <div>平均: ${avgWeight.toFixed(1)} 噸</div>
                    <div>最高: ${maxWeight.toFixed(1)} 噸</div>
                </div>
            </div>
        `;
        
        statsElement.innerHTML = statsHTML;
    }

    async loadComparisonStats(statsData) {
        const statsElement = document.getElementById('statsCards');
        if (!statsElement) return;
        
        if (!statsData || statsData.length === 0) {
            statsElement.innerHTML = '<div class="no-data">沒有統計數據</div>';
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
        
        statsElement.innerHTML = statsHTML;
    }

    async loadTableData(tableData, filters, page) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        if (!tableData || tableData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="no-data">沒有找到記錄</td></tr>';
            return;
        }
        
        const tableHTML = tableData.map(record => `
            <tr>
                <td>${this.tsConfig[this.selectedTS]?.name || this.selectedTS}</td>
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
        
        this.setupPagination({
            currentPage: page,
            totalPages: 1,
            totalRecords: tableData.length,
            pageSize: this.pageSize
        }, filters);
    }

    async loadComparisonTable(tableData, filters, page) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        if (!tableData.data || tableData.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="no-data">沒有找到記錄</td></tr>';
            return;
        }
        
        const tableHTML = tableData.data.map(record => `
            <tr>
                <td>${record.TS_Name || record.TS_Code || ''}</td>
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
        
        this.setupPagination(tableData.pagination, filters);
    }

    // Add all your other existing methods here...
    // setupUI(), setupEventListeners(), loadNavigation(), etc.
    
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
