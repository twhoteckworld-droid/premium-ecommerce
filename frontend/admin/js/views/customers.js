/**
 * NOVASTORE ADMIN - CUSTOMERS VIEW
 */

(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = {
        page: 1,
        limit: 15,
        search: '',
        currentCustomer: null
    };

    function getToken() { return localStorage.getItem('novaAdminToken'); }
    function authHeaders(json = true) {
        const h = { 'Authorization': 'Bearer ' + getToken() };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    }
    function esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
    function fmtDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
    function initials(name) {
        return String(name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    async function loadCustomers() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading...</td></tr>';

        try {
            const params = new URLSearchParams({ page: state.page, limit: state.limit });
            if (state.search) params.set('search', state.search);

            const res = await fetch(`${API}/admin/customers?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderCustomers(data.customers);
            renderPagination(data.total, data.page, data.limit);
            document.getElementById('customersCount').textContent =
                `Showing ${data.customers.length} of ${data.total} customers`;
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="6" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderCustomers(customers) {
        const tbody = document.getElementById('customersTableBody');
        if (!customers.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-loading">No customers yet.</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(c => `
            <tr>
                <td>
                    <div class="customer-cell">
                        <div class="customer-avatar">${initials(c.name)}</div>
                        <div class="customer-info-cell">
                            <strong>${esc(c.name)}</strong>
                            <span>${esc(c.email)}</span>
                        </div>
                    </div>
                </td>
                <td>${esc(c.phone)}</td>
                <td><span class="orders-badge">${c.totalOrders}</span></td>
                <td class="spent-amount">${fmt(c.totalSpent)}</td>
                <td>${fmtDate(c.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-action" onclick="window.novaCustomers.view('${c._id}')" title="View">👁️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(total, page, limit) {
        const pages = Math.ceil(total / limit);
        const el = document.getElementById('customersPagination');
        if (pages <= 1) { el.innerHTML = ''; return; }
        let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="window.novaCustomers.page(${page - 1})">‹</button>`;
        for (let i = 1; i <= pages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.novaCustomers.page(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="window.novaCustomers.page(${page + 1})">›</button>`;
        el.innerHTML = html;
    }

    async function viewCustomer(id) {
        document.getElementById('customerDetailModal').classList.add('active');
        document.getElementById('customerDetailBody').innerHTML = '<div class="loading-text">Loading...</div>';

        try {
            const res = await fetch(`${API}/admin/customers/${id}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            state.currentCustomer = data.customer;
            renderCustomerDetail(data.customer, data.orders);
        } catch (err) {
            document.getElementById('customerDetailBody').innerHTML =
                `<div class="loading-text" style="color:#ef4444;">Error: ${esc(err.message)}</div>`;
        }
    }

    function renderCustomerDetail(c, orders) {
        document.getElementById('customerDetailTitle').textContent = c.name;

        const ordersHtml = orders.length
            ? orders.map(o => `
                <div class="customer-order-row">
                    <div class="customer-order-left">
                        <strong>${esc(o.orderNumber)}</strong>
                        <span>${fmtDate(o.createdAt)} • ${o.items?.length || 0} item(s)</span>
                    </div>
                    <div class="customer-order-right">
                        <strong>${fmt(o.total)}</strong>
                        <span>${esc(o.orderStatus)}</span>
                    </div>
                </div>
            `).join('')
            : '<p style="color:var(--muted);font-size:13px;text-align:center;padding:14px;">No orders yet</p>';

        document.getElementById('customerDetailBody').innerHTML = `
            <div class="stat-grid">
                <div class="stat-box">
                    <div class="stat-box-label">Total Orders</div>
                    <div class="stat-box-value">${c.totalOrders}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Total Spent</div>
                    <div class="stat-box-value green">${fmt(c.totalSpent)}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Joined</div>
                    <div class="stat-box-value" style="font-size:13px;">${fmtDate(c.createdAt)}</div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Contact</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-item-label">Email</div>
                        <div class="detail-item-value">${esc(c.email)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Phone</div>
                        <div class="detail-item-value">${esc(c.phone)}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Order History (${orders.length})</div>
                <div class="customer-orders-list">${ordersHtml}</div>
            </div>
        `;
    }

    function closeModal() {
        document.getElementById('customerDetailModal').classList.remove('active');
        state.currentCustomer = null;
    }

    function initView_customers() {
        const searchInput = document.getElementById('customerSearch');
        const applyBtn = document.getElementById('btnApplyCustomerFilters');

        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.page = 1;
                loadCustomers();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        }

        const closeBtn = document.getElementById('customerDetailClose');
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = '1';
            closeBtn.addEventListener('click', closeModal);
        }

        loadCustomers();
    }

    window.novaCustomers = {
        view: viewCustomer,
        page: (p) => { state.page = p; loadCustomers(); }
    };

    window.initView_customers = initView_customers;
})();
