/**
 * NOVASTORE ADMIN - SETTINGS VIEW
 */
(function () {
    'use strict';

    const API = window.location.origin + '/api';

    function getToken() { return localStorage.getItem('novaAdminToken'); }
    function authHeaders(json = true) {
        const h = { 'Authorization': 'Bearer ' + getToken() };
        if (json) h['Content-Type'] = 'application/json';
        return h;
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

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!value;
        else el.value = value ?? '';
    }

    function getVal(id) {
        const el = document.getElementById(id);
        if (!el) return undefined;
        if (el.type === 'checkbox') return el.checked;
        return el.value.trim();
    }

    async function loadSettings() {
        try {
            const res = await fetch(`${API}/admin/settings`, { headers: authHeaders(false) });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const s = data.settings;
            setVal('setStoreName', s.storeName);
            setVal('setStoreEmail', s.storeEmail);
            setVal('setStorePhone', s.storePhone);
            setVal('setStoreLogo', s.storeLogo);
            setVal('setStoreAddress', s.storeAddress);
            setVal('setCurrency', s.currency || 'INR');
            setVal('setCurrencySymbol', s.currencySymbol || '₹');
            setVal('setFreeThreshold', s.shipping?.freeShippingThreshold ?? 999);
            setVal('setShippingFee', s.shipping?.shippingFee ?? 49);
            setVal('setTaxEnabled', s.tax?.enabled);
            setVal('setTaxRate', s.tax?.rate ?? 0);
            setVal('setTaxInclusive', s.tax?.inclusive);
            setVal('setNotifyNewOrder', s.notifications?.newOrder ?? true);
            setVal('setNotifyLowStock', s.notifications?.lowStock ?? true);
            setVal('setNotifyNewCustomer', s.notifications?.newCustomer ?? false);
            setVal('setSocialInstagram', s.social?.instagram);
            setVal('setSocialFacebook', s.social?.facebook);
            setVal('setSocialTwitter', s.social?.twitter);
            setVal('setSocialYoutube', s.social?.youtube);
        } catch (err) {
            toast('Failed to load: ' + err.message, 'error');
        }
    }

    async function saveSettings() {
        const btn = document.getElementById('btnSaveSettings');
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const payload = {
                storeName: getVal('setStoreName'),
                storeEmail: getVal('setStoreEmail') || '',
                storePhone: getVal('setStorePhone') || '',
                storeLogo: getVal('setStoreLogo') || '',
                storeAddress: getVal('setStoreAddress') || '',
                currency: getVal('setCurrency'),
                currencySymbol: getVal('setCurrencySymbol'),
                shipping: {
                    freeShippingThreshold: Number(getVal('setFreeThreshold')),
                    shippingFee: Number(getVal('setShippingFee'))
                },
                tax: {
                    enabled: getVal('setTaxEnabled'),
                    rate: Number(getVal('setTaxRate')),
                    inclusive: getVal('setTaxInclusive')
                },
                notifications: {
                    newOrder: getVal('setNotifyNewOrder'),
                    lowStock: getVal('setNotifyLowStock'),
                    newCustomer: getVal('setNotifyNewCustomer')
                },
                social: {
                    instagram: getVal('setSocialInstagram') || '',
                    facebook: getVal('setSocialFacebook') || '',
                    twitter: getVal('setSocialTwitter') || '',
                    youtube: getVal('setSocialYoutube') || ''
                }
            };

            const res = await fetch(`${API}/admin/settings`, {
                method: 'PUT',
                headers: authHeaders(true),
                body: JSON.stringify(payload)
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Settings saved ✅');
        } catch (err) {
            toast(err.message || 'Save failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = orig;
        }
    }

    async function changePassword() {
        const current = document.getElementById('setCurrentPass').value;
        const newPass = document.getElementById('setNewPass').value;
        const confirm = document.getElementById('setConfirmPass').value;

        if (!current || !newPass) {
            toast('All password fields required', 'error');
            return;
        }
        if (newPass.length < 8) {
            toast('New password must be 8+ characters', 'error');
            return;
        }
        if (newPass !== confirm) {
            toast('Passwords do not match', 'error');
            return;
        }

        const btn = document.getElementById('btnChangePassword');
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Changing...';

        try {
            const res = await fetch(`${API}/admin/auth/change-password`, {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({ currentPassword: current, newPassword: newPass })
            });
            if (handle401(res)) return;
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast('Password changed ✅');
            document.getElementById('setCurrentPass').value = '';
            document.getElementById('setNewPass').value = '';
            document.getElementById('setConfirmPass').value = '';
        } catch (err) {
            toast(err.message || 'Password change failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = orig;
        }
    }

    function initView_settings() {
        const saveBtn = document.getElementById('btnSaveSettings');
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = '1';
            saveBtn.addEventListener('click', saveSettings);
        }

        const passBtn = document.getElementById('btnChangePassword');
        if (passBtn && !passBtn.dataset.bound) {
            passBtn.dataset.bound = '1';
            passBtn.addEventListener('click', changePassword);
        }

        loadSettings();
    }

    window.initView_settings = initView_settings;
})();
