/**
 * NOVASTORE ADMIN - COUPONS VIEW
 */

(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = {
        page: 1,
        limit: 15,
        search: '',
        status: '',
        currentCouponId: null,
        deleteTargetId: null
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

    function discountLabel(c) {
        return c.discountType === 'percentage'
            ? `${c.discountValue}%${c.maxDiscount > 0 ? ` (max ${fmt(c.maxDiscount)})` : ''}`
            : fmt(c.discountValue);
    }

    async function loadCoupons() {
        const tbody = document.getElementById('couponsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading...</td></tr>';

        try {
            const params = new URLSearchParams({ page: state.page, limit: state.limit });
            if (state.search) params.set('search', state.search);
            if (state.status) params.set('status', state.status);

            const res = await fetch(`${API}/admin/coupons?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderCoupons(data.coupons);
            renderPagination(data.total, data.page, data.limit);
            document.getElementById('couponsCount').textContent =
                `Showing ${data.coupons.length} of ${data.total} coupons`;
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderCoupons(coupons) {
        const tbody = document.getElementById('couponsTableBody');
        if (!coupons.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No coupons yet. Click "+ Add Coupon".</td></tr>';
            return;
        }

        const now = new Date();

        tbody.innerHTML = coupons.map(c => {
            const expiry = new Date(c.expiryDate);
            const isExpired = expiry < now;
            const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
            const expiryClass = isExpired ? 'expired' : (daysLeft <= 7 ? 'expiring' : '');
            const expiryLabel = isExpired ? 'Expired' : (daysLeft <= 7 ? `${daysLeft}d left` : '');

            return `
                <tr>
                    <td>
                        <span class="coupon-code">${esc(c.code)}</span>
                        ${c.description ? `<span class="coupon-desc">${esc(c.description)}</span>` : ''}
                    </td>
                    <td><strong style="color:var(--blue-bright);">${discountLabel(c)}</strong></td>
                    <td>${c.minOrderValue > 0 ? fmt(c.minOrderValue) : '—'}</td>
                    <td>
                        <div class="coupon-usage">
                            <strong>${c.usedCount}</strong>
                            <span>/ ${c.usageLimit > 0 ? c.usageLimit : '∞'}</span>
                        </div>
                    </td>
                    <td>
                        <div class="coupon-expiry ${expiryClass}">
                            ${fmtDate(c.expiryDate)}
                            ${expiryLabel ? `<br><small>${expiryLabel}</small>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="badge ${c.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                            ${c.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="icon-action" onclick="window.novaCoupons.edit('${c._id}')" title="Edit">✏️</button>
                            <button class="icon-action" onclick="window.novaCoupons.toggle('${c._id}')" title="Toggle Status">⏻</button>
                            <button class="icon-action danger" onclick="window.novaCoupons.confirmDelete('${c._id}', '${esc(c.code)}')" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(total, page, limit) {
        const pages = Math.ceil(total / limit);
        const el = document.getElementById('couponsPagination');
        if (pages <= 1) { el.innerHTML = ''; return; }
        let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="window.novaCoupons.page(${page - 1})">‹</button>`;
        for (let i = 1; i <= pages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.novaCoupons.page(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="window.novaCoupons.page(${page + 1})">›</button>`;
        el.innerHTML = html;
    }

    function openModal(id = null) {
        state.currentCouponId = id;
        const form = document.getElementById('couponForm');
        form.reset();

        document.getElementById('couponId').value = id || '';
        document.getElementById('couponModalTitle').textContent = id ? 'Edit Coupon' : 'Add Coupon';

        // Reset defaults
        document.getElementById('cpStatus').value = 'active';
        document.getElementById('cpDiscountType').value = 'percentage';
        document.getElementById('cpMinOrder').value = 0;
        document.getElementById('cpMaxDiscount').value = 0;
        document.getElementById('cpUsageLimit').value = 0;
        document.getElementById('cpPerCustomer').value = 1;

        // Set default expiry = today + 30 days
        const future = new Date();
        future.setDate(future.getDate() + 30);
        document.getElementById('cpExpiryDate').value = future.toISOString().split('T')[0];

        if (id) fetchCouponForEdit(id);

        document.getElementById('couponModal').classList.add('active');
    }

    function closeModal() {
        document.getElementById('couponModal').classList.remove('active');
        state.currentCouponId = null;
    }

    async function fetchCouponForEdit(id) {
        try {
            const res = await fetch(`${API}/admin/coupons/${id}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const c = data.coupon;
            document.getElementById('cpCode').value = c.code || '';
            document.getElementById('cpDescription').value = c.description || '';
            document.getElementById('cpDiscountType').value = c.discountType || 'percentage';
            document.getElementById('cpDiscountValue').value = c.discountValue || 0;
            document.getElementById('cpMinOrder').value = c.minOrderValue || 0;
            document.getElementById('cpMaxDiscount').value = c.maxDiscount || 0;
            document.getElementById('cpStartDate').value = c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '';
            document.getElementById('cpExpiryDate').value = c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : '';
            document.getElementById('cpUsageLimit').value = c.usageLimit || 0;
            document.getElementById('cpPerCustomer').value = c.perCustomerLimit || 1;
            document.getElementById('cpStatus').value = c.status || 'active';
        } catch (err) {
            toast('Failed to load: ' + err.message, 'error');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('couponModalSave');
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const payload = {
                code: document.getElementById('cpCode').value.trim().toUpperCase(),
                description: document.getElementById('cpDescription').value.trim(),
                discountType: document.getElementById('cpDiscountType').value,
                discountValue: Number(document.getElementById('cpDiscountValue').value),
                minOrderValue: Number(document.getElementById('cpMinOrder').value) || 0,
                maxDiscount: Number(document.getElementById('cpMaxDiscount').value) || 0,
                startDate: document.getElementById('cpStartDate').value || undefined,
                expiryDate: document.getElementById('cpExpiryDate').value,
                usageLimit: Number(document.getElementById('cpUsageLimit').value) || 0,
                perCustomerLimit: Number(document.getElementById('cpPerCustomer').value) || 1,
                status: document.getElementById('cpStatus').value
            };

            const id = state.currentCouponId;
            const url = id ? `${API}/admin/coupons/${id}` : `${API}/admin/coupons`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: authHeaders(true),
                body: JSON.stringify(payload)
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            toast(id ? 'Coupon updated ✅' : 'Coupon created ✅');
            closeModal();
            loadCoupons();
        } catch (err) {
            toast(err.message || 'Save failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = orig;
        }
    }

    function confirmDelete(id, code) {
        state.deleteTargetId = id;
        document.getElementById('deleteCouponCode').textContent = code;
        document.getElementById('deleteCouponModal').classList.add('active');
    }

    async function doDelete() {
        if (!state.deleteTargetId) return;
        const btn = document.getElementById('deleteCouponConfirm');
        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
            const res = await fetch(`${API}/admin/coupons/${state.deleteTargetId}`, {
                method: 'DELETE',
                headers: authHeaders(false)
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Coupon deleted ✅');
            document.getElementById('deleteCouponModal').classList.remove('active');
            state.deleteTargetId = null;
            loadCoupons();
        } catch (err) {
            toast(err.message || 'Delete failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Delete';
        }
    }

    async function toggle(id) {
        try {
            const res = await fetch(`${API}/admin/coupons/${id}/toggle`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({})
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Status toggled');
            loadCoupons();
        } catch (err) {
            toast(err.message || 'Toggle failed', 'error');
        }
    }

    function initView_coupons() {
        const addBtn = document.getElementById('btnAddCoupon');
        if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = '1';
            addBtn.addEventListener('click', () => openModal());
        }

        ['couponModalClose', 'couponModalCancel'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.bound) {
                el.dataset.bound = '1';
                el.addEventListener('click', closeModal);
            }
        });

        const form = document.getElementById('couponForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = '1';
            form.addEventListener('submit', handleSubmit);
        }

        const searchInput = document.getElementById('couponSearch');
        const filterStatus = document.getElementById('couponFilterStatus');
        const applyBtn = document.getElementById('btnApplyCouponFilters');
        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.status = filterStatus.value;
                state.page = 1;
                loadCoupons();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        }

        ['deleteCouponCancel'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.bound) {
                el.dataset.bound = '1';
                el.addEventListener('click', () => {
                    document.getElementById('deleteCouponModal').classList.remove('active');
                    state.deleteTargetId = null;
                });
            }
        });
        const delConfirm = document.getElementById('deleteCouponConfirm');
        if (delConfirm && !delConfirm.dataset.bound) {
            delConfirm.dataset.bound = '1';
            delConfirm.addEventListener('click', doDelete);
        }

        loadCoupons();
    }

    window.novaCoupons = {
        edit: openModal,
        confirmDelete,
        toggle,
        page: (p) => { state.page = p; loadCoupons(); }
    };

    window.initView_coupons = initView_coupons;
})();
