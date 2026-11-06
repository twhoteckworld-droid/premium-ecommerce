/**
 * NOVASTORE ADMIN - PAYMENTS VIEW
 */

(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = {
        page: 1,
        limit: 15,
        status: '',
        search: '',
        currentPayment: null
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
    function statusBadge(status) {
        const map = { 'Verified': 'badge-verified', 'Created': 'badge-created', 'Failed': 'badge-failed' };
        return `<span class="badge ${map[status] || 'badge-pending'}">${esc(status)}</span>`;
    }
    function modeBadge(mode) {
        const cls = mode === 'live' ? 'mode-live' : 'mode-mock';
        return `<span class="mode-badge ${cls}">${esc(mode || 'mock')}</span>`;
    }

    async function loadStats() {
        try {
            const res = await fetch(`${API}/admin/payments/stats`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            const s = data.stats;
            document.getElementById('statPayTotal').textContent = s.total;
            document.getElementById('statPaySuccess').textContent = s.successful;
            document.getElementById('statPayPending').textContent = s.pending;
            document.getElementById('statPayFailed').textContent = s.failed;
            document.getElementById('statPayRefunded').textContent = s.refunded;
            document.getElementById('statPayCollected').textContent = fmt(s.totalCollected);
        } catch (err) {
            console.error('Stats error:', err);
        }
    }

    async function loadPayments() {
        const tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading...</td></tr>';

        try {
            const params = new URLSearchParams({ page: state.page, limit: state.limit });
            if (state.status) params.set('status', state.status);
            if (state.search) params.set('search', state.search);

            const res = await fetch(`${API}/admin/payments?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderPayments(data.payments);
            renderPagination(data.total, data.page, data.limit);
            document.getElementById('paymentsCount').textContent =
                `Showing ${data.payments.length} of ${data.total} payments`;
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderPayments(payments) {
        const tbody = document.getElementById('paymentsTableBody');
        if (!payments.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No payments found.</td></tr>';
            return;
        }

        tbody.innerHTML = payments.map(p => `
            <tr>
                <td>
                    <div class="payment-cell">
                        <span class="payment-id">${esc(p.razorpayOrderId)}</span>
                        ${p.razorpayPaymentId ? `<span class="payment-sub">${esc(p.razorpayPaymentId)}</span>` : ''}
                    </div>
                </td>
                <td>${p.orderNumber ? `<strong style="font-size:12px;color:var(--blue-bright);">${esc(p.orderNumber)}</strong>` : '—'}</td>
                <td><strong>${fmt(p.amount)}</strong></td>
                <td>${statusBadge(p.status)}</td>
                <td>${modeBadge(p.mode)}</td>
                <td style="font-size:12px;">${fmtDate(p.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-action" onclick="window.novaPayments.view('${p._id}')" title="View">👁️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(total, page, limit) {
        const pages = Math.ceil(total / limit);
        const el = document.getElementById('paymentsPagination');
        if (pages <= 1) { el.innerHTML = ''; return; }
        let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="window.novaPayments.page(${page - 1})">‹</button>`;
        for (let i = 1; i <= pages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.novaPayments.page(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="window.novaPayments.page(${page + 1})">›</button>`;
        el.innerHTML = html;
    }

    async function viewPayment(id) {
        document.getElementById('paymentDetailModal').classList.add('active');
        document.getElementById('paymentDetailBody').innerHTML = '<div class="loading-text">Loading...</div>';

        try {
            const res = await fetch(`${API}/admin/payments/${id}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            state.currentPayment = data.payment;
            renderPaymentDetail(data.payment, data.order);
        } catch (err) {
            document.getElementById('paymentDetailBody').innerHTML =
                `<div class="loading-text" style="color:#ef4444;">Error: ${esc(err.message)}</div>`;
        }
    }

    function renderPaymentDetail(p, order) {
        document.getElementById('paymentDetailTitle').textContent = 'Payment Details';

        const orderInfo = order ? `
            <div class="detail-section">
                <div class="detail-section-title">Linked Order</div>
                <div class="payment-detail-row">
                    <span>Order Number</span>
                    <span class="mono">${esc(order.orderNumber)}</span>
                </div>
                <div class="payment-detail-row">
                    <span>Customer</span>
                    <span>${esc(order.customerDetails?.name)}</span>
                </div>
                <div class="payment-detail-row">
                    <span>Phone</span>
                    <span>${esc(order.customerDetails?.phone)}</span>
                </div>
                <div class="payment-detail-row">
                    <span>Order Total</span>
                    <span>${fmt(order.total)}</span>
                </div>
                <div class="payment-detail-row">
                    <span>Order Status</span>
                    <span>${esc(order.orderStatus)}</span>
                </div>
            </div>
        ` : '<div class="detail-section"><div class="detail-section-title">Linked Order</div><p style="color:var(--muted);font-size:13px;">Order not found</p></div>';

        document.getElementById('paymentDetailBody').innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title">Payment Info</div>
                <div class="payment-detail-row">
                    <span>Status</span>
                    <span>${statusBadge(p.status)}</span>
                </div>
                <div class="payment-detail-row">
                    <span>Amount</span>
                    <span>${fmt(p.amount)} ${esc(p.currency)}</span>
                </div>
                <div class="payment-detail-row">
                    <span>Mode</span>
                    <span>${modeBadge(p.mode)}</span>
                </div>
                <div class="payment-detail-row">
                    <span>Razorpay Order ID</span>
                    <span class="mono">${esc(p.razorpayOrderId)}</span>
                </div>
                ${p.razorpayPaymentId ? `
                <div class="payment-detail-row">
                    <span>Razorpay Payment ID</span>
                    <span class="mono">${esc(p.razorpayPaymentId)}</span>
                </div>` : ''}
                ${p.paymentMethod ? `
                <div class="payment-detail-row">
                    <span>Payment Method</span>
                    <span>${esc(p.paymentMethod)}</span>
                </div>` : ''}
                <div class="payment-detail-row">
                    <span>Created</span>
                    <span>${fmtDate(p.createdAt)}</span>
                </div>
                ${p.verifiedAt ? `
                <div class="payment-detail-row">
                    <span>Verified At</span>
                    <span>${fmtDate(p.verifiedAt)}</span>
                </div>` : ''}
                ${p.failureReason ? `
                <div class="payment-detail-row">
                    <span>Failure Reason</span>
                    <span style="color:#ef4444;">${esc(p.failureReason)}</span>
                </div>` : ''}
            </div>

            ${orderInfo}
        `;
    }

    function closeModal() {
        document.getElementById('paymentDetailModal').classList.remove('active');
        state.currentPayment = null;
    }

    function initView_payments() {
        const searchInput = document.getElementById('paymentSearch');
        const filterStatus = document.getElementById('paymentFilterStatus');
        const applyBtn = document.getElementById('btnApplyPaymentFilters');

        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.status = filterStatus.value;
                state.page = 1;
                loadPayments();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        }

        const closeBtn = document.getElementById('paymentDetailClose');
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = '1';
            closeBtn.addEventListener('click', closeModal);
        }

        loadStats();
        loadPayments();
    }

    window.novaPayments = {
        view: viewPayment,
        page: (p) => { state.page = p; loadPayments(); },
        refresh: () => { loadStats(); loadPayments(); }
    };

    window.initView_payments = initView_payments;
})();
