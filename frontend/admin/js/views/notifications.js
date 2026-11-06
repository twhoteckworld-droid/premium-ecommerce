/**
 * NOVASTORE ADMIN - NOTIFICATIONS (Bell + Dropdown)
 */
(function () {
    'use strict';

    const API = window.location.origin + '/api';
    let pollInterval = null;
    let isOpen = false;

    function getToken() { return localStorage.getItem('novaAdminToken'); }
    function authHeaders() {
        return { 'Authorization': 'Bearer ' + getToken() };
    }
    function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    function timeAgo(d) {
        const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
        if (sec < 60) return 'just now';
        if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
        if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
        if (sec < 604800) return Math.floor(sec / 86400) + 'd ago';
        return new Date(d).toLocaleDateString('en-IN');
    }

    const ICONS = {
        new_order: '🛒',
        low_stock: '⚠️',
        out_of_stock: '❌',
        new_customer: '👤',
        payment_failed: '💳',
        order_cancelled: '🚫'
    };

    async function loadUnreadCount() {
        try {
            const res = await fetch(`${API}/admin/notifications/unread-count`, { headers: authHeaders() });
            const data = await res.json();
            if (!data.success) return;

            const badge = document.getElementById('notifBadge');
            if (!badge) return;
            if (data.unreadCount > 0) {
                badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        } catch (e) { /* silent */ }
    }

    async function loadNotifications() {
        const list = document.getElementById('notifList');
        if (!list) return;
        list.innerHTML = '<p class="loading-text" style="padding:20px;">Loading...</p>';

        try {
            const res = await fetch(`${API}/admin/notifications?limit=20`, { headers: authHeaders() });
            const data = await res.json();
            if (!data.success) {
                list.innerHTML = '<p class="notif-empty">Error loading</p>';
                return;
            }

            if (!data.notifications.length) {
                list.innerHTML = '<p class="notif-empty">No notifications yet</p>';
                return;
            }

            list.innerHTML = data.notifications.map(n => `
                <div class="notif-item ${n.read ? '' : 'unread'}" onclick="window.novaNotifications.markRead('${n._id}', '${n.link || ''}')">
                    <div class="notif-icon-circle notif-icon-${n.type}">${ICONS[n.type] || '🔔'}</div>
                    <div class="notif-content">
                        <strong>${esc(n.title)}</strong>
                        <p>${esc(n.message)}</p>
                        <span class="notif-time">${timeAgo(n.createdAt)}</span>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            list.innerHTML = '<p class="notif-empty">Failed to load</p>';
        }
    }

    function toggleDropdown() {
        const dropdown = document.getElementById('notifDropdown');
        if (!dropdown) return;
        isOpen = !isOpen;
        dropdown.classList.toggle('active', isOpen);
        if (isOpen) loadNotifications();
    }

    function closeDropdown() {
        const dropdown = document.getElementById('notifDropdown');
        if (dropdown) dropdown.classList.remove('active');
        isOpen = false;
    }

    async function markRead(id, link) {
        try {
            await fetch(`${API}/admin/notifications/${id}/read`, {
                method: 'PATCH',
                headers: authHeaders()
            });
            loadUnreadCount();
            // Navigate if link provided
            if (link) {
                window.location.href = link;
            } else {
                loadNotifications();
            }
        } catch (e) { /* silent */ }
    }

    async function markAllRead() {
        try {
            await fetch(`${API}/admin/notifications/read-all`, {
                method: 'PATCH',
                headers: authHeaders()
            });
            loadUnreadCount();
            loadNotifications();
        } catch (e) { /* silent */ }
    }

    function initNotifications() {
        const bell = document.getElementById('notifBell');
        const markAllBtn = document.getElementById('notifMarkAllRead');

        if (bell && !bell.dataset.bound) {
            bell.dataset.bound = '1';
            bell.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown();
            });
        }

        if (markAllBtn && !markAllBtn.dataset.bound) {
            markAllBtn.dataset.bound = '1';
            markAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markAllRead();
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#notifBell') && !e.target.closest('#notifDropdown')) {
                closeDropdown();
            }
        });

        // Initial load
        loadUnreadCount();

        // Poll every 30s
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(loadUnreadCount, 30000);
    }

    window.novaNotifications = { markRead, markAllRead };

    document.addEventListener('DOMContentLoaded', initNotifications);
})();
