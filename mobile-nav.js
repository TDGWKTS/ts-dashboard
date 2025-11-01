class MobileNavigation {
    constructor() {
        this.isOpen = false;
        this.init();
    }
    
    init() {
        this.createMobileToggle();
        this.setupTouchEvents();
        this.handleResize();
        this.handleOrientationChange();
    }
    
    createMobileToggle() {
        // Create mobile menu toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'menu-toggle hidden';
        toggleBtn.innerHTML = '☰';
        toggleBtn.setAttribute('aria-label', 'Toggle menu');
        toggleBtn.addEventListener('click', () => this.toggleSidebar());
        
        // Insert at the beginning of header
        const header = document.querySelector('.header');
        header.insertBefore(toggleBtn, header.firstChild);
        this.toggleBtn = toggleBtn;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => this.closeSidebar());
        document.body.appendChild(overlay);
        this.overlay = overlay;
        
        this.checkViewport();
    }
    
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('active');
        this.overlay.classList.toggle('active');
        this.isOpen = !this.isOpen;
        
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = this.isOpen ? 'hidden' : '';
        this.toggleBtn.innerHTML = this.isOpen ? '✕' : '☰';
        
        // Add animation class
        if (this.isOpen) {
            sidebar.classList.add('slide-in');
        } else {
            sidebar.classList.add('slide-out');
            setTimeout(() => sidebar.classList.remove('slide-out'), 300);
        }
    }
    
    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.remove('active');
        this.overlay.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
        this.toggleBtn.innerHTML = '☰';
        sidebar.classList.add('slide-out');
        setTimeout(() => sidebar.classList.remove('slide-out'), 300);
    }
    
    setupTouchEvents() {
        const sidebar = document.querySelector('.sidebar');
        let startX = 0;
        let currentX = 0;
        
        sidebar.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
        }, { passive: true });
        
        sidebar.addEventListener('touchmove', (e) => {
            if (!this.isOpen) return;
            
            currentX = e.touches[0].clientX;
            const diff = startX - currentX;
            
            // If swiping right to left (closing)
            if (diff > 50) {
                this.closeSidebar();
            }
        }, { passive: true });
        
        // Close sidebar when clicking on nav links (mobile)
        sidebar.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && window.innerWidth <= 768) {
                this.closeSidebar();
            }
        });
    }
    
    handleResize() {
        window.addEventListener('resize', () => {
            this.checkViewport();
            // Close sidebar when resizing to desktop
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeSidebar();
            }
        });
    }
    
    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            // Close sidebar on orientation change
            setTimeout(() => {
                this.closeSidebar();
                this.checkViewport();
            }, 300);
        });
    }
    
    checkViewport() {
        const isMobile = window.innerWidth <= 768;
        this.toggleBtn.classList.toggle('hidden', !isMobile);
        
        if (!isMobile && this.isOpen) {
            this.closeSidebar();
        }
    }
}

// Initialize mobile navigation
let mobileNav;

document.addEventListener('DOMContentLoaded', () => {
    mobileNav = new MobileNavigation();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileNavigation;
}