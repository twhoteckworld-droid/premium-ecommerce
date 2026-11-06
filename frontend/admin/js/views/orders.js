/**
 * NOVASTORE ADMIN - ORDERS VIEW
 */

(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = {
        page: 1,
        limit: 15,
        search: '',
        status: '',
        from: '',
        to: '',
        currentOrder: null
    };

    const STATUS_OPTIONS = [
        'Payment Pending', 'Confirmed', 'Processing',
        'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'
    ];

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
    function fmtDateTime(d) {
        if (!d) return '—';
        return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
    function toast(msg, type = 'success') {
        const el = document.createElement('div');
        el.textContent = msg;
        el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;
            padding:14px 20px;border-radius:10px;font-size:14px;font-weight:600;
            color:#fff;box-shadow:0 10px 30px rgba(0,0,0,0.4);
            background:${type === 'error' ? '#ef4444' : '#10b981'};`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }

    function statusBadge(status) {
        const map = {
            'Payment Pending': 'badge-pending',
            'Confirmed': 'badge-confirmed',
            'Processing': 'badge-processing',
            'Shipped': 'badge-shipped',
            'Out for Delivery': 'badge-ofd',
            'Delivered': 'badge-delivered',
            'Cancelled': 'badge-cancelled'
        };
        return `<span class="badge ${map[status] || 'badge-pending'}">${esc(status)}</span>`;
    }
    function paymentBadge(status) {
        const map = { 'Paid': 'badge-paid', 'Pending': 'badge-pending', 'Failed': 'badge-failed', 'Refunded': 'badge-cancelled' };
        return `<span class="badge ${map[status] || 'badge-pending'}">${esc(status)}</span>`;
    }

    // ============ LIST ============
    async function loadOrders() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Loading orders...</td></tr>';

        try {
            const params = new URLSearchParams({ page: state.page, limit: state.limit });
            if (state.search) params.set('search', state.search);
            if (state.status) params.set('status', state.status);
            if (state.from) params.set('from', state.from);
            if (state.to) params.set('to', state.to);

            const res = await fetch(`${API}/orders?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderOrders(data.orders);
            renderPagination(data.total, data.page, data.limit);
            document.getElementById('ordersCount').textContent =
                `Showing ${data.orders.length} of ${data.total} orders`;
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="8" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderOrders(orders) {
        const tbody = document.getElementById('ordersTableBody');
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No orders found.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>
                    <div class="order-cell">
                        <span class="order-number">${esc(o.orderNumber)}</span>
                        <span class="order-date">${fmtDate(o.createdAt)}</span>
                    </div>
                </td>
                <td>
                    <div class="customer-cell">
                        <strong>${esc(o.customerDetails?.name)}</strong>
                        <span>${esc(o.customerDetails?.phone)}</span>
                    </div>
                </td>
                <td><span class="items-count">${o.items?.length || 0} item${o.items?.length !== 1 ? 's' : ''}</span></td>
                <td><strong>${fmt(o.total)}</strong></td>
                <td>${paymentBadge(o.paymentStatus)}</td>
                <td>${statusBadge(o.orderStatus)}</td>
                <td>${fmtDate(o.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-action" onclick="window.novaOrders.view('${o._id}')" title="View">👁️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(total, page, limit) {
        const pages = Math.ceil(total / limit);
        const el = document.getElementById('ordersPagination');
        if (pages <= 1) { el.innerHTML = ''; return; }
        let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="window.novaOrders.page(${page - 1})">‹</button>`;
        for (let i = 1; i <= pages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.novaOrders.page(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="window.novaOrders.page(${page + 1})">›</button>`;
        el.innerHTML = html;
    }

    // ============ DETAIL VIEW ============
    async function viewOrder(id) {
        document.getElementById('orderDetailModal').classList.add('active');
        document.getElementById('orderDetailBody').innerHTML = '<div class="loading-text">Loading...</div>';
        document.getElementById('orderDetailTitle').textContent = 'Order Details';

        try {
            const res = await fetch(`${API}/orders/${id}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            state.currentOrder = data.order;
            renderOrderDetail(data.order);
        } catch (err) {
            document.getElementById('orderDetailBody').innerHTML =
                `<div class="loading-text" style="color:#ef4444;">Error: ${esc(err.message)}</div>`;
        }
    }

    function renderOrderDetail(o) {
        document.getElementById('orderDetailTitle').textContent = 'Order ' + o.orderNumber;

        const itemsHtml = (o.items || []).map(it => `
            <div class="order-item-row">
                <div class="order-item-left">
                    <strong>${esc(it.name)}</strong>
                    <span>Qty: ${it.quantity} × ${fmt(it.price)}</span>
                </div>
                <div class="order-item-right">
                    <strong>${fmt(it.price * it.quantity)}</strong>
                </div>
            </div>
        `).join('');

        const cancelling = ['Delivered', 'Cancelled', 'Shipped', 'Out for Delivery'].includes(o.orderStatus);
        const canCancel = !cancelling;

        const body = `
            <div class="detail-section">
                <div class="detail-section-title">Customer</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-item-label">Name</div>
                        <div class="detail-item-value">${esc(o.customerDetails?.name)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Phone</div>
                        <div class="detail-item-value">${esc(o.customerDetails?.phone)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Email</div>
                        <div class="detail-item-value">${esc(o.customerDetails?.email || '—')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Order Date</div>
                        <div class="detail-item-value">${fmtDateTime(o.createdAt)}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Delivery Address</div>
                <div class="detail-item-value" style="line-height:1.6;">
                    ${esc(o.customerDetails?.address)}<br>
                    ${esc(o.customerDetails?.city || '')} ${o.customerDetails?.state ? ', ' + esc(o.customerDetails.state) : ''}<br>
                    PIN: ${esc(o.customerDetails?.pincode)}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Items (${o.items?.length || 0})</div>
                <div class="order-items-list">${itemsHtml}</div>
                <div class="order-totals">
                    <div class="order-total-row">
                        <span>Subtotal</span>
                        <span>${fmt(o.subtotal)}</span>
                    </div>
                    ${o.discount ? `<div class="order-total-row"><span>Discount</span><span>-${fmt(o.discount)}</span></div>` : ''}
                    <div class="order-total-row">
                        <span>Shipping</span>
                        <span>${o.shipping > 0 ? fmt(o.shipping) : 'Free'}</span>
                    </div>
                    <div class="order-total-row grand">
                        <span>Total</span>
                        <span>${fmt(o.total)}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Payment & Status</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-item-label">Payment Status</div>
                        <div class="detail-item-value">${paymentBadge(o.paymentStatus)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-item-label">Order Status</div>
                        <div class="detail-item-value">${statusBadge(o.orderStatus)}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Update Status</div>
                <div class="detail-actions">
                    <select id="statusUpdateSelect" class="status-select" ${o.orderStatus === 'Delivered' || o.orderStatus === 'Cancelled' ? 'disabled' : ''}>
                        ${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === o.orderStatus ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <button class="filter-btn" onclick="window.novaOrders.updateStatus()" ${o.orderStatus === 'Delivered' || o.orderStatus === 'Cancelled' ? 'disabled' : ''}>
                        Update
                    </button>
                    ${canCancel ? `<button class="btn-cancel-order" onclick="window.novaOrders.cancelOrder()">Cancel Order</button>` : ''}
                </div>
            </div>
        `;

        document.getElementById('orderDetailBody').innerHTML = body;
    }

    // ============ UPDATE STATUS ============
    async function updateStatus() {
        if (!state.currentOrder) return;
        const newStatus = document.getElementById('statusUpdateSelect').value;
        if (newStatus === state.currentOrder.orderStatus) {
            toast('Status unchanged', 'error');
            return;
        }

        try {
            const res = await fetch(`${API}/orders/${state.currentOrder._id}/status`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({ orderStatus: newStatus })
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Status updated ✅');
            closeModal();
            loadOrders();
        } catch (err) {
            toast(err.message || 'Update failed', 'error');
        }
    }

    // ============ CANCEL ORDER ============
    async function cancelOrder() {
        if (!state.currentOrder) return;
        if (!confirm(`Cancel order ${state.currentOrder.orderNumber}?\n\nThis will restore stock for all items and cannot be undone.`)) return;

        try {
            const res = await fetch(`${API}/orders/${state.currentOrder._id}/cancel`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({ reason: 'Admin cancelled' })
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Order cancelled + stock restored ✅');
            closeModal();
            loadOrders();
        } catch (err) {
            toast(err.message || 'Cancel failed', 'error');
        }
    }

    function closeModal() {
        document.getElementById('orderDetailModal').classList.remove('active');
        state.currentOrder = null;
    }

    // ============ INIT ============
    function initView_orders() {
        const applyBtn = document.getElementById('btnApplyOrderFilters');
        const searchInput = document.getElementById('orderSearch');
        const filterStatus = document.getElementById('orderFilterStatus');
        const filterFrom = document.getElementById('orderFilterFrom');
        const filterTo = document.getElementById('orderFilterTo');

        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.status = filterStatus.value;
                state.from = filterFrom.value;
                state.to = filterTo.value;
                state.page = 1;
                loadOrders();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        }

        const closeBtn = document.getElementById('orderDetailClose');
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = '1';
            closeBtn.addEventListener('click', closeModal);
        }

        loadOrders();
    }

    window.novaOrders = {
        view: viewOrder,
        page: (p) => { state.page = p; loadOrders(); },
        refresh: () => loadOrders(),
        updateStatus,
        cancelOrder
    };

    window.initView_orders = initView_orders;
})();
