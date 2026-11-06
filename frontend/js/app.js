const API_URL = 'http://127.0.0.1:5000/api';

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('novaCart')) || [];
let checkoutProducts = [];
let isSubmittingOrder = false;

// ===================== TOAST =====================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ===================== HELPERS =====================
function formatPrice(price) {
    return '₹' + Number(price).toLocaleString('en-IN');
}

function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

// ===================== FETCH PRODUCTS =====================
async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    const featured = document.getElementById('featuredProducts');

    try {
        const response = await fetch(`${API_URL}/products?limit=50`);

        if (!response.ok) {
            throw new Error('Unable to load products');
        }

        const data = await response.json();

        allProducts = data.products || [];

        renderProducts(allProducts);
        renderFeatured(allProducts.filter(p => p.isFeatured));

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p class="loading">Products load nahi ho paye. Backend server check karo.</p>';
        featured.innerHTML = '<p class="loading">Featured products unavailable.</p>';
    }
}

// ===================== PRODUCT CARD =====================
function productCard(product) {
    const image = product.images && product.images.length
        ? product.images[0]
        : 'https://placehold.co/600x600?text=Product';

    return `
    <article class="product-card">
        <div class="product-image">
            <img src="${escapeHTML(image)}"
                 alt="${escapeHTML(product.name)}"
                 loading="lazy"
                 onerror="this.src='https://placehold.co/600x600?text=Product'">
        </div>
        <div class="product-info">
            <h3>${escapeHTML(product.name)}</h3>
            <p>${escapeHTML(product.shortDescription || 'Premium quality product')}</p>
            <div class="price">
                <span class="sale-price">${formatPrice(product.salePrice)}</span>
                <span class="original-price">${formatPrice(product.originalPrice)}</span>
            </div>
            <div class="product-buttons">
                <button class="add-cart"
                    data-action="add"
                    data-id="${product._id}">
                    Add to Cart
                </button>
                <button class="buy-now"
                    data-action="buy"
                    data-id="${product._id}">
                    Buy Now
                </button>
            </div>
        </div>
    </article>
    `;
}

// ===================== RENDER =====================
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!products.length) {
        grid.innerHTML = '<p class="loading">No products found.</p>';
        return;
    }
    grid.innerHTML = products.map(productCard).join('');
}

function renderFeatured(products) {
    const featured = document.getElementById('featuredProducts');
    if (!products.length) {
        featured.innerHTML = '<p class="loading">No featured products available.</p>';
        return;
    }
    featured.innerHTML = products.map(productCard).join('');
}

// ===================== SEARCH =====================
function searchProducts() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const filtered = allProducts.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.description || '').toLowerCase().includes(query)
    );
    renderProducts(filtered);
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ===================== CATEGORY FILTER =====================
function filterCategory(category) {
    const filtered = allProducts.filter(product =>
        product.category?.slug?.toLowerCase() === category.toLowerCase()
    );
    renderProducts(filtered);
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ===================== CART =====================
function addToCart(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        showToast('Product is out of stock');
        return;
    }

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        if (existing.quantity >= product.stock) {
            showToast('Available stock limit reached');
            return;
        }
        existing.quantity++;
    } else {
        cart.push({
            productId: product._id,
            name: product.name,
            price: product.salePrice,
            image: product.images?.[0] || '',
            quantity: 1
        });
    }

    saveCart();
    highlightCart();
    showToast('✓ Added to Cart Successfully!');
}

function saveCart() {
    localStorage.setItem('novaCart', JSON.stringify(cart));
    updateCart();
}

function updateCart() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
    document.getElementById('cartTotal').textContent =
        formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));

    const container = document.getElementById('cartItems');
    if (!cart.length) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div>
                <strong>${escapeHTML(item.name)}</strong>
                <p>${formatPrice(item.price)} × ${item.quantity}</p>
            </div>
            <button data-remove="${index}">Remove</button>
        </div>
    `).join('');
}

// ===================== CART DRAWER =====================
function openCart() {
    document.getElementById('cartOverlay').classList.add('active');
}
function closeCart() {
    document.getElementById('cartOverlay').classList.remove('active');
}

// ===================== CHECKOUT =====================
function openCheckout(products) {
    checkoutProducts = products.map(item => ({ ...item }));

    const summary = document.getElementById('checkoutItems');
    const total = checkoutProducts.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    summary.innerHTML = checkoutProducts.map(item => `
        <p>${escapeHTML(item.name)} × ${item.quantity}
        — ${formatPrice(item.price * item.quantity)}</p>
    `).join('');

    document.getElementById('checkoutTotal').textContent = formatPrice(total);
    document.getElementById('cartOverlay').classList.remove('active');
    document.getElementById('checkoutOverlay').classList.add('active');
}

function buyNow(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        showToast('Product is out of stock');
        return;
    }

    openCheckout([{
        productId: product._id,
        name: product.name,
        price: product.salePrice,
        quantity: 1
    }]);
}

// ===================== SUBMIT ORDER =====================
async function submitOrder(event) {
    event.preventDefault();

    if (isSubmittingOrder) {
        return; // prevent double-click
    }

    if (!checkoutProducts.length) {
        showToast('No products selected');
        return;
    }

    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const city = document.getElementById('customerCity').value.trim();
    const pincode = document.getElementById('customerPincode').value.trim();

    // Client-side quick validation (backend still validates)
    if (!name || !phone || !address || !city || !pincode) {
        showToast('Please fill all required fields');
        return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
        showToast('Please enter a valid 10-digit mobile number');
        return;
    }

    if (!/^[1-9]\d{5}$/.test(pincode)) {
        showToast('Please enter a valid 6-digit PIN code');
        return;
    }

    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const originalText = placeOrderBtn.textContent;

    isSubmittingOrder = true;
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing order...';

    try {
        const payload = {
            customerDetails: { name, phone, address, city, pincode },
            items: checkoutProducts.map(item => ({
                productId: item.productId,
                quantity: item.quantity
            }))
        };

        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Order failed');
        }

        // Success
        showOrderSuccess(data.order);

        // Clear cart items that were ordered
        const orderedProductIds = new Set(checkoutProducts.map(p => p.productId));
        cart = cart.filter(item => !orderedProductIds.has(item.productId));
        saveCart();
        checkoutProducts = [];

        // Reset form
        document.getElementById('checkoutForm').reset();

        // Close checkout modal
        document.getElementById('checkoutOverlay').classList.remove('active');

    } catch (error) {
        console.error('Order error:', error);

        let message = 'Order failed. Please try again.';
        if (error.message.includes('stock')) {
            message = 'Some products are out of stock. Please refresh and try again.';
        } else if (error.message.includes('unavailable')) {
            message = 'Some products are unavailable. Please refresh.';
        } else if (error.message) {
            message = error.message;
        }

        showToast(message);
    } finally {
        isSubmittingOrder = false;
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = originalText;
    }
}

// ===================== SUCCESS MODAL =====================
function showOrderSuccess(order) {
    document.getElementById('successOrderNumber').textContent = order.orderNumber || '—';
    document.getElementById('successOrderTotal').textContent = formatPrice(order.total);
    document.getElementById('successOrderStatus').textContent = order.orderStatus || '—';
    document.getElementById('orderSuccessOverlay').classList.add('active');
}

function closeSuccessModal() {
    document.getElementById('orderSuccessOverlay').classList.remove('active');
}

// ===================== CART ANIMATION =====================
function highlightCart() {
    const button = document.getElementById('cartBtn');
    const badge = document.getElementById('cartCount');
    if (!button || !badge) return;

    button.classList.remove('cart-bump');
    badge.classList.remove('cart-badge-pop');
    void button.offsetWidth;
    button.classList.add('cart-bump');
    badge.classList.add('cart-badge-pop');

    setTimeout(() => {
        button.classList.remove('cart-bump');
        badge.classList.remove('cart-badge-pop');
    }, 700);
}

// ===================== EVENT LISTENERS =====================
document.getElementById('searchBtn').addEventListener('click', searchProducts);

document.getElementById('searchInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') searchProducts();
});

document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);

document.getElementById('cartOverlay').addEventListener('click', event => {
    if (event.target.id === 'cartOverlay') closeCart();
});

document.getElementById('productGrid').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'add') addToCart(id);
    if (button.dataset.action === 'buy') buyNow(id);
});

document.getElementById('featuredProducts').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'add') addToCart(id);
    if (button.dataset.action === 'buy') buyNow(id);
});

document.getElementById('cartItems').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    cart.splice(Number(button.dataset.remove), 1);
    saveCart();
});

document.querySelectorAll('.category-item').forEach(button => {
    button.addEventListener('click', () => {
        filterCategory(button.dataset.category);
    });
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!cart.length) {
        showToast('Your cart is empty');
        return;
    }
    openCheckout(cart);
});

document.getElementById('closeCheckout').addEventListener('click', () => {
    document.getElementById('checkoutOverlay').classList.remove('active');
});

document.getElementById('checkoutOverlay').addEventListener('click', event => {
    if (event.target.id === 'checkoutOverlay') {
        event.currentTarget.classList.remove('active');
    }
});

// MAIN SUBMIT HANDLER
document.getElementById('checkoutForm').addEventListener('submit', submitOrder);

document.getElementById('closeSuccessBtn').addEventListener('click', closeSuccessModal);

document.getElementById('newsletterForm').addEventListener('submit', event => {
    event.preventDefault();
    showToast('Newsletter service will be connected later');
    event.target.reset();
});

// ===================== INIT =====================
updateCart();
fetchProducts();

// ===================== PAYMENT INTEGRATION =====================

let currentPaymentOrder = null;

function setupPaymentFlow(orderData) {
    currentPaymentOrder = orderData;
    const successBtn = document.getElementById('closeSuccessBtn');
    successBtn.textContent = 'Pay Now →';
    successBtn.style.background = '#10b981'; 
    
    successBtn.replaceWith(successBtn.cloneNode(true));
    
    document.getElementById('closeSuccessBtn').addEventListener('click', () => {
        document.getElementById('orderSuccessOverlay').classList.remove('active');
        openPaymentModal(orderData);
    });
}

function openPaymentModal(orderData) {
    document.getElementById('payOrderNumber').textContent = orderData.orderNumber;
    document.getElementById('payAmount').textContent = formatPrice(orderData.total);
    document.getElementById('paymentOverlay').classList.add('active');
}

document.getElementById('btnPayMock')?.addEventListener('click', async () => {
    if (!currentPaymentOrder) return;
    
    const btn = document.getElementById('btnPayMock');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const resOrder = await fetch(`${API_URL}/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: currentPaymentOrder.id })
        });
        const dataOrder = await resOrder.json();
        
        if (!dataOrder.success) throw new Error(dataOrder.message);

        const mockPaymentId = 'pay_MOCK_' + Date.now();
        const mockSignature = 'MOCK_SIG_' + Date.now();

        const resVerify = await fetch(`${API_URL}/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpayOrderId: dataOrder.payment.razorpayOrderId,
                razorpayPaymentId: mockPaymentId,
                razorpaySignature: mockSignature
            })
        });
        const dataVerify = await resVerify.json();

        if (!dataVerify.success) throw new Error(dataVerify.message);

        document.getElementById('paymentOverlay').classList.remove('active');
        showToast('✅ Payment Successful! Order Confirmed.');
        
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '💳 Pay Now (Simulate)';
            const succBtn = document.getElementById('closeSuccessBtn');
            succBtn.textContent = 'Continue Shopping';
            succBtn.style.background = 'var(--blue)';
            succBtn.onclick = () => { document.getElementById('orderSuccessOverlay').classList.remove('active'); };
        }, 3000);

    } catch (err) {
        showToast('❌ Payment Failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = '💳 Pay Now (Simulate)';
    }
});

document.getElementById('closePayment')?.addEventListener('click', () => {
    document.getElementById('paymentOverlay').classList.remove('active');
});

// ===================== CUSTOMER AUTH DETECTION =====================

(function() {
    const customerToken = localStorage.getItem('novaCustomerToken');
    const customerUser = JSON.parse(localStorage.getItem('novaCustomerUser') || 'null');
    const accountBtn = document.getElementById('accountBtn');

    if (customerToken && customerUser) {
        if (accountBtn) {
            accountBtn.innerHTML = '👤 ' + customerUser.name.split(' ')[0];
            accountBtn.href = '/account.html';
        }
    }

    // Auto-fill checkout if logged in
    if (customerUser) {
        const fillCheckout = () => {
            const nameEl = document.getElementById('customerName');
            const phoneEl = document.getElementById('customerPhone');
            if (nameEl && !nameEl.value) nameEl.value = customerUser.name || '';
            if (phoneEl && !phoneEl.value) phoneEl.value = customerUser.phone || '';
        };
        // Fill when checkout opens
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => setTimeout(fillCheckout, 100));
    }
})();
