require('dotenv').config({ path: '../.env' });

const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Product = require('./models/Product');

async function seedProduct() {
    try {
        await connectDB();

        const productData = {
            name: 'Premium Wireless Headphones',
            slug: 'premium-wireless-headphones',
            description: 'High-quality wireless headphones with premium sound.',
            shortDescription: 'Premium sound and comfortable design.',
            images: [
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop'
            ],
            originalPrice: 2999,
            salePrice: 1999,
            stock: 25,
            sku: 'HEADPHONE-001',
            rating: 4.5,
            isFeatured: true,
            status: 'active'
        };

        const product = await Product.findOneAndUpdate(
            { slug: productData.slug },
            productData,
            { upsert: true, new: true, runValidators: true }
        );

        console.log('Product saved successfully!');
        console.log(product);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

seedProduct();
