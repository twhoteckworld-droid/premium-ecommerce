/**
 * NOVASTORE ADMIN - PRODUCTS VIEW
 * Full CRUD: list, search, add, edit, delete, image upload.
 */

(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = {
        page: 1,
        limit: 10,
        search: '',
        status: '',
        featured: '',
        categories: [],
        currentProductId: null,
        deleteTargetId: null,
        keptImages: []
    };

    // ============ HELPERS ============
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
        el.className = 'toast ' + type;
        el.textContent = msg;
        el.style.cssText = `
            position:fixed;bottom:24px;right:24px;z-index:9999;
            padding:14px 20px;border-radius:10px;font-size:14px;font-weight:600;
            color:#fff;box-shadow:0 10px 30px rgba(0,0,0,0.4);
            background:${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
            animation:slideIn 0.3s ease;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }

    // ============ LOAD CATEGORIES ============
    async function loadCategories() {
        try {
            const res = await fetch(`${API}/products?limit=50`);
            // Note: no categories API yet. Use existing category filter values.
            // For now we load from public categories endpoint if available.
            // Fallback: skip categories
        } catch (e) {}
    }

    // ============ LOAD PRODUCTS ============
    async function loadProducts() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading...</td></tr>';

        try {
            const params = new URLSearchParams({
                page: state.page,
                limit: state.limit
            });
            if (state.search) params.set('search', state.search);
            if (state.status) params.set('status', state.status);
            if (state.featured) params.set('featured', state.featured);

            const res = await fetch(`${API}/admin/products?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderProducts(data.products);
            renderPagination(data.total, data.page, data.limit);
            document.getElementById('productsCount').textContent =
                `Showing ${data.products.length} of ${data.total} products`;
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderProducts(products) {
        const tbody = document.getElementById('productsTableBody');
        if (!products.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No products found. Click "+ Add Product" to create one.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const img = p.images && p.images[0]
                ? `<img class="product-thumb" src="${esc(p.images[0])}" alt="">`
                : `<div class="product-thumb-placeholder">📦</div>`;

            const stockClass = p.stock === 0 ? 'stock-out' : p.stock < 5 ? 'stock-low' : '';
            const categoryName = p.category?.name || '—';
            const featuredBadge = p.isFeatured ? ' <span class="badge badge-featured">★</span>' : '';

            return `
                <tr>
                    <td>
                        <div class="product-cell">
                            ${img}
                            <div class="product-info-cell">
                                <strong>${esc(p.name)}${featuredBadge}</strong>
                                <span>${esc(p.slug)}</span>
                            </div>
                        </div>
                    </td>
                    <td>${p.sku ? esc(p.sku) : '—'}</td>
                    <td>${esc(categoryName)}</td>
                    <td>
                        <strong>${fmt(p.salePrice)}</strong>
                        ${p.originalPrice > p.salePrice ? `<br><span style="color:var(--muted);text-decoration:line-through;font-size:11px;">${fmt(p.originalPrice)}</span>` : ''}
                    </td>
                    <td class="${stockClass}">${p.stock}</td>
                    <td>
                        <span class="badge ${p.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                            ${p.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="icon-action" onclick="window.novaProducts.edit('${p._id}')" title="Edit">✏️</button>
                            <button class="icon-action" onclick="window.novaProducts.toggle('${p._id}', 'isFeatured')" title="Toggle Featured">★</button>
                            <button class="icon-action" onclick="window.novaProducts.toggle('${p._id}', 'status')" title="Toggle Status">⏻</button>
                            <button class="icon-action danger" onclick="window.novaProducts.confirmDelete('${p._id}', '${esc(p.name).replace(/'/g, "\\'")}')" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(total, page, limit) {
        const pages = Math.ceil(total / limit);
        const el = document.getElementById('productsPagination');
        if (pages <= 1) { el.innerHTML = ''; return; }

        let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="window.novaProducts.page(${page - 1})">‹</button>`;
        for (let i = 1; i <= pages; i++) {
            html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="window.novaProducts.page(${i})">${i}</button>`;
        }
        html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="window.novaProducts.page(${page + 1})">›</button>`;
        el.innerHTML = html;
    }

    // ============ MODAL: OPEN/CLOSE ============
    function openModal(productId = null) {
        state.currentProductId = productId;
        state.keptImages = [];

        const form = document.getElementById('productForm');
        form.reset();
        document.getElementById('productId').value = productId || '';
        document.getElementById('modalTitle').textContent = productId ? 'Edit Product' : 'Add Product';
        document.getElementById('imagePreview').innerHTML = '';

        if (productId) {
            fetchProductForEdit(productId);
        }

        document.getElementById('productModal').classList.add('active');
    }

    function closeModal() {
        document.getElementById('productModal').classList.remove('active');
        state.currentProductId = null;
        state.keptImages = [];
    }

    async function fetchProductForEdit(id) {
        try {
            const res = await fetch(`${API}/admin/products/${id}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const p = data.product;
            document.getElementById('pName').value = p.name || '';
            document.getElementById('pSku').value = p.sku || '';
            document.getElementById('pShortDesc').value = p.shortDescription || '';
            document.getElementById('pDescription').value = p.description || '';
            document.getElementById('pCategory').value = p.category?._id || p.category || '';
            document.getElementById('pStock').value = p.stock ?? 0;
            document.getElementById('pOriginalPrice').value = p.originalPrice ?? 0;
            document.getElementById('pSalePrice').value = p.salePrice ?? 0;
            document.getElementById('pIsFeatured').value = p.isFeatured ? 'true' : 'false';
            document.getElementById('pStatus').value = p.status || 'active';

            state.keptImages = p.images || [];
            renderImagePreview();
        } catch (err) {
            toast('Failed to load product: ' + err.message, 'error');
        }
    }

    function renderImagePreview() {
        const el = document.getElementById('imagePreview');
        el.innerHTML = state.keptImages.map((url, i) => `
            <div class="preview-wrap">
                <img class="preview-img" src="${esc(url)}" alt="">
                <button type="button" class="preview-remove" onclick="window.novaProducts.removeImage(${i})">✕</button>
            </div>
        `).join('');
    }

    // ============ SUBMIT FORM ============
    async function handleSubmit(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('modalSave');
        const orig = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const fd = new FormData();
            const id = state.currentProductId;

            fd.append('name', document.getElementById('pName').value.trim());
            fd.append('sku', document.getElementById('pSku').value.trim());
            fd.append('shortDescription', document.getElementById('pShortDesc').value.trim());
            fd.append('description', document.getElementById('pDescription').value.trim());
            fd.append('category', document.getElementById('pCategory').value);
            fd.append('stock', document.getElementById('pStock').value);
            fd.append('originalPrice', document.getElementById('pOriginalPrice').value);
            fd.append('salePrice', document.getElementById('pSalePrice').value);
            fd.append('isFeatured', document.getElementById('pIsFeatured').value);
            fd.append('status', document.getElementById('pStatus').value);

            if (id) {
                fd.append('keepImages', state.keptImages.join(','));
            }

            const files = document.getElementById('pImages').files;
            for (const f of files) fd.append('images', f);

            const url = id ? `${API}/admin/products/${id}` : `${API}/admin/products`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: fd
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            toast(id ? 'Product updated ✅' : 'Product created ✅');
            closeModal();
            loadProducts();
        } catch (err) {
            console.error(err);
            toast(err.message || 'Save failed', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = orig;
        }
    }

    // ============ DELETE ============
    function confirmDelete(id, name) {
        state.deleteTargetId = id;
        document.getElementById('deleteProductName').textContent = name;
        document.getElementById('deleteModal').classList.add('active');
    }

    async function doDelete() {
        if (!state.deleteTargetId) return;
        const btn = document.getElementById('deleteConfirm');
        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
            const res = await fetch(`${API}/admin/products/${state.deleteTargetId}`, {
                method: 'DELETE',
                headers: authHeaders(false)
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Product deleted ✅');
            document.getElementById('deleteModal').classList.remove('active');
            state.deleteTargetId = null;
            loadProducts();
        } catch (err) {
            toast(err.message || 'Delete failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Delete';
        }
    }

    // ============ TOGGLE ============
    async function toggle(id, field) {
        try {
            const res = await fetch(`${API}/admin/products/${id}/toggle`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({ field })
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast(field + ' toggled');
            loadProducts();
        } catch (err) {
            toast(err.message || 'Toggle failed', 'error');
        }
    }

    // ============ VIEW INIT ============
    function initView_products() {
        // Bind add button
        const addBtn = document.getElementById('btnAddProduct');
        if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = '1';
            addBtn.addEventListener('click', () => openModal());
        }

        // Modal close
        const closeBtn = document.getElementById('modalClose');
        const cancelBtn = document.getElementById('modalCancel');
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = '1';
            closeBtn.addEventListener('click', closeModal);
        }
        if (cancelBtn && !cancelBtn.dataset.bound) {
            cancelBtn.dataset.bound = '1';
            cancelBtn.addEventListener('click', closeModal);
        }

        // Form submit
        const form = document.getElementById('productForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = '1';
            form.addEventListener('submit', handleSubmit);
        }

        // Filters
        const searchInput = document.getElementById('productSearch');
        const applyBtn = document.getElementById('btnApplyFilters');
        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.status = document.getElementById('productFilterStatus').value;
                state.featured = document.getElementById('productFilterFeatured').value;
                state.page = 1;
                loadProducts();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') applyBtn.click();
            });
        }

        // Delete modal
        const delCancel = document.getElementById('deleteCancel');
        const delConfirm = document.getElementById('deleteConfirm');
        if (delCancel && !delCancel.dataset.bound) {
            delCancel.dataset.bound = '1';
            delCancel.addEventListener('click', () => {
                document.getElementById('deleteModal').classList.remove('active');
                state.deleteTargetId = null;
            });
        }
        if (delConfirm && !delConfirm.dataset.bound) {
            delConfirm.dataset.bound = '1';
            delConfirm.addEventListener('click', doDelete);
        }

        loadProducts();
    }

    // ============ EXPOSE ============
    window.novaProducts = {
        edit: openModal,
        confirmDelete,
        page: (p) => { state.page = p; loadProducts(); },
        toggle,
        removeImage: (i) => {
            state.keptImages.splice(i, 1);
            renderImagePreview();
        }
    };

    window.initView_products = initView_products;
})();
