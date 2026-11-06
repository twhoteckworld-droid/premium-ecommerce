/**
 * NOVASTORE ADMIN - INVENTORY VIEW
 */
(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = { page: 1, limit: 20, search: '', filter: '', currentProduct: null };

    function getToken() { return localStorage.getItem('novaAdminToken'); }
    function authHeaders(json = true) {
        const h = { 'Authorization': 'Bearer ' + getToken() };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    }
    function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function fmt(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
    function fmtDate(d) { return d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }
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

    async function loadStats() {
        try {
            const res = await fetch(`${API}/admin/inventory/stats`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) return;
            const s = data.stats;
            document.getElementById('invStatTotal').textContent = s.total;
            document.getElementById('invStatValue').textContent = fmt(s.totalValue);
            document.getElementById('invStatLow').textContent = s.lowStock;
            document.getElementById('invStatOut').textContent = s.outOfStock;
        } catch (e) { console.error(e); }
    }

    async function loadInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading...</td></tr>';

        try {
            const params = new URLSearchParams({ page: state.page, limit: state.limit });
            if (state.search) params.set('search', state.search);
            if (state.filter) params.set('filter', state.filter);

            const res = await fetch(`${API}/admin/inventory?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderInventory(data.products);
            renderPagination(data.total, data.page, data.limit);
            document.getElementById('inventoryCount').textContent = `Showing ${data.products.length} of ${data.total}`;
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderInventory(products) {
        const tbody = document.getElementById('inventoryTableBody');
        if (!products.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-loading">No products match filter.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const stockClass = p.stock === 0 ? 'out' : (p.stock < 5 ? 'low' : 'ok');
            const value = p.stock * p.salePrice;
            return `
                <tr>
                    <td><strong style="font-size:13px;">${esc(p.name)}</strong></td>
                    <td>${p.sku ? esc(p.sku) : '—'}</td>
                    <td>${p.category?.name ? esc(p.category.name) : '—'}</td>
                    <td><span class="stock-display ${stockClass}">${p.stock}</span></td>
                    <td>${fmt(value)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="icon-action" onclick="window.novaInventory.adjust('${p._id}', '${esc(p.name).replace(/'/g, "\\'")}', ${p.stock})" title="Adjust Stock">⚖️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(total, page, limit) {
        const pages = Math.ceil(total / limit);
        const el = document.getElementById('inventoryPagination');
        if (pages <= 1) { el.innerHTML = ''; return; }
        let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="window.novaInventory.page(${page - 1})">‹</button>`;
        for (let i = 1; i <= pages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.novaInventory.page(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="window.novaInventory.page(${page + 1})">›</button>`;
        el.innerHTML = html;
    }

    function openAdjustModal(id, name, stock) {
        state.currentProduct = { id, name, stock };
        document.getElementById('adjustProductId').value = id;
        document.getElementById('adjustProductName').textContent = name;
        document.getElementById('adjustCurrentStock').textContent = stock;
        document.getElementById('adjustChange').value = '';
        document.getElementById('adjustNote').value = '';
        document.getElementById('adjustReason').value = 'restock';
        document.getElementById('adjustStockModal').classList.add('active');
    }

    function closeAdjust() {
        document.getElementById('adjustStockModal').classList.remove('active');
        state.currentProduct = null;
    }

    async function submitAdjust(e) {
        e.preventDefault();
        if (!state.currentProduct) return;
        const btn = document.getElementById('adjustStockSave');
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Adjusting...';

        try {
            const change = Number(document.getElementById('adjustChange').value);
            const reason = document.getElementById('adjustReason').value;
            const note = document.getElementById('adjustNote').value.trim();

            const res = await fetch(`${API}/admin/inventory/${state.currentProduct.id}/adjust`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({ change, reason, note })
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast(`Stock adjusted: ${data.product.previousStock} → ${data.product.stock}`);
            closeAdjust();
            loadStats();
            loadInventory();
        } catch (err) {
            toast(err.message || 'Adjust failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = orig;
        }
    }

    async function openHistory() {
        document.getElementById('stockHistoryModal').classList.add('active');
        document.getElementById('stockHistoryBody').innerHTML = '<div class="loading-text">Loading...</div>';

        try {
            const res = await fetch(`${API}/admin/inventory/history`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            if (!data.history.length) {
                document.getElementById('stockHistoryBody').innerHTML = '<p class="loading-text">No stock changes recorded yet.</p>';
                return;
            }

            document.getElementById('stockHistoryBody').innerHTML = data.history.map(h => `
                <div class="history-row">
                    <div class="history-left">
                        <strong>${esc(h.productName || 'Unknown')}</strong>
                        <span>${fmtDate(h.createdAt)} • <span class="history-reason">${esc(h.reason)}</span></span>
                        ${h.note ? `<span style="display:block;color:var(--muted);font-size:11px;margin-top:2px;">Note: ${esc(h.note)}</span>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <div class="history-change ${h.change > 0 ? 'positive' : 'negative'}">${h.change > 0 ? '+' : ''}${h.change}</div>
                        <div class="history-stock">${h.previousStock} → ${h.newStock}</div>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            document.getElementById('stockHistoryBody').innerHTML = `<p class="loading-text" style="color:#ef4444;">Error: ${esc(err.message)}</p>`;
        }
    }

    function closeHistory() {
        document.getElementById('stockHistoryModal').classList.remove('active');
    }

    function initView_inventory() {
        const searchInput = document.getElementById('invSearch');
        const filterSel = document.getElementById('invFilter');
        const applyBtn = document.getElementById('btnApplyInvFilters');

        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.filter = filterSel.value;
                state.page = 1;
                loadInventory();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        }

        ['adjustStockClose', 'adjustStockCancel'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.bound) {
                el.dataset.bound = '1';
                el.addEventListener('click', closeAdjust);
            }
        });

        const form = document.getElementById('adjustStockForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = '1';
            form.addEventListener('submit', submitAdjust);
        }

        const histClose = document.getElementById('stockHistoryClose');
        if (histClose && !histClose.dataset.bound) {
            histClose.dataset.bound = '1';
            histClose.addEventListener('click', closeHistory);
        }

        loadStats();
        loadInventory();
    }

    window.novaInventory = {
        adjust: openAdjustModal,
        openHistory,
        page: (p) => { state.page = p; loadInventory(); }
    };

    window.initView_inventory = initView_inventory;
})();
