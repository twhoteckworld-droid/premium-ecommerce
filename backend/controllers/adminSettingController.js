const Setting = require('../models/Setting');

// Get or create default settings
async function getSettingsDoc() {
    let doc = await Setting.findOne({ key: 'store' });
    if (!doc) {
        doc = await Setting.create({ key: 'store' });
    }
    return doc;
}

// ============ GET SETTINGS (admin) ============
exports.get = async (req, res) => {
    try {
        const doc = await getSettingsDoc();
        res.status(200).json({ success: true, settings: doc });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Unable to load settings' });
    }
};

// ============ UPDATE SETTINGS ============
exports.update = async (req, res) => {
    try {
        const doc = await getSettingsDoc();
        const {
            storeName, storeLogo, storeEmail, storePhone, storeAddress,
            currency, currencySymbol,
            shipping, tax, notifications, social
        } = req.body;

        // Basic validation
        if (storeName !== undefined) {
            if (typeof storeName !== 'string' || !storeName.trim() || storeName.length > 80) {
                return res.status(400).json({ success: false, message: 'Invalid store name' });
            }
            doc.storeName = storeName.trim();
        }

        if (storeEmail !== undefined) {
            if (storeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeEmail)) {
                return res.status(400).json({ success: false, message: 'Invalid email' });
            }
            doc.storeEmail = storeEmail ? storeEmail.trim().toLowerCase() : undefined;
        }

        if (storeLogo !== undefined) doc.storeLogo = storeLogo || undefined;
        if (storePhone !== undefined) doc.storePhone = storePhone ? String(storePhone).trim() : undefined;
        if (storeAddress !== undefined) doc.storeAddress = storeAddress ? String(storeAddress).trim() : undefined;

        if (currency !== undefined) {
            if (!['INR', 'USD', 'EUR', 'GBP'].includes(currency)) {
                return res.status(400).json({ success: false, message: 'Invalid currency' });
            }
            doc.currency = currency;
        }
        if (currencySymbol !== undefined) doc.currencySymbol = String(currencySymbol).slice(0, 3);

        // Shipping
        if (shipping) {
            if (shipping.freeShippingThreshold !== undefined) {
                const v = Number(shipping.freeShippingThreshold);
                if (isNaN(v) || v < 0) return res.status(400).json({ success: false, message: 'Invalid threshold' });
                doc.shipping.freeShippingThreshold = v;
            }
            if (shipping.shippingFee !== undefined) {
                const v = Number(shipping.shippingFee);
                if (isNaN(v) || v < 0) return res.status(400).json({ success: false, message: 'Invalid shipping fee' });
                doc.shipping.shippingFee = v;
            }
        }

        // Tax
        if (tax) {
            if (tax.enabled !== undefined) doc.tax.enabled = !!tax.enabled;
            if (tax.rate !== undefined) {
                const v = Number(tax.rate);
                if (isNaN(v) || v < 0 || v > 100) return res.status(400).json({ success: false, message: 'Tax rate 0-100' });
                doc.tax.rate = v;
            }
            if (tax.inclusive !== undefined) doc.tax.inclusive = !!tax.inclusive;
        }

        // Notifications
        if (notifications) {
            if (notifications.newOrder !== undefined) doc.notifications.newOrder = !!notifications.newOrder;
            if (notifications.lowStock !== undefined) doc.notifications.lowStock = !!notifications.lowStock;
            if (notifications.newCustomer !== undefined) doc.notifications.newCustomer = !!notifications.newCustomer;
        }

        // Social
        if (social) {
            ['facebook', 'instagram', 'twitter', 'youtube'].forEach(k => {
                if (social[k] !== undefined) doc.social[k] = social[k] ? String(social[k]).trim() : undefined;
            });
        }

        await doc.save();
        res.status(200).json({ success: true, message: 'Settings updated', settings: doc });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Unable to update settings' });
    }
};

// ============ PUBLIC GET (no auth, for storefront) ============
exports.publicGet = async (req, res) => {
    try {
        const doc = await getSettingsDoc();
        // Only expose safe fields
        res.status(200).json({
            success: true,
            settings: {
                storeName: doc.storeName,
                storeLogo: doc.storeLogo,
                storeEmail: doc.storeEmail,
                storePhone: doc.storePhone,
                storeAddress: doc.storeAddress,
                currency: doc.currency,
                currencySymbol: doc.currencySymbol,
                shipping: doc.shipping,
                social: doc.social
            }
        });
    } catch (error) {
        console.error('Public settings error:', error);
        res.status(500).json({ success: false, message: 'Unable to load settings' });
    }
};
