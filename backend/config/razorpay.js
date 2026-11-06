const Razorpay = require('razorpay');
const crypto = require('crypto');

const PAYMENT_MODE = (process.env.PAYMENT_MODE || 'mock').toLowerCase();

let razorpayInstance = null;
if (PAYMENT_MODE === 'live') {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ PAYMENT_MODE=live but Razorpay keys missing in .env');
        process.exit(1);
    }
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('💳 Razorpay LIVE mode initialized');
} else {
    console.log('🧪 Payment MOCK mode active (no real charges)');
}

async function createRazorpayOrder({ amount, currency = 'INR', receipt }) {
    if (PAYMENT_MODE === 'live') {
        return razorpayInstance.orders.create({
            amount: Math.round(amount * 100),
            currency,
            receipt
        });
    }

    return {
        id: 'order_MOCK_' + crypto.randomBytes(10).toString('hex'),
        amount: Math.round(amount * 100),
        currency,
        receipt,
        status: 'created',
        mock: true
    };
}

function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (PAYMENT_MODE === 'live') {
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');
        return expected === razorpaySignature;
    }

    return typeof razorpaySignature === 'string' &&
           razorpaySignature.startsWith('MOCK_SIG_');
}

function verifyWebhookSignature(rawBody, signature) {
    if (PAYMENT_MODE === 'live') {
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');
        return expected === signature;
    }
    return true;
}

module.exports = {
    razorpayInstance,
    createRazorpayOrder,
    verifyRazorpaySignature,
    verifyWebhookSignature,
    PAYMENT_MODE
};
