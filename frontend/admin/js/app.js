/**
 * NOVASTORE ADMIN - SPA ROUTER
 * Handles sidebar, view switching, mobile drawer.
 */

(function () {
    'use strict';

    const state = {
        currentView: 'dashboard',
        user: null
    };

    // ============ AUTH CHECK ============
    function checkAuth() {
        const token = localStorage.getItem('novaAdminToken');
        const user = JSON.parse(localStorage.getItem('novaAdminUser') || 'null');

        if (!token || !user) {
            window.location.href = '/admin/index.html';
            return false;
        }

        state.user = user;
        return true;
    }

    // ============ SIDEBAR ============
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const menuToggle = document.getElementById('menuToggle');
        const closeBtn = document.getElementById('sidebarClose');

        if (!sidebar) return;

        const openSidebar = () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        };

        const closeSidebar = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };

        if (menuToggle) menuToggle.addEventListener('click', openSidebar);
        if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
        if (overlay) overlay.addEventListener('click', closeSidebar);

        // Close on nav click (mobile)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 900) closeSidebar();
            });
        });
    }

    // ============ USER INFO ============
    function fillUserInfo() {
        const nameEl = document.getElementById('adminName');
        const avatarEl = document.getElementById('adminAvatar');

        if (nameEl && state.user) nameEl.textContent = state.user.name || 'Admin';
        if (avatarEl && state.user) {
            const initials = (state.user.name || 'A')
                .split(' ')
                .map(w => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
            avatarEl.textContent = initials;
        }
    }

    // ============ VIEW ROUTER ============
    const VIEW_TITLES = {
        dashboard: 'Dashboard',
        products: 'Products',
        categories: 'Categories',
        orders: 'Orders',
        customers: 'Customers',
        payments: 'Payments',
        coupons: 'Coupons',
        inventory: 'Inventory',
        reviews: 'Reviews',
        settings: 'Settings'
    };

    function navigate(viewName) {
        if (!VIEW_TITLES[viewName]) viewName = 'dashboard';
        state.currentView = viewName;

        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        // Show target
        const target = document.getElementById('view-' + viewName);
        if (target) target.classList.add('active');

        // Update nav active
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Update title
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = VIEW_TITLES[viewName];

        // Update URL hash (without reload)
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '#' + viewName);
        }

        // Call view initializer if exists
        const initFn = window['initView_' + viewName];
        if (typeof initFn === 'function') {
            try { initFn(); } catch (err) { console.error('View init error:', err); }
        }
    }

    // ============ LOGOUT ============
    function initLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Logout from admin panel?')) {
                    localStorage.removeItem('novaAdminToken');
                    localStorage.removeItem('novaAdminUser');
                    window.location.href = '/admin/index.html';
                }
            });
        }
    }

    // ============ INIT ============
    document.addEventListener('DOMContentLoaded', () => {
        if (!checkAuth()) return;

        fillUserInfo();
        initSidebar();
        initLogout();

        // Nav clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) navigate(view);
            });
        });

        // Load from hash or default
        const hash = (window.location.hash || '').replace('#', '');
        navigate(hash || 'dashboard');
    });

    // Expose globally
    window.novaApp = { navigate, state };
})();
