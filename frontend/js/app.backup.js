const API_URL = 'http://127.0.0.1:5000/api';

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('novaCart')) || [];

// Toast notification
function showToast(message) {
const toast = document.getElementById('toast');
toast.textContent = message;
toast.classList.add('show');

setTimeout(() => {
    toast.classList.remove('show');
}, 2500);

}

// Format price
function formatPrice(price) {
return '₹' + Number(price).toLocaleString('en-IN');
}

// Fetch products from MongoDB API
async function fetchProducts() {
const grid = document.getElementById('productGrid');
const featured = document.getElementById('featuredProducts');

try {
    const response = await fetch(`${API_URL}/products`);

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

// Product card HTML
function productCard(product) {
const image = product.images && product.images.length
? product.images[0]
: 'https://placehold.co/600x600?text=Product';

return `
    <article class="product-card">

        <div class="product-image">
            <img src="${image}"
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

// Escape product text before rendering
function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

// Render all products
function renderProducts(products) {
const grid = document.getElementById('productGrid');

if (!products.length) {
    grid.innerHTML = '<p class="loading">No products found.</p>';
    return;
}

grid.innerHTML = products.map(productCard).join('');

}

// Render featured products
function renderFeatured(products) {
const featured = document.getElementById('featuredProducts');

if (!products.length) {
    featured.innerHTML = '<p class="loading">No featured products available.</p>';
    return;
}

featured.innerHTML = products.map(productCard).join('');

}

// Search products
function searchProducts() {
const query = document
.getElementById('searchInput')
.value.trim()
.toLowerCase();

const filtered = allProducts.filter(product =>
    product.name.toLowerCase().includes(query) ||
    (product.description || '').toLowerCase().includes(query)
);

renderProducts(filtered);

document.getElementById('products').scrollIntoView({
    behavior: 'smooth'
});

}

// Add to cart
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
showToast('Product added to cart');

}

// Save cart
function saveCart() {
localStorage.setItem('novaCart', JSON.stringify(cart));
updateCart();
}

// Update cart display
function updateCart() {
const count = cart.reduce((sum, item) => sum + item.quantity, 0);

document.getElementById('cartCount').textContent = count;

document.getElementById('cartTotal').textContent =
    formatPrice(cart.reduce((sum, item) =>
        sum + item.price * item.quantity, 0));

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

// Buy Now
function buyNow(productId) {
const product = allProducts.find(p => p._id === productId);

if (!product) return;

if (product.stock <= 0) {
    showToast('Product is out of stock');
    return;
}

showToast('Checkout integration is coming next');

}

// Cart drawer
function openCart() {
document.getElementById('cartOverlay').classList.add('active');
}

function closeCart() {
document.getElementById('cartOverlay').classList.remove('active');
}

// Category filter
function filterCategory(category) {
const filtered = allProducts.filter(product =>
product.category?.slug?.toLowerCase() === category.toLowerCase()
);

renderProducts(filtered);

document.getElementById('products').scrollIntoView({
    behavior: 'smooth'
});

}

// Event listeners
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

showToast('Secure checkout will be connected next');

});

document.getElementById('newsletterForm').addEventListener('submit', event => {
event.preventDefault();
showToast('Newsletter service will be connected later');
event.target.reset();
});

// Initial load
updateCart();
fetchProducts();
