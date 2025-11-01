// dashboard.js - Connected to real Google Sheets data
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
            this.initMobileNavigation();
            
            if (this.isAdmin) {
                this.setupComparisonFilters();
            }
            
            this.autoSelectStation();
            
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
        }
    }

    // REAL DATA METHODS - Replace mock data with actual API calls

    async loadSingleTSData(filters = {}, page = 1) {
        console.log('Loading REAL single station data:', this.selectedTS, filters, 'Page:', page);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.currentPage = page;
        
        try {
            const response = await fetch(`${API_URL}?action=getStationData&station=${this.selectedTS}&filters=${JSON.stringify(filters)}&page=${page}&pageSize=${this.pageSize}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.renderRealSingleTSData(result.data, filters, page);
            } else {
                throw new Error(result.error || 'Failed to load data');
            }
            
        } catch (error) {
            console.error('Error loading real TS data:', error);
            this.showError('加載數據失敗: ' + error.message);
            // Fallback to demo data if API fails
            await this.loadMockSingleTSData(filters, page);
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadComparisonData(filters = {}, page = 1) {
        console.log('Loading REAL comparison data with filters:', filters, 'Page:', page);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.selectedTS = 'comparison';
        this.currentPage = page;
        
        try {
            const response = await fetch(`${API_URL}?action=getComparisonData&user=${this.currentUser}&filters=${JSON.stringify(filters)}&page=${page}&pageSize=${this.pageSize}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.renderRealComparisonData(result.data, filters, page);
            } else {
                throw new Error(result.error || 'Failed to load comparison data');
            }
            
        } catch (error) {
            console.error('Error loading real comparison data:', error);
            this.showError('加載比較數據失敗: ' + error.message);
            // Fallback to demo data if API fails
            await this.loadMockComparisonData(filters, page);
        } finally {
            this.showLoading(false);
        }
    }

    async renderRealSingleTSData(data, filters, page) {
        // Render real stats
        await this.loadRealStats(data.stats || data);
        
        // Render real charts
        await this.loadRealCharts(data.charts || data);
        
        // Render real table data
        await this.loadRealTableData(data.table || data.records || data, filters, page);
    }

    async renderRealComparisonData(data, filters, page) {
        // Render real comparison stats
        await this.loadComparisonStats(data.stats || data);
        
        // Render real comparison charts
        await this.loadComparisonCharts(data.charts || data);
        
        // Render real comparison table
        await this.loadComparisonTable(data.table || data.records || data, filters, page);
    }

    async loadRealStats(statsData) {
        const statsElement = document.getElementById('statsCards');
        if (!statsElement) return;
        
        if (!statsData || Object.keys(statsData).length === 0) {
            statsElement.innerHTML = '<div class="no-data">沒有統計數據</div>';
            return;
        }
        
        // Adjust based on your actual API response structure
        const statsHTML = `
            <div class="stat-card">
                <div class="stat-header">
                    <span class="ts-color" style="background-color: ${this.tsConfig[this.selectedTS]?.color || '#666'}"></span>
                    <h3>${this.tsConfig[this.selectedTS]?.name || this.selectedTS}</h3>
                </div>
                <div class="stat-value">${statsData.totalTransactions?.toLocaleString() || '0'}</div>
                <div class="stat-label">總交易數</div>
                <div class="stat-secondary">
                    <div>總重量: ${statsData.totalWeight?.toLocaleString() || '0'} 噸</div>
                    <div>平均: ${statsData.avgWeight?.toLocaleString() || '0'} 噸</div>
                    <div>最高: ${statsData.maxWeight?.toLocaleString() || '0'} 噸</div>
                </div>
            </div>
        `;
        
        statsElement.innerHTML = statsHTML;
    }

    async loadRealCharts(chartData) {
        const chartsContainer = document.getElementById('chartsContainer');
        if (!chartsContainer) return;
        
        if (!chartData || Object.keys(chartData).length === 0) {
            chartsContainer.innerHTML = '<div class="no-data">沒有圖表數據</div>';
            return;
        }
        
        // Render charts based on your actual data structure
        chartsContainer.innerHTML = `
            <div class="chart-card">
                <div class="chart-header">
                    <h3>月度趨勢 - ${this.selectedTS}</h3>
                </div>
                <div class="chart-wrapper">
                    <canvas id="realTrendChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">
                    <h3>廢物類別分佈</h3>
                </div>
                <div class="chart-wrapper">
                    <canvas id="realDistributionChart"></canvas>
                </div>
            </div>
        `;
        
        // Render actual charts with real data
        this.renderRealCharts(chartData);
    }

    renderRealCharts(chartData) {
        // Monthly trends chart with real data
        const trendCtx = document.getElementById('realTrendChart')?.getContext('2d');
        if (trendCtx && chartData.monthlyTrends) {
            new Chart(trendCtx, {
                type: 'line',
                data: chartData.monthlyTrends,
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Distribution chart with real data
        const distCtx = document.getElementById('realDistributionChart')?.getContext('2d');
        if (distCtx && chartData.wasteDistribution) {
            new Chart(distCtx, {
                type: 'doughnut',
                data: chartData.wasteDistribution,
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    async loadRealTableData(tableData, filters, page) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        if (!tableData || tableData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="no-data">沒有找到記錄</td></tr>';
            return;
        }
        
        // Render table with real data
        const tableHTML = tableData.map(record => `
            <tr>
                <td>${record.TS_Name || record.station || this.tsConfig[this.selectedTS]?.name}</td>
                <td>${record.日期 || record.date || ''}</td>
                <td>${record.交收狀態 || record.status || ''}</td>
                <td>${record.車輛任務 || record.vehicleTask || ''}</td>
                <td>${record.入磅時間 || record.weighTime || ''}</td>
                <td>${record.物料重量 || record.weight || ''}</td>
                <td>${record.廢物類別 || record.wasteCategory || ''}</td>
                <td>${record.來源 || record.source || ''}</td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = tableHTML;
        
        // Setup pagination with real data
        this.setupPagination({
            currentPage: page,
            totalPages: Math.ceil((tableData.totalRecords || tableData.length) / this.pageSize),
            totalRecords: tableData.totalRecords || tableData.length,
            pageSize: this.pageSize
        }, filters);
    }

    // Update your Google Apps Script to handle these new actions

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
        
        // If API fails, try to extract filters from actual data
        await this.extractFiltersFromData();
    }

    async extractFiltersFromData() {
        try {
            // Load a small sample of data to extract unique values
            const response = await fetch(`${API_URL}?action=getAllData&limit=1000`);
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data) {
                    const wasteCategories = [...new Set(result.data.map(item => item.廢物類別).filter(Boolean))].sort();
                    const sourceRegions = [...new Set(result.data.map(item => item.來源地區).filter(Boolean))].sort();
                    
                    this.populateDynamicFilters({
                        wasteCategories: wasteCategories,
                        sourceRegions: sourceRegions
                    });
                    return;
                }
            }
        } catch (error) {
            console.warn('Failed to extract filters from data:', error);
        }
        
        // Final fallback to demo filters
        await this.loadDemoFilters();
    }

    // Keep your existing methods but ensure they call REAL data methods
    async applyFilters() {
        if (!this.selectedTS) {
            this.showError('請先選擇轉運站');
            return;
        }
        
        const filters = this.getCurrentFilters();
        console.log('Applying REAL filters:', filters);
        
        if (this.selectedTS === 'comparison') {
            await this.loadComparisonData(filters);
        } else {
            await this.loadSingleTSData(filters);
        }
    }

    // ... (keep all your existing UI, navigation, and utility methods)

    // DEMO DATA FALLBACKS (only used when real API fails)
    async loadMockSingleTSData(filters, page = 1) {
        console.warn('Using demo data as fallback');
        // ... your existing mock data implementation
    }

    async loadMockComparisonData(filters, page = 1) {
        console.warn('Using demo comparison data as fallback');
        // ... your existing mock comparison data implementation
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
