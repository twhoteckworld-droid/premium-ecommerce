/**
 * NOVASTORE ADMIN - REVIEWS VIEW
 */
(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = { page: 1, limit: 15, search: '', status: '', rejectTargetId: null, deleteTargetId: null };

    function getToken() { return localStorage.getItem('novaAdminToken'); }
    function authHeaders(json = true) {
        const h = { 'Authorization': 'Bearer ' + getToken() };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    }
    function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
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
    function stars(r) {
        return '★'.repeat(r) + '☆'.repeat(5 - r);
    }

    async function loadStats() {
        try {
            const res = await fetch(`${API}/admin/reviews/stats`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) return;
            const s = data.stats;
            document.getElementById('rStatTotal').textContent = s.total;
            document.getElementById('rStatPending').textContent = s.pending;
            document.getElementById('rStatApproved').textContent = s.approved;
            document.getElementById('rStatRejected').textContent = s.rejected;
            document.getElementById('rStatAvg').textContent = s.avgRating.toFixed(1);
        } catch (e) { console.error(e); }
    }

    async function loadReviews() {
        const tbody = document.getElementById('reviewsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading...</td></tr>';

        try {
            const params = new URLSearchParams({ page: state.page, limit: state.limit });
            if (state.search) params.set('search', state.search);
            if (state.status) params.set('status', state.status);

            const res = await fetch(`${API}/admin/reviews?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderReviews(data.reviews);
            renderPagination(data.total, data.page, data.limit);
            document.getElementById('reviewsCount').textContent = `Showing ${data.reviews.length} of ${data.total}`;
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderReviews(reviews) {
        const tbody = document.getElementById('reviewsTableBody');
        if (!reviews.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No reviews found.</td></tr>';
            return;
        }

        tbody.innerHTML = reviews.map(r => {
            const statusClass = `badge-${r.status}-review`;
            const productName = r.product?.name || 'Unknown';
            const verifiedBadge = r.verifiedPurchase ? '<span class="verified-badge">✓ Verified</span>' : '';

            const actions = `
                ${r.status === 'pending' ? `<button class="icon-action" onclick="window.novaReviews.approve('${r._id}')" title="Approve" style="color:#10b981;">✓</button>` : ''}
                ${r.status !== 'rejected' ? `<button class="icon-action" onclick="window.novaReviews.openReject('${r._id}')" title="Reject" style="color:#f59e0b;">✕</button>` : ''}
                <button class="icon-action danger" onclick="window.novaReviews.openDelete('${r._id}')" title="Delete">🗑️</button>
            `;

            return `
                <tr>
                    <td>
                        <strong style="font-size:13px;">${esc(r.customerName)}</strong>${verifiedBadge}
                        <div style="font-size:11px;color:var(--muted);">${esc(r.customerPhone)}</div>
                    </td>
                    <td style="font-size:12px;">${esc(productName)}</td>
                    <td>
                        <div class="star-rating">${stars(r.rating)}<span class="rating-number">${r.rating}</span></div>
                    </td>
                    <td>
                        <div class="review-comment">
                            ${r.title ? `<strong>${esc(r.title)}</strong>` : ''}
                            <span class="comment-body">${esc(r.comment)}</span>
                        </div>
                    </td>
                    <td><span class="badge ${statusClass}">${r.status}</span></td>
                    <td style="font-size:12px;">${fmtDate(r.createdAt)}</td>
                    <td><div class="action-btns">${actions}</div></td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(total, page, limit) {
        const pages = Math.ceil(total / limit);
        const el = document.getElementById('reviewsPagination');
        if (pages <= 1) { el.innerHTML = ''; return; }
        let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="window.novaReviews.page(${page - 1})">‹</button>`;
        for (let i = 1; i <= pages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.novaReviews.page(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="window.novaReviews.page(${page + 1})">›</button>`;
        el.innerHTML = html;
    }

    async function approveReview(id) {
        try {
            const res = await fetch(`${API}/admin/reviews/${id}/approve`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({})
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Review approved ✅');
            loadStats(); loadReviews();
        } catch (err) {
            toast(err.message || 'Approve failed', 'error');
        }
    }

    function openReject(id) {
        state.rejectTargetId = id;
        document.getElementById('rejectReason').value = '';
        document.getElementById('rejectReviewModal').classList.add('active');
    }

    async function doReject() {
        if (!state.rejectTargetId) return;
        const btn = document.getElementById('rejectReviewConfirm');
        btn.disabled = true; btn.textContent = 'Rejecting...';

        try {
            const reason = document.getElementById('rejectReason').value.trim();
            const res = await fetch(`${API}/admin/reviews/${state.rejectTargetId}/reject`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({ reason })
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Review rejected');
            document.getElementById('rejectReviewModal').classList.remove('active');
            state.rejectTargetId = null;
            loadStats(); loadReviews();
        } catch (err) {
            toast(err.message || 'Reject failed', 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Reject';
        }
    }

    function openDelete(id) {
        state.deleteTargetId = id;
        document.getElementById('deleteReviewModal').classList.add('active');
    }

    async function doDelete() {
        if (!state.deleteTargetId) return;
        const btn = document.getElementById('deleteReviewConfirm');
        btn.disabled = true; btn.textContent = 'Deleting...';

        try {
            const res = await fetch(`${API}/admin/reviews/${state.deleteTargetId}`, {
                method: 'DELETE',
                headers: authHeaders(false)
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Review deleted');
            document.getElementById('deleteReviewModal').classList.remove('active');
            state.deleteTargetId = null;
            loadStats(); loadReviews();
        } catch (err) {
            toast(err.message || 'Delete failed', 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Delete';
        }
    }

    function initView_reviews() {
        const searchInput = document.getElementById('reviewSearch');
        const filterStatus = document.getElementById('reviewFilterStatus');
        const applyBtn = document.getElementById('btnApplyReviewFilters');

        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.status = filterStatus.value;
                state.page = 1;
                loadReviews();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        }

        ['rejectReviewCancel'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.bound) {
                el.dataset.bound = '1';
                el.addEventListener('click', () => {
                    document.getElementById('rejectReviewModal').classList.remove('active');
                    state.rejectTargetId = null;
                });
            }
        });
        ['deleteReviewCancel'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.bound) {
                el.dataset.bound = '1';
                el.addEventListener('click', () => {
                    document.getElementById('deleteReviewModal').classList.remove('active');
                    state.deleteTargetId = null;
                });
            }
        });

        const rc = document.getElementById('rejectReviewConfirm');
        if (rc && !rc.dataset.bound) { rc.dataset.bound = '1'; rc.addEventListener('click', doReject); }
        const dc = document.getElementById('deleteReviewConfirm');
        if (dc && !dc.dataset.bound) { dc.dataset.bound = '1'; dc.addEventListener('click', doDelete); }

        loadStats();
        loadReviews();
    }

    window.novaReviews = {
        approve: approveReview,
        openReject,
        openDelete,
        page: (p) => { state.page = p; loadReviews(); },
        refresh: () => { loadStats(); loadReviews(); }
    };

    window.initView_reviews = initView_reviews;
})();
