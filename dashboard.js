// dashboard.js - Complete Version with JSONP for CORS
const API_BASE = 'https://script.google.com/macros/s/AKfycbyyhHqT2ALVydXLmgynvr6GSJfyWmhIDWNSMkkWrctJZdICgMvbjE5h25WFEQiWCVk/exec';

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
        this.selectedWasteCategories = [];
        this.selectedSourceRegions = [];
        
        console.log('Dashboard initialized:', {
            user: this.currentUser,
            fullName: this.userFullName,
            isAdmin: this.isAdmin
        });
        
        if (!this.currentUser) {
            console.error('No user found, redirecting to login...');
            window.location.href = 'index.html';
            return;
        }
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Starting dashboard initialization...');
            await this.loadTSConfig();
            await this.loadDynamicFilters();
            this.setupUI();
            this.setupEventListeners();
            this.loadNavigation();
            
            if (this.isAdmin) {
                this.setupComparisonFilters();
            }
            
            this.autoSelectStation();
            
            console.log('Dashboard initialization complete');
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showError('儀表板初始化失敗: ' + error.message);
        }
    }

    // JSONP method to bypass CORS
    jsonp(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };

            const script = document.createElement('script');
            script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('JSONP request failed'));
            };
            document.body.appendChild(script);
        });
    }

    async fetchFromAPI(endpoint, params = {}) {
        try {
            console.log(`Fetching from API: ${endpoint}`, params);
            
            const url = new URL(API_BASE);
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    url.searchParams.append(key, params[key]);
                }
            });
            
            // Add user parameter to all requests
            if (this.currentUser) {
                url.searchParams.append('user', this.currentUser);
            }
            
            console.log('Fetching URL:', url.toString());
            
            // Use JSONP to bypass CORS
            const data = await this.jsonp(url.toString());
            console.log(`API response from ${endpoint}:`, data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error(`API fetch error for ${endpoint}:`, error);
            throw error;
        }
    }

    async fetchData(filters = {}, page = 1) {
        const params = {
            action: 'getData',
            page: page.toString(),
            pageSize: this.pageSize.toString()
        };
        
        // Add station filter
        if (this.selectedTS && this.selectedTS !== 'comparison') {
            params.station = this.selectedTS;
        }
        
        // Add date filters
        if (filters.dateRange) {
            if (filters.dateRange.type === 'custom' && filters.dateRange.startDate && filters.dateRange.endDate) {
                params.startDate = filters.dateRange.startDate;
                params.endDate = filters.dateRange.endDate;
            } else if (filters.dateRange.type === 'specificDate' && filters.dateRange.date) {
                params.specificDate = filters.dateRange.date;
            } else if (filters.dateRange.type !== 'all') {
                params.dateRange = filters.dateRange.type;
            }
        }
        
        // Add waste category filters (multiple selection)
        if (filters.wasteCategories && filters.wasteCategories.length > 0) {
            params.wasteCategories = filters.wasteCategories.join(',');
        }
        
        // Add source region filters (multiple selection)
        if (filters.sourceRegions && filters.sourceRegions.length > 0) {
            params.sourceRegions = filters.sourceRegions.join(',');
        }
        
        console.log('Fetching data with params:', params);
        return await this.fetchFromAPI('', params);
    }

    async fetchComparisonData(filters = {}, page = 1) {
        const params = {
            action: 'getComparison',
            page: page.toString(),
            pageSize: this.pageSize.toString()
        };
        
        // Add date filters for comparison
        if (filters.dateRange) {
            if (filters.dateRange.type === 'custom' && filters.dateRange.startDate && filters.dateRange.endDate) {
                params.startDate = filters.dateRange.startDate;
                params.endDate = filters.dateRange.endDate;
            } else if (filters.dateRange.type === 'specificDate' && filters.dateRange.date) {
                params.specificDate = filters.dateRange.date;
            } else if (filters.dateRange.type !== 'all') {
                params.dateRange = filters.dateRange.type;
            }
        }
        
        // Add waste category filters (multiple selection)
        if (filters.wasteCategories && filters.wasteCategories.length > 0) {
            params.wasteCategories = filters.wasteCategories.join(',');
        }
        
        // Add source region filters (multiple selection)
        if (filters.sourceRegions && filters.sourceRegions.length > 0) {
            params.sourceRegions = filters.sourceRegions.join(',');
        }
        
        console.log('Fetching comparison data with params:', params);
        return await this.fetchFromAPI('', params);
    }
    
    autoSelectStation() {
        if (!this.isAdmin && this.currentUser) {
            this.selectedTS = this.currentUser;
            console.log('Auto-selecting station for regular user:', this.selectedTS);
            this.showFilterPanel();
        } else if (this.isAdmin) {
            console.log('Admin user - waiting for manual station selection');
        }
    }
    
    async loadTSConfig() {
        try {
            console.log('Loading TS configuration from API...');
            const data = await this.fetchFromAPI('', { action: 'getStations' });
            
            if (data && data.stations) {
                this.tsConfig = data.stations;
                console.log('TS Config loaded successfully from API:', this.tsConfig);
            } else {
                throw new Error('No station configuration received from API');
            }
        } catch (error) {
            console.error('Error loading TS config from API:', error);
            // Use minimal fallback config for navigation
            this.tsConfig = {
                'IETS': { name: '港島東轉運站', color: '#FF6B6B', isAdmin: false },
                'IWTS': { name: '港島西轉運站', color: '#4ECDC4', isAdmin: false },
                'NLTS': { name: '北大嶼山轉運站', color: '#45B7D1', isAdmin: false },
                'NWNNTS': { name: '西北新界轉運站', color: '#96CEB4', isAdmin: false },
                'OITF': { name: '離島轉運設施', color: '#FFEAA7', isAdmin: false },
                'STTS': { name: '沙田轉運站', color: '#DDA0DD', isAdmin: false },
                'WKTS': { name: '西九龍轉運站', color: '#98D8C8', isAdmin: true }
            };
            console.log('Using fallback TS config for navigation');
        }
    }

    async loadDynamicFilters() {
        try {
            console.log('Loading dynamic filters from GAS API...');
            
            const filterData = await this.fetchFromAPI('', { 
                action: 'getFilterOptions' 
            });
            
            console.log('Raw filter data from GAS:', filterData);
            
            if (filterData && (filterData.wasteCategories || filterData.sourceRegions)) {
                console.log('Using real filter data from API');
                this.populateDynamicFilters(filterData);
            } else {
                throw new Error('No filter data received from API');
            }
            
        } catch (error) {
            console.error('Error loading dynamic filters from GAS:', error);
            // Use sample data to ensure filters are visible
            const sampleFilterData = {
                wasteCategories: [
                    'P01.00 - 都市固體廢物',
                    'P05.00 - 建築廢料', 
                    'D01.00 - 危險廢物',
                    'C01.00 - 商業廢物',
                    'C02.00 - 工業廢物',
                    'M01.00 - 混合廢物'
                ],
                sourceRegions: [
                    '中西區', '灣仔區', '東區', '南區',
                    '油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區',
                    '葵青區', '荃灣區', '屯門區', '元朗區'
                ]
            };
            console.log('Using sample filter data due to API error');
            this.populateDynamicFilters(sampleFilterData);
        }
    }

    populateDynamicFilters(data) {
        console.log('Populating dynamic filters with data:', data);
        
        // Populate Waste Category filter with checkboxes
        this.createCheckboxFilter('wasteCategoryFilter', '廢物類別', data.wasteCategories, this.selectedWasteCategories);
        
        // Populate Source Region filter with checkboxes
        this.createCheckboxFilter('sourceFilter', '來源地區', data.sourceRegions, this.selectedSourceRegions);
    }

    createCheckboxFilter(containerId, filterName, options, selectedItems) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }

        if (!options || options.length === 0) {
            container.innerHTML = `<div class="no-options">沒有可用的${filterName}選項</div>`;
            return;
        }

        // Sort options for better user experience
        const sortedOptions = options.sort();
        
        const filterHTML = `
            <div class="checkbox-filter-container">
                <div class="filter-header">
                    <h4>${filterName}</h4>
                    <div class="filter-buttons">
                        <button type="button" class="select-all-btn" data-filter="${containerId}">全選</button>
                        <button type="button" class="clear-all-btn" data-filter="${containerId}">清除</button>
                    </div>
                </div>
                <div class="checkbox-options">
                    <div class="checkbox-option all-option">
                        <label>
                            <input type="checkbox" class="select-all-checkbox" data-filter="${containerId}">
                            <span class="checkmark"></span>
                            <span class="option-text">所有${filterName}</span>
                        </label>
                    </div>
                    ${sortedOptions.map(option => `
                        <div class="checkbox-option">
                            <label>
                                <input type="checkbox" value="${option}" 
                                       ${selectedItems.includes(option) ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <span class="option-text">${option}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
                <div class="selected-count" id="${containerId}-count">
                    已選擇: 0/${sortedOptions.length}
                </div>
            </div>
        `;

        container.innerHTML = filterHTML;
        this.updateSelectedCount(containerId, sortedOptions.length);
        this.setupCheckboxEvents(containerId);
        
        console.log(`Checkbox filter created for ${filterName} with`, sortedOptions.length, 'options');
    }

    setupCheckboxEvents(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Select all functionality
        const selectAllBtn = container.querySelector('.select-all-btn');
        const selectAllCheckbox = container.querySelector('.select-all-checkbox');
        const clearAllBtn = container.querySelector('.clear-all-btn');
        const individualCheckboxes = container.querySelectorAll('input[type="checkbox"]:not(.select-all-checkbox)');

        // Select all button
        selectAllBtn.addEventListener('click', () => {
            individualCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
            this.updateFilterSelection(containerId);
        });

        // Clear all button
        clearAllBtn.addEventListener('click', () => {
            individualCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            this.updateFilterSelection(containerId);
        });

        // Select all checkbox
        selectAllCheckbox.addEventListener('change', (e) => {
            individualCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            selectAllCheckbox.indeterminate = false;
            this.updateFilterSelection(containerId);
        });

        // Individual checkboxes
        individualCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateFilterSelection(containerId);
            });
        });

        // Initialize the selection state
        this.updateFilterSelection(containerId);
    }

    updateFilterSelection(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const individualCheckboxes = container.querySelectorAll('input[type="checkbox"]:not(.select-all-checkbox)');
        const selectAllCheckbox = container.querySelector('.select-all-checkbox');
        const totalOptions = individualCheckboxes.length;

        // Get selected values
        const selectedValues = Array.from(individualCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        // Update select all checkbox state
        const allSelected = selectedValues.length === totalOptions;
        const someSelected = selectedValues.length > 0 && selectedValues.length < totalOptions;
        
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected;

        // Update the corresponding selected arrays
        if (containerId === 'wasteCategoryFilter') {
            this.selectedWasteCategories = selectedValues;
        } else if (containerId === 'sourceFilter') {
            this.selectedSourceRegions = selectedValues;
        }

        // Update selected count display
        this.updateSelectedCount(containerId, totalOptions);

        console.log(`Updated ${containerId}:`, selectedValues);
    }

    updateSelectedCount(containerId, totalOptions) {
        const countElement = document.getElementById(`${containerId}-count`);
        if (!countElement) return;

        let selectedCount = 0;
        if (containerId === 'wasteCategoryFilter') {
            selectedCount = this.selectedWasteCategories.length;
        } else if (containerId === 'sourceFilter') {
            selectedCount = this.selectedSourceRegions.length;
        }

        countElement.textContent = `已選擇: ${selectedCount}/${totalOptions}`;
        
        // Update style based on selection
        if (selectedCount === 0) {
            countElement.className = 'selected-count none-selected';
        } else if (selectedCount === totalOptions) {
            countElement.className = 'selected-count all-selected';
        } else {
            countElement.className = 'selected-count some-selected';
        }
    }

    // ... [Keep all your existing methods for setupUI, setupEventListeners, loadNavigation, etc.]
    
    setupUI() {
        console.log('Setting up UI...');
        
        // Update user info in header
        const currentUserElement = document.getElementById('currentUser');
        const userFullNameElement = document.getElementById('userFullName');
        const userRoleElement = document.getElementById('userRole');
        
        if (currentUserElement) {
            currentUserElement.textContent = this.userFullName || this.currentUser;
            console.log('Set currentUser:', this.userFullName || this.currentUser);
        }
        if (userFullNameElement) {
            userFullNameElement.textContent = this.userFullName || this.currentUser;
        }
        if (userRoleElement) {
            userRoleElement.textContent = this.isAdmin ? '管理員' : '轉運站用戶';
            console.log('Set user role:', this.isAdmin ? '管理員' : '轉運站用戶');
        }
        
        // Show admin sections if admin
        if (this.isAdmin) {
            const adminSection = document.getElementById('adminSection');
            const compareBtn = document.getElementById('compareBtn');
            
            if (adminSection) {
                adminSection.classList.remove('hidden');
                console.log('Admin section shown');
            }
            if (compareBtn) {
                compareBtn.classList.remove('hidden');
                console.log('Compare button shown');
            }
        }
        
        console.log('UI setup complete');
    }

    // ... [Include all your other existing methods]

    async loadSingleTSData(filters = {}, page = 1) {
        console.log('Loading single station data from API:', this.selectedTS, filters, 'Page:', page);
        
        this.showLoading(true);
        this.showSkeletonUI();
        this.currentPage = page;
        
        try {
            const data = await this.fetchData(filters, page);
            await this.displaySingleTSData(data, filters, page);
        } catch (error) {
            console.error('Error loading single TS data:', error);
            this.showError('加載數據失敗: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async displaySingleTSData(data, filters, page = 1) {
        // Display stats data
        const statsElement = document.getElementById('statsCards');
        if (statsElement && data.stats) {
            statsElement.innerHTML = `
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="ts-color" style="background-color: ${this.tsConfig[this.selectedTS]?.color || '#666'}"></span>
                        <h3>${this.tsConfig[this.selectedTS]?.name || this.selectedTS}</h3>
                    </div>
                    <div class="stat-value">${data.stats.totalTransactions?.toLocaleString() || '0'}</div>
                    <div class="stat-label">總交易數</div>
                    <div class="stat-secondary">
                        <div>總重量: ${data.stats.totalWeight?.toLocaleString() || '0'} 噸</div>
                        <div>平均: ${data.stats.averageWeight?.toFixed(2) || '0'} 噸</div>
                        <div>最高: ${data.stats.maxWeight?.toFixed(1) || '0'} 噸</div>
                    </div>
                </div>
            `;
        }
        
        // Display table data
        await this.displayTableData(data, filters, page);
    }

    async displayTableData(data, filters, page = 1) {
        const tableBody = document.getElementById('dataTable');
        if (!tableBody) return;
        
        if (data.records && data.records.length > 0) {
            const tableHTML = data.records.map(record => `
                <tr>
                    <td>${record.TS_Name || record.station || '--'}</td>
                    <td>${record.日期 || record.date || '--'}</td>
                    <td>${record.交收狀態 || record.status || '--'}</td>
                    <td>${record.車輛任務 || record.vehicleTask || '--'}</td>
                    <td>${record.入磅時間 || record.weighingTime || '--'}</td>
                    <td>${record.物料重量 || record.materialWeight || '0'}</td>
                    <td>${record.廢物類別 || record.wasteCategory || '--'}</td>
                    <td>${record.來源 || record.sourceRegion || '--'}</td>
                </tr>
            `).join('');
            
            tableBody.innerHTML = tableHTML;
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">沒有找到符合條件的數據</td>
                </tr>
            `;
        }
        
        // Setup pagination
        this.setupPagination({
            currentPage: page,
            totalPages: data.pagination?.totalPages || Math.ceil((data.pagination?.totalRecords || 0) / this.pageSize),
            totalRecords: data.pagination?.totalRecords || 0,
            pageSize: this.pageSize
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
            
            console.log('CSV exported:', filename);
            
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
        console.error('Error:', message);
        alert('錯誤: ' + message);
    }

    setupComparisonFilters() {
        console.log('Comparison filters setup for admin');
    }

    initMobileNavigation() {
        console.log('Mobile navigation placeholder');
    }
    
    logout() {
        console.log('Logout initiated by user:', this.currentUser);
        
        // Clear all user data from localStorage
        localStorage.removeItem('ts_user');
        localStorage.removeItem('ts_fullname');
        localStorage.removeItem('ts_isAdmin');
        
        console.log('LocalStorage cleared, redirecting to login page...');
        
        // Redirect to login page
        window.location.href = 'index.html';
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dashboard...');
    
    const currentUser = localStorage.getItem('ts_user');
    console.log('Current user from localStorage:', currentUser);
    
    if (!currentUser) {
        console.error('No user found in localStorage, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('Creating dashboard instance...');
    window.dashboard = new Dashboard();
});

