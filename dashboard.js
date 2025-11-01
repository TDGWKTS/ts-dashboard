// dashboard.js - Complete Revised Dashboard
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
            this.initMobileNavigation();
            
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
    
    autoSelectStation() {
        if (!this.isAdmin && this.currentUser) {
            this.selectedTS = this.currentUser;
            console.log('Auto-selecting station for regular user:', this.selectedTS);
            this.showFilterPanel();
            this.loadSingleTSData(this.getCurrentFilters());
        } else if (this.isAdmin) {
            console.log('Admin user - waiting for manual station selection');
            // Admin users need to select a station manually
        }
    }
    
    async loadTSConfig() {
        try {
            console.log('Loading TS configuration...');
            const response = await fetch(`${API_URL}?action=getTSConfig&user=${this.currentUser}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('TS Config API response:', result);
            
            if (result.success) {
                this.tsConfig = result.tsConfig;
                console.log('TS Config loaded successfully:', this.tsConfig);
            } else {
                throw new Error(result.error || 'Failed to load station configuration');
            }
        } catch (error) {
            console.error('Error loading TS config, using fallback:', error);
            // Fallback config
            this.tsConfig = {
                'IETS': { name: '港島東轉運站', color: '#FF6B6B', isAdmin: false },
                'IWTS': { name: '港島西轉運站', color: '#4ECDC4', isAdmin: false },
                'NLTS': { name: '北大嶼山轉運站', color: '#45B7D1', isAdmin: false },
                'NWNNTS': { name: '西北新界轉運站', color: '#96CEB4', isAdmin: false },
                'OITF': { name: '離島轉運設施', color: '#FFEAA7', isAdmin: false },
                'STTS': { name: '沙田轉運站', color: '#DDA0DD', isAdmin: false },
                'WKTS': { name: '西九龍轉運站', color: '#98D8C8', isAdmin: true }
            };
        }
    }

    async loadDynamicFilters() {
        try {
            console.log('Loading dynamic filters...');
            const response = await fetch(`${API_URL}?action=getFilterOptions&user=${this.currentUser}`);
            
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
        
        // Fallback to demo data
        await this.loadDemoFilters();
    }

    populateDynamicFilters(data) {
        console.log('Populating dynamic filters:', data);
        
        // Populate Waste Category filter
        const wasteCategoryFilter = document.getElementById('wasteCategoryFilter');
        if (wasteCategoryFilter && data.wasteCategories) {
            wasteCategoryFilter.innerHTML = '<option value="">所有類別</option>' +
                data.wasteCategories.map(category => 
                    `<option value="${category}">${category}</option>`
                ).join('');
            console.log('Waste categories populated:', data.wasteCategories.length);
        }

        // Populate Source Region filter
        const sourceFilter = document.getElementById('sourceFilter');
        if (sourceFilter && data.sourceRegions) {
            sourceFilter.innerHTML = '<option value="">所有地區</option>' +
                data.sourceRegions.map(region => 
                    `<option value="${region}">${region}</option>`
                ).join('');
            console.log('Source regions populated:', data.sourceRegions.length);
        }
    }

    async loadDemoFilters() {
        console.log('Loading demo filters...');
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
        console.log('Setting up UI...');
        
        const currentUserElement = document.getElementById('currentUser');
        const userFullNameElement = document.getElementById('userFullName');
        const userRoleElement = document.getElementById('userRole');
        
        if (currentUserElement) currentUserElement.textContent = this.userFullName || this.currentUser;
        if (userFullNameElement) userFullNameElement.textContent = this.userFullName || this.currentUser;
        if (userRoleElement) userRoleElement.textContent = this.isAdmin ? '管理員' : '轉運站用戶';
        
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
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        const applyFiltersBtn = document.getElementById('applyFilters');
        const compareBtn = document.getElementById('compareBtn');
        const exportCSVBtn = document.getElementById('exportCSV');
        const logoutBtn = document.getElementById('logout');
        const dateRangeFilter = document.getElementById('dateRangeFilter');
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
            console.log('Apply filters listener added');
        }
        
        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.loadComparisonData(this.getCurrentFilters()));
            console.log('Compare button listener added');
        }
        
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => this.exportCSV());
            console.log('Export CSV listener added');
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
            console.log('Logout button listener added');
        } else {
            console.error('Logout button not found!');
        }
        
        if (dateRangeFilter) {
            dateRangeFilter.addEventListener('change', () => this.handleDateRangeChange());
            console.log('Date range filter listener added');
        }
        
        this.setDefaultDates();
        console.log('Event listeners setup complete');
    }

    handleDateRangeChange() {
        const dateRangeType = document.getElementById('dateRangeFilter').value;
        const customDateRange = document.getElementById('customDateRange');
        const specificDateSelector = document.getElementById('specificDateSelector');
        
        console.log('Date range changed to:', dateRangeType);
        
        // Hide all custom date selectors first
        if (customDateRange) customDateRange.classList.add('hidden');
        if (specificDateSelector) specificDateSelector.classList.add('hidden');
        
        // Show relevant selector
        if (dateRangeType === 'custom') {
            if (customDateRange) {
                customDateRange.classList.remove('hidden');
                this.setDefaultCustomDates();
            }
        } else if (dateRangeType === 'specificDate') {
            if (specificDateSelector) {
                specificDateSelector.classList.remove('hidden');
                this.setDefaultSpecificDate();
            }
        }
    }

    setDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const specificDateInput = document.getElementById('specificDate');
        
        if (startDateInput) startDateInput.value = this.formatDateForInput(firstDay);
        if (endDateInput) endDateInput.value = this.formatDateForInput(lastDay);
        if (specificDateInput) specificDateInput.value = this.formatDateForInput(today);
        
        console.log('Default dates set');
    }

    setDefaultCustomDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = this.formatDateForInput(firstDay);
        if (endDateInput) endDateInput.value = this.formatDateForInput(lastDay);
        
        console.log('Custom dates set');
    }

    setDefaultSpecificDate() {
        const today = new Date();
        const specificDateInput = document.getElementById('specificDate');
        
        if (specificDateInput) specificDateInput.value = this.formatDateForInput(today);
        
        console.log('Specific date set');
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
    
    loadNavigation() {
        const nav = document.getElementById('sidebarNav');
        if (!nav) {
            console.error('Sidebar navigation element not found');
            return;
        }

        const myStationSection = nav.querySelector('.nav-section:first-child');
        if (!myStationSection) {
            console.error('My station section not found');
            return;
        }

        // Clear existing navigation but keep the title
        myStationSection.innerHTML = '<div class="nav-title">我的轉運站</div>';

        console.log('Loading navigation for:', {
            user: this.currentUser,
            isAdmin: this.isAdmin,
            availableStations: Object.keys(this.tsConfig)
        });

        let stationsAdded = 0;

        // Create navigation links for each station
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

            if (!this.isAdmin) {
                // Regular user - only show their station
                if (tsCode === this.currentUser) {
                    myStationSection.appendChild(link);
                    stationsAdded++;
                    console.log('Added user station to navigation:', tsCode);
                }
            } else {
                // Admin user - show all stations
                if (tsCode === this.currentUser) {
                    // Admin's own station in "我的轉運站"
                    myStationSection.appendChild(link);
                    stationsAdded++;
                    console.log('Added admin own station to navigation:', tsCode);
                } else {
                    // Other stations in "所有轉運站"
                    this.addToAdminSection(tsCode, config, link);
                    stationsAdded++;
                }
            }
        });

        // Add comparison link for admin users
        if (this.isAdmin) {
            this.addComparisonLink();
        }

        console.log(`Navigation loaded: ${stationsAdded} stations added`);

        if (stationsAdded === 0) {
            myStationSection.innerHTML += '<div class="no-stations">沒有可用的轉運站</div>';
        }
    }

    addToAdminSection(tsCode, config, link) {
        let adminSection = document.getElementById('adminSection');
        if (!adminSection) {
            console.error('Admin section not found');
            return;
        }

        // Ensure admin section is visible
        adminSection.classList.remove('hidden');

        let navLinks = adminSection.querySelector('.nav-links');
        if (!navLinks) {
            navLinks = document.createElement('div');
            navLinks.className = 'nav-links';
            adminSection.appendChild(navLinks);
            console.log('Created nav-links container in admin section');
        }

        navLinks.appendChild(link);
        console.log('Added station to admin section:', tsCode);
    }

    addComparisonLink() {
        const adminSection = document.getElementById('adminSection');
        if (!adminSection) {
            console.error('Admin section not found for comparison link');
            return;
        }

        let navLinks = adminSection.querySelector('.nav-links');
        if (!navLinks) {
            navLinks = document.createElement('div');
            navLinks.className = 'nav-links';
            adminSection.appendChild(navLinks);
        }

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

        navLinks.appendChild(compareLink);
        console.log('Comparison link added to admin section');
    }

    async selectTS(tsCode) {
        console.log('Selecting station:', tsCode);
        
        // Remove active class from all links
        document.querySelectorAll('#sidebarNav .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to clicked link
        const activeLink = event.target.closest('.nav-link');
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        this.selectedTS = tsCode;
        this.showFilterPanel();
        
        console.log('Loading data for station:', tsCode);
        
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
        
        console.log('Filter panel shown for station:', this.selectedTS);
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
        
        const filters = {
            dateRange: dateRange,
            wasteCategory: document.getElementById('wasteCategoryFilter').value || '',
            source: document.getElementById('sourceFilter').value || ''
        };
        
        console.log('Current filters:', filters);
        return filters;
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
        console.log('Applying filters:', filters);
        
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
            const response = await fetch(`${API_URL}?action=getTSData&user=${this.currentUser}&targetTS=${this.selectedTS}&filters=${JSON.stringify(filters)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Single TS data response:', result);
            
            if (result.success) {
                this.renderSingleTSData(result.data, filters, page);
            } else {
                throw new Error(result.error || 'Failed to load data');
            }
            
        } catch (error) {
            console.error('Error loading single TS data:', error);
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
            const [statsResponse, tableResponse] = await Promise.all([
                fetch(`${API_URL}?action=getComparisonStats&user=${this.currentUser}&filters=${JSON.stringify(filters)}`),
                fetch(`${API_URL}?action=getComparisonTable&user=${this.currentUser}&filters=${JSON.stringify(filters)}&page=${page}&pageSize=${this.pageSize}`)
            ]);
            
            if (!statsResponse.ok || !tableResponse.ok) {
                throw new Error('HTTP error loading comparison data');
            }
            
            const statsResult = await statsResponse.json();
            const tableResult = await tableResponse.json();
            console.log('Comparison data response:', { stats: statsResult, table: tableResult });
            
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
        console.log('Rendering single TS data:', data);
        
        // Render stats
        await this.loadStats(data);
        
        // Render table data
        await this.loadTableData(data, filters, page);
    }

    async renderComparisonData(statsData, tableData, filters, page) {
        console.log('Rendering comparison data:', { stats: statsData, table: tableData });
        
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
        console.log('Stats rendered for single station');
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
        console.log('Comparison stats rendered:', statsData.length, 'stations');
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
        
        console.log('Table data rendered:', tableData.length, 'records');
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
        
        console.log('Comparison table rendered:', tableData.data.length, 'records');
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
        
        console.log('Pagination setup:', pagination);
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
        if (typeof MobileNavigation !== 'undefined') {
            this.mobileNav = new MobileNavigation();
            console.log('Mobile navigation initialized');
        }
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
