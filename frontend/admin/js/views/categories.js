/**
 * NOVASTORE ADMIN - CATEGORIES VIEW
 */

(function () {
    'use strict';

    const API = window.location.origin + '/api';
    const state = {
        search: '',
        status: '',
        currentCategoryId: null,
        deleteTargetId: null,
        currentImage: null
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

    // ============ LOAD ============
    async function loadCategories() {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Loading...</td></tr>';

        try {
            const params = new URLSearchParams();
            if (state.search) params.set('search', state.search);
            if (state.status) params.set('status', state.status);

            const res = await fetch(`${API}/admin/categories?${params}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            renderCategories(data.categories);
            document.getElementById('categoriesCount').textContent =
                `Total: ${data.total} categor${data.total === 1 ? 'y' : 'ies'}`;
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" class="table-loading" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
        }
    }

    function renderCategories(categories) {
        const tbody = document.getElementById('categoriesTableBody');
        if (!categories.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="table-loading">No categories yet. Click "+ Add Category".</td></tr>';
            return;
        }

        tbody.innerHTML = categories.map(c => {
            const img = c.image
                ? `<img class="category-thumb" src="${esc(c.image)}" alt="">`
                : `<div class="category-thumb-placeholder">🗂️</div>`;

            const countBadge = c.productCount > 0
                ? `<span class="product-count-badge">${c.productCount} product${c.productCount > 1 ? 's' : ''}</span>`
                : `<span style="color:var(--muted);font-size:12px;">0 products</span>`;

            return `
                <tr>
                    <td>
                        <div class="category-cell">
                            ${img}
                            <div class="category-info-cell">
                                <strong>${esc(c.name)}</strong>
                                <span>${esc(c.description || 'No description')}</span>
                            </div>
                        </div>
                    </td>
                    <td>${esc(c.slug)}</td>
                    <td>${countBadge}</td>
                    <td>
                        <span class="badge ${c.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                            ${c.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="icon-action" onclick="window.novaCategories.edit('${c._id}')" title="Edit">✏️</button>
                            <button class="icon-action" onclick="window.novaCategories.toggle('${c._id}')" title="Toggle Status">⏻</button>
                            <button class="icon-action danger" onclick="window.novaCategories.confirmDelete('${c._id}', '${esc(c.name).replace(/'/g, "\\'")}')" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============ MODAL ============
    function openModal(categoryId = null) {
        state.currentCategoryId = categoryId;
        state.currentImage = null;

        const form = document.getElementById('categoryForm');
        form.reset();
        document.getElementById('categoryId').value = categoryId || '';
        document.getElementById('categoryModalTitle').textContent = categoryId ? 'Edit Category' : 'Add Category';
        document.getElementById('categoryImagePreview').innerHTML = '';

        if (categoryId) {
            fetchCategoryForEdit(categoryId);
        }

        document.getElementById('categoryModal').classList.add('active');
    }

    function closeModal() {
        document.getElementById('categoryModal').classList.remove('active');
        state.currentCategoryId = null;
        state.currentImage = null;
    }

    async function fetchCategoryForEdit(id) {
        try {
            const res = await fetch(`${API}/admin/categories/${id}`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const c = data.category;
            document.getElementById('cName').value = c.name || '';
            document.getElementById('cDescription').value = c.description || '';
            document.getElementById('cStatus').value = c.status || 'active';

            state.currentImage = c.image || null;
            renderImagePreview();
        } catch (err) {
            toast('Failed to load: ' + err.message, 'error');
        }
    }

    function renderImagePreview() {
        const el = document.getElementById('categoryImagePreview');
        if (!state.currentImage) {
            el.innerHTML = '';
            return;
        }
        el.innerHTML = `
            <div class="preview-wrap">
                <img class="preview-img" src="${esc(state.currentImage)}" alt="">
                <button type="button" class="preview-remove" onclick="window.novaCategories.removeImage()">✕</button>
            </div>
        `;
    }

    // ============ SUBMIT ============
    async function handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('categoryModalSave');
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const fd = new FormData();
            const id = state.currentCategoryId;
            fd.append('name', document.getElementById('cName').value.trim());
            fd.append('description', document.getElementById('cDescription').value.trim());
            fd.append('status', document.getElementById('cStatus').value);

            const file = document.getElementById('cImage').files[0];
            if (file) fd.append('image', file);

            if (id && !state.currentImage) {
                fd.append('keepImage', 'false');
            }

            const url = id ? `${API}/admin/categories/${id}` : `${API}/admin/categories`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: fd
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            toast(id ? 'Category updated ✅' : 'Category created ✅');
            closeModal();
            loadCategories();
        } catch (err) {
            toast(err.message || 'Save failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = orig;
        }
    }

    // ============ DELETE ============
    function confirmDelete(id, name) {
        state.deleteTargetId = id;
        document.getElementById('deleteCategoryName').textContent = name;
        document.getElementById('deleteCategoryModal').classList.add('active');
    }

    async function doDelete() {
        if (!state.deleteTargetId) return;
        const btn = document.getElementById('deleteCategoryConfirm');
        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
            const res = await fetch(`${API}/admin/categories/${state.deleteTargetId}`, {
                method: 'DELETE',
                headers: authHeaders(false)
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Category deleted ✅');
            document.getElementById('deleteCategoryModal').classList.remove('active');
            state.deleteTargetId = null;
            loadCategories();
        } catch (err) {
            toast(err.message || 'Delete failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Delete';
        }
    }

    // ============ TOGGLE ============
    async function toggle(id) {
        try {
            const res = await fetch(`${API}/admin/categories/${id}/toggle`, {
                method: 'PATCH',
                headers: authHeaders(true),
                body: JSON.stringify({})
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Status toggled');
            loadCategories();
        } catch (err) {
            toast(err.message || 'Toggle failed', 'error');
        }
    }

    // ============ INIT ============
    function initView_categories() {
        const addBtn = document.getElementById('btnAddCategory');
        if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = '1';
            addBtn.addEventListener('click', () => openModal());
        }

        const closeBtn = document.getElementById('categoryModalClose');
        const cancelBtn = document.getElementById('categoryModalCancel');
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = '1';
            closeBtn.addEventListener('click', closeModal);
        }
        if (cancelBtn && !cancelBtn.dataset.bound) {
            cancelBtn.dataset.bound = '1';
            cancelBtn.addEventListener('click', closeModal);
        }

        const form = document.getElementById('categoryForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = '1';
            form.addEventListener('submit', handleSubmit);
        }

        const searchInput = document.getElementById('categorySearch');
        const applyBtn = document.getElementById('btnApplyCategoryFilters');
        if (applyBtn && !applyBtn.dataset.bound) {
            applyBtn.dataset.bound = '1';
            applyBtn.addEventListener('click', () => {
                state.search = searchInput.value.trim();
                state.status = document.getElementById('categoryFilterStatus').value;
                loadCategories();
            });
        }
        if (searchInput && !searchInput.dataset.enterBound) {
            searchInput.dataset.enterBound = '1';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyBtn.click(); });
        }

        const delCancel = document.getElementById('deleteCategoryCancel');
        const delConfirm = document.getElementById('deleteCategoryConfirm');
        if (delCancel && !delCancel.dataset.bound) {
            delCancel.dataset.bound = '1';
            delCancel.addEventListener('click', () => {
                document.getElementById('deleteCategoryModal').classList.remove('active');
                state.deleteTargetId = null;
            });
        }
        if (delConfirm && !delConfirm.dataset.bound) {
            delConfirm.dataset.bound = '1';
            delConfirm.addEventListener('click', doDelete);
        }

        loadCategories();
    }

    window.novaCategories = {
        edit: openModal,
        confirmDelete,
        toggle,
        removeImage: () => { state.currentImage = null; renderImagePreview(); }
    };

    window.initView_categories = initView_categories;
})();
