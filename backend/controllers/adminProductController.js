const mongoose = require('mongoose');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

function imgUrl(filename) {
    return `/uploads/products/${filename}`;
}

function deleteFile(filename) {
    if (!filename) return;
    const full = path.join(__dirname, '..', 'uploads', 'products', filename);
    fs.promises.unlink(full).catch(() => {});
}

function filenameFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('/uploads/products/')) return url.split('/').pop();
    return null;
}

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, category, featured } = req.query;
        const filter = {};

        if (status && ['active', 'inactive'].includes(status)) filter.status = status;
        if (category && mongoose.isValidObjectId(category)) filter.category = category;
        if (featured === 'true') filter.isFeatured = true;
        if (search && typeof search === 'string') {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);

        const [products, total] = await Promise.all([
            Product.find(filter).populate('category', 'name slug').sort({ createdAt: -1 }).limit(safeLimit).skip((safePage - 1) * safeLimit).lean(),
            Product.countDocuments(filter)
        ]);

        res.status(200).json({ success: true, total, page: safePage, limit: safeLimit, products });
    } catch (error) {
        console.error('Admin list products error:', error);
        res.status(500).json({ success: false, message: 'Unable to load products' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const product = await Product.findById(id).populate('category', 'name slug').lean();
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.status(200).json({ success: true, product });
    } catch (error) {
        console.error('Admin get product error:', error);
        res.status(500).json({ success: false, message: 'Unable to load product' });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, description, shortDescription, category, originalPrice, salePrice, stock, sku, isFeatured, status, slug: providedSlug } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            if (req.files) req.files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }
        if (!description || typeof description !== 'string' || !description.trim()) {
            if (req.files) req.files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: 'Description is required' });
        }

        const origPrice = Number(originalPrice);
        const saleP = Number(salePrice);
        const stockN = Number(stock);

        if (isNaN(origPrice) || origPrice < 0) {
            if (req.files) req.files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: 'Invalid original price' });
        }
        if (isNaN(saleP) || saleP < 0 || saleP > origPrice) {
            if (req.files) req.files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: 'Sale price must be <= original price' });
        }
        if (isNaN(stockN) || stockN < 0 || !Number.isInteger(stockN)) {
            if (req.files) req.files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: 'Stock must be non-negative integer' });
        }
        if (category && !mongoose.isValidObjectId(category)) {
            if (req.files) req.files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: 'Invalid category' });
        }

        let baseSlug = (providedSlug && providedSlug.trim()) || slugify(name, { lower: true, strict: true });
        if (!baseSlug) baseSlug = 'product-' + Date.now();
        let slug = baseSlug;
        let counter = 1;
        while (await Product.findOne({ slug })) slug = `${baseSlug}-${counter++}`;

        if (sku && typeof sku === 'string' && sku.trim()) {
            const exists = await Product.findOne({ sku: sku.trim() });
            if (exists) {
                if (req.files) req.files.forEach(f => deleteFile(f.filename));
                return res.status(400).json({ success: false, message: 'SKU already exists' });
            }
        }

        const files = req.files || [];
        const images = files.map(f => imgUrl(f.filename));

        const product = await Product.create({
            name: name.trim(),
            slug,
            description: description.trim(),
            shortDescription: (shortDescription || '').trim(),
            images,
            category: category || undefined,
            originalPrice: origPrice,
            salePrice: saleP,
            stock: stockN,
            sku: sku && sku.trim() ? sku.trim() : undefined,
            isFeatured: isFeatured === 'true' || isFeatured === true,
            status: status === 'inactive' ? 'inactive' : 'active'
        });

        res.status(201).json({ success: true, message: 'Product created successfully', product });
    } catch (error) {
        if (req.files) req.files.forEach(f => deleteFile(f.filename));
        console.error('Admin create product error:', error);
        res.status(500).json({ success: false, message: 'Unable to create product' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        const { name, description, shortDescription, category, originalPrice, salePrice, stock, sku, isFeatured, status, slug: providedSlug, keepImages } = req.body;

        if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
            if (req.files) req.files.forEach(f => deleteFile(f.filename));
            return res.status(400).json({ success: false, message: 'Invalid name' });
        }

        const origPrice = originalPrice !== undefined ? Number(originalPrice) : product.originalPrice;
        const saleP = salePrice !== undefined ? Number(salePrice) : product.salePrice;
        const stockN = stock !== undefined ? Number(stock) : product.stock;

        if (isNaN(origPrice) || origPrice < 0) return res.status(400).json({ success: false, message: 'Invalid original price' });
        if (isNaN(saleP) || saleP < 0 || saleP > origPrice) return res.status(400).json({ success: false, message: 'Sale price must be <= original price' });
        if (isNaN(stockN) || stockN < 0 || !Number.isInteger(stockN)) return res.status(400).json({ success: false, message: 'Stock must be non-negative integer' });

        if (providedSlug !== undefined) {
            let newSlug = slugify(providedSlug.trim() || name || product.name, { lower: true, strict: true });
            if (newSlug && newSlug !== product.slug) {
                let slug = newSlug;
                let counter = 1;
                while (await Product.findOne({ slug, _id: { $ne: product._id } })) slug = `${newSlug}-${counter++}`;
                product.slug = slug;
            }
        }

        if (sku !== undefined && sku && sku.trim() && sku.trim() !== product.sku) {
            const exists = await Product.findOne({ sku: sku.trim(), _id: { $ne: product._id } });
            if (exists) return res.status(400).json({ success: false, message: 'SKU already exists' });
            product.sku = sku.trim();
        }

        if (name !== undefined) product.name = name.trim();
        if (description !== undefined) product.description = description.trim();
        if (shortDescription !== undefined) product.shortDescription = shortDescription.trim();
        if (category !== undefined) product.category = category || undefined;
        if (originalPrice !== undefined) product.originalPrice = origPrice;
        if (salePrice !== undefined) product.salePrice = saleP;
        if (stock !== undefined) product.stock = stockN;
        if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
        if (status !== undefined) product.status = status === 'inactive' ? 'inactive' : 'active';

        let currentImages = product.images || [];
        if (keepImages !== undefined) {
            const keep = String(keepImages).split(',').filter(Boolean).map(s => s.trim());
            currentImages.forEach(url => {
                if (!keep.includes(url)) {
                    const fn = filenameFromUrl(url);
                    if (fn) deleteFile(fn);
                }
            });
            currentImages = keep;
        }

        const newFiles = req.files || [];
        const newImages = newFiles.map(f => imgUrl(f.filename));
        product.images = [...currentImages, ...newImages].slice(0, 5);

        await product.save();

        res.status(200).json({ success: true, message: 'Product updated', product });
    } catch (error) {
        if (req.files) req.files.forEach(f => deleteFile(f.filename));
        console.error('Admin update product error:', error);
        res.status(500).json({ success: false, message: 'Unable to update product' });
    }
};

exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        (product.images || []).forEach(url => {
            const fn = filenameFromUrl(url);
            if (fn) deleteFile(fn);
        });

        await product.deleteOne();
        res.status(200).json({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('Admin delete product error:', error);
        res.status(500).json({ success: false, message: 'Unable to delete product' });
    }
};

exports.toggleField = async (req, res) => {
    try {
        const { id } = req.params;
        const { field } = req.body;

        if (!['isFeatured', 'status'].includes(field)) {
            return res.status(400).json({ success: false, message: 'Invalid field' });
        }

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (field === 'isFeatured') product.isFeatured = !product.isFeatured;
        if (field === 'status') product.status = product.status === 'active' ? 'inactive' : 'active';

        await product.save();
        res.status(200).json({ success: true, message: `${field} toggled`, product: { _id: product._id, [field]: product[field] } });
    } catch (error) {
        console.error('Admin toggle error:', error);
        res.status(500).json({ success: false, message: 'Unable to toggle' });
    }
};
