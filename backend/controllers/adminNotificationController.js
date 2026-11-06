const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// ============ LIST ============
exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;
        const filter = {};
        if (unreadOnly === 'true') filter.read = false;

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).limit(safeLimit).skip((safePage - 1) * safeLimit).lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ read: false })
        ]);

        res.status(200).json({ success: true, total, unreadCount, page: safePage, notifications });
    } catch (error) {
        console.error('List notifications error:', error);
        res.status(500).json({ success: false, message: 'Unable to load notifications' });
    }
};

// ============ UNREAD COUNT (for bell badge) ============
exports.unreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ read: false });
        res.status(200).json({ success: true, unreadCount: count });
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ success: false, message: 'Unable to load count' });
    }
};

// ============ MARK ONE AS READ ============
exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }
        const notif = await Notification.findById(id);
        if (!notif) return res.status(404).json({ success: false, message: 'Not found' });

        notif.read = true;
        notif.readAt = new Date();
        await notif.save();

        res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, message: 'Unable to mark read' });
    }
};

// ============ MARK ALL AS READ ============
exports.markAllRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { read: false },
            { $set: { read: true, readAt: new Date() } }
        );
        res.status(200).json({ success: true, message: 'All marked as read', modified: result.modifiedCount });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ success: false, message: 'Unable to mark all read' });
    }
};

// ============ DELETE ============
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }
        await Notification.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Unable to delete' });
    }
};

// ============ CLEAR ALL ============
exports.clearAll = async (req, res) => {
    try {
        const result = await Notification.deleteMany({});
        res.status(200).json({ success: true, message: 'All cleared', deleted: result.deletedCount });
    } catch (error) {
        console.error('Clear all error:', error);
        res.status(500).json({ success: false, message: 'Unable to clear' });
    }
};
