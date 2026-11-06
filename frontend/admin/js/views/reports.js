/**
 * NOVASTORE ADMIN - REPORTS VIEW
 */
(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = {
        from: '',
        to: '',
        activeTab: 'sales',
        loaded: { sales: false, products: false, customers: false }
    };

    function getToken() { return localStorage.getItem('novaAdminToken'); }
    function authHeaders() { return { 'Authorization': 'Bearer ' + getToken() }; }
    function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

    function buildQuery() {
        const p = new URLSearchParams();
        if (state.from) p.set('from', state.from);
        if (state.to) p.set('to', state.to);
        const qs = p.toString();
        return qs ? '?' + qs : '';
    }

    async function loadSales() {
        const daily = document.getElementById('salesDailyTable');
        daily.innerHTML = '<tr><td colspan="3" class="table-loading">Loading...</td></tr>';
        try {
            const res = await fetch(`${API}/admin/reports/sales${buildQuery()}`, { headers: authHeaders() });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            document.getElementById('salesOrders').textContent = data.summary.totalOrders;
            document.getElementById('salesRevenue').textContent = fmt(data.summary.totalRevenue);
            document.getElementById('salesAOV').textContent = fmt(data.summary.avgOrderValue);
            document.getElementById('salesDiscount').textContent = fmt(data.summary.totalDiscount);
            document.getElementById('salesShipping').textContent = fmt(data.summary.totalShipping);

            if (!data.daily.length) {
                daily.innerHTML = '<tr><td colspan="3" class="table-loading">No sales in this period</td></tr>';
            } else {
                daily.innerHTML = data.daily.map(d => `
                    <tr>
                        <td>${esc(d.date)}</td>
                        <td>${d.orders}</td>
                        <td><strong>${fmt(d.revenue)}</strong></td>
                    </tr>
                `).join('');
            }
            state.loaded.sales = true;
        } catch (err) {
            daily.innerHTML = `<tr><td colspan="3" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    async function loadProducts() {
        const tbody = document.getElementById('productsReportTable');
        tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Loading...</td></tr>';
        try {
            const res = await fetch(`${API}/admin/reports/products${buildQuery()}`, { headers: authHeaders() });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            if (!data.products.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-loading">No sales in this period</td></tr>';
            } else {
                tbody.innerHTML = data.products.map(p => `
                    <tr>
                        <td><strong>${esc(p.name)}</strong></td>
                        <td>${p.unitsSold}</td>
                        <td><strong style="color:var(--blue-bright);">${fmt(p.revenue)}</strong></td>
                        <td>${p.orderCount}</td>
                        <td>${p.currentStock}</td>
                    </tr>
                `).join('');
            }
            state.loaded.products = true;
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    async function loadCustomers() {
        const tbody = document.getElementById('customersReportTable');
        tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Loading...</td></tr>';
        try {
            const res = await fetch(`${API}/admin/reports/customers${buildQuery()}`, { headers: authHeaders() });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            document.getElementById('newCustomersCount').textContent = data.newCustomers;

            if (!data.topSpenders.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="table-loading">No paid orders in this period</td></tr>';
            } else {
                tbody.innerHTML = data.topSpenders.map(c => `
                    <tr>
                        <td><strong>${esc(c.name)}</strong></td>
                        <td>${esc(c.phone)}</td>
                        <td>${c.totalOrders}</td>
                        <td><strong style="color:#10b981;">${fmt(c.totalSpent)}</strong></td>
                        <td style="font-size:12px;">${new Date(c.lastOrderAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                `).join('');
            }
            state.loaded.customers = true;
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function setPreset(preset) {
        const now = new Date();
        const fmtDate = d => d.toISOString().slice(0, 10);
        const fromEl = document.getElementById('reportFrom');
        const toEl = document.getElementById('reportTo');

        if (preset === 'today') {
            fromEl.value = fmtDate(now);
            toEl.value = fmtDate(now);
        } else if (preset === '7d') {
            const f = new Date(now); f.setDate(f.getDate() - 6);
            fromEl.value = fmtDate(f);
            toEl.value = fmtDate(now);
        } else if (preset === '30d') {
            const f = new Date(now); f.setDate(f.getDate() - 29);
            fromEl.value = fmtDate(f);
            toEl.value = fmtDate(now);
        } else if (preset === 'month') {
            const f = new Date(now.getFullYear(), now.getMonth(), 1);
            fromEl.value = fmtDate(f);
            toEl.value = fmtDate(now);
        } else if (preset === 'all') {
            fromEl.value = '';
            toEl.value = '';
        }

        document.querySelectorAll('.preset-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.preset === preset);
        });

        applyDates();
    }

    function applyDates() {
        state.from = document.getElementById('reportFrom').value;
        state.to = document.getElementById('reportTo').value;
        reloadAll();
    }

    function switchTab(tab) {
        state.activeTab = tab;
        document.querySelectorAll('.report-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.report-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + tab));

        if (!state.loaded[tab]) {
            if (tab === 'sales') loadSales();
            if (tab === 'products') loadProducts();
            if (tab === 'customers') loadCustomers();
        }
    }

    function reloadAll() {
        state.loaded = { sales: false, products: false, customers: false };
        if (state.activeTab === 'sales') loadSales();
        else if (state.activeTab === 'products') loadProducts();
        else if (state.activeTab === 'customers') loadCustomers();
    }

    function exportCSV(type) {
        const token = getToken();
        const qs = buildQuery();
        const url = `${API}/admin/reports/export/${type}${qs}`;

        fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(res => {
                if (!res.ok) throw new Error('Export failed');
                return res.blob();
            })
            .then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch(err => alert('Export failed: ' + err.message));
    }

    function initView_reports() {
        // Bind tabs
        document.querySelectorAll('.report-tab').forEach(tab => {
            if (tab.dataset.bound) return;
            tab.dataset.bound = '1';
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Bind presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => setPreset(btn.dataset.preset));
        });

        // Bind apply button
        const applyBtn = document.getElementById('btnApplyReportDates');
        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', applyDates);
        }

        // Load default (sales, all time)
        if (!state.loaded.sales) loadSales();
    }

    window.novaReports = { exportCSV };

    window.initView_reports = initView_reports;
})();
