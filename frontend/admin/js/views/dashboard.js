/**
 * NOVASTORE ADMIN - DASHBOARD VIEW
 * Loads stats, charts, recent data from backend.
 */

(function () {
    'use strict';

    const API = window.location.origin + '/api';
    let chartInstances = {};

    // ============ HELPERS ============
    function getToken() {
        return localStorage.getItem('novaAdminToken');
    }

    function authHeaders() {
        return {
            'Authorization': 'Bearer ' + getToken(),
            'Content-Type': 'application/json'
        };
    }

    function fmtCurrency(n) {
        return '₹' + Number(n || 0).toLocaleString('en-IN');
    }

    function fmtDate(d) {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function escapeHTML(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function handle401(res) {
        if (res.status === 401) {
            localStorage.removeItem('novaAdminToken');
            localStorage.removeItem('novaAdminUser');
            window.location.href = '/admin/index.html';
            return true;
        }
        return false;
    }

    // ============ STATS ============
    async function loadStats() {
        try {
            const res = await fetch(`${API}/admin/dashboard/stats`, { headers: authHeaders() });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const s = data.stats;
            document.getElementById('statRevenue').textContent = fmtCurrency(s.totalRevenue);
            document.getElementById('statOrders').textContent = s.totalOrders;
            document.getElementById('statProducts').textContent = s.totalProducts;
            document.getElementById('statCustomers').textContent = s.totalCustomers;
            document.getElementById('statPending').textContent = s.pendingOrders;
            document.getElementById('statDelivered').textContent = s.deliveredOrders;
            document.getElementById('statCancelled').textContent = s.cancelledOrders;
            document.getElementById('statLowStock').textContent = s.lowStockProducts;
        } catch (err) {
            console.error('Stats error:', err);
        }
    }

    // ============ CHARTS ============
    async function loadCharts() {
        try {
            const res = await fetch(`${API}/admin/dashboard/charts`, { headers: authHeaders() });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const c = data.charts;

            // Destroy old charts if exist
            Object.values(chartInstances).forEach(ch => ch.destroy && ch.destroy());
            chartInstances = {};

            // Daily Sales Line Chart
            const dailyCtx = document.getElementById('dailyChart').getContext('2d');
            chartInstances.daily = new Chart(dailyCtx, {
                type: 'line',
                data: {
                    labels: c.daily.labels,
                    datasets: [{
                        label: 'Revenue (₹)',
                        data: c.daily.revenue,
                        borderColor: '#2d8cff',
                        backgroundColor: 'rgba(45,140,255,0.15)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2d8cff',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#a8b3c5' } }
                    },
                    scales: {
                        x: { ticks: { color: '#748096' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#748096' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });

            // Status Distribution Doughnut
            const statusCtx = document.getElementById('statusChart').getContext('2d');
            chartInstances.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: c.statusDistribution.labels,
                    datasets: [{
                        data: c.statusDistribution.counts,
                        backgroundColor: ['#f59e0b', '#2d8cff', '#a855f7', '#3b82f6', '#06b6d4', '#10b981', '#ef4444'],
                        borderColor: '#071a35',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#a8b3c5', boxWidth: 12 } }
                    }
                }
            });

            // Monthly Revenue Bar Chart
            const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
            chartInstances.monthly = new Chart(monthlyCtx, {
                type: 'bar',
                data: {
                    labels: c.monthly.labels,
                    datasets: [{
                        label: 'Revenue (₹)',
                        data: c.monthly.revenue,
                        backgroundColor: 'rgba(45,140,255,0.7)',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#748096' }, grid: { display: false } },
                        y: { ticks: { color: '#748096' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });

            // Top Products Horizontal Bar
            const topCtx = document.getElementById('topProductsChart').getContext('2d');
            const topData = c.topProducts.length ? c.topProducts : [{ name: 'No sales yet', quantity: 0 }];
            chartInstances.top = new Chart(topCtx, {
                type: 'bar',
                data: {
                    labels: topData.map(p => p.name.substring(0, 20)),
                    datasets: [{
                        label: 'Quantity Sold',
                        data: topData.map(p => p.quantity),
                        backgroundColor: 'rgba(16,185,129,0.7)',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#748096' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#a8b3c5' }, grid: { display: false } }
                    }
                }
            });
        } catch (err) {
            console.error('Charts error:', err);
        }
    }

    // ============ RECENT ============
    async function loadRecent() {
        try {
            const res = await fetch(`${API}/admin/dashboard/recent`, { headers: authHeaders() });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const r = data.recent;

            // Recent Orders
            const ordersEl = document.getElementById('recentOrders');
            if (!r.orders.length) {
                ordersEl.innerHTML = '<p class="empty-text">No orders yet</p>';
            } else {
                ordersEl.innerHTML = r.orders.map(o => `
                    <div class="recent-item">
                        <div class="recent-left">
                            <strong>${escapeHTML(o.orderNumber)}</strong>
                            <p>${escapeHTML(o.customerName)} • ${fmtDate(o.createdAt)}</p>
                        </div>
                        <div class="recent-right">
                            <div class="recent-amount">${fmtCurrency(o.total)}</div>
                            <div class="recent-badge">${escapeHTML(o.orderStatus)}</div>
                        </div>
                    </div>
                `).join('');
            }

            // Recent Customers
            const custEl = document.getElementById('recentCustomers');
            if (!r.customers.length) {
                custEl.innerHTML = '<p class="empty-text">No registered customers yet</p>';
            } else {
                custEl.innerHTML = r.customers.map(c => `
                    <div class="recent-item">
                        <div class="recent-left">
                            <strong>${escapeHTML(c.name)}</strong>
                            <p>${escapeHTML(c.email)}</p>
                        </div>
                        <div class="recent-right">
                            <div class="recent-badge">${fmtDate(c.createdAt)}</div>
                        </div>
                    </div>
                `).join('');
            }

            // Low Stock
            const lowEl = document.getElementById('recentLowStock');
            if (!r.lowStock.length) {
                lowEl.innerHTML = '<p class="empty-text">All products sufficiently stocked</p>';
            } else {
                lowEl.innerHTML = r.lowStock.map(p => `
                    <div class="recent-item">
                        <div class="recent-left">
                            <strong>${escapeHTML(p.name)}</strong>
                            <p>Only ${p.stock} left</p>
                        </div>
                        <div class="recent-right">
                            <div class="recent-amount">${fmtCurrency(p.salePrice)}</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Recent error:', err);
        }
    }

    // ============ INIT ============
    function initDashboardView() {
        loadStats();
        loadCharts();
        loadRecent();
    }

    // Expose for SPA router
    window.initView_dashboard = initDashboardView;

    // Auto-load if already on dashboard
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('view-dashboard')?.classList.contains('active')) {
                initDashboardView();
            }
        });
    } else {
        if (document.getElementById('view-dashboard')?.classList.contains('active')) {
            initDashboardView();
        }
    }
})();
