const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

function imgUrl(filename) { return `/uploads/categories/${filename}`; }
function deleteFile(filename) {
    if (!filename) return;
    fs.promises.unlink(path.join(__dirname, '..', 'uploads', 'categories', filename)).catch(() => {});
}
function filenameFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('/uploads/categories/')) return url.split('/').pop();
    return null;
}

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 50, search, status } = req.query;
        const filter = {};
        if (status && ['active', 'inactive'].includes(status)) filter.status = status;
        if (search && typeof search === 'string') {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } }
            ];
        }
        const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);
        const [categories, total] = await Promise.all([
            Category.find(filter).sort({ createdAt: -1 }).limit(safeLimit).skip((safePage - 1) * safeLimit).lean(),
            Category.countDocuments(filter)
        ]);
        const ids = categories.map(c => c._id);
        const counts = await Product.aggregate([
            { $match: { category: { $in: ids } } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        counts.forEach(c => { countMap[c._id.toString()] = c.count; });
        const withCounts = categories.map(c => ({ ...c, productCount: countMap[c._id.toString()] || 0 }));
        res.status(200).json({ success: true, total, page: safePage, limit: safeLimit, categories: withCounts });
    } catch (error) {
        console.error('Admin list categories error:', error);
        res.status(500).json({ success: false, message: 'Unable to load categories' });
    }
};

exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const category = await Category.findById(id).lean();
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        res.status(200).json({ success: true, category });
    } catch (error) {
        console.error('Admin get category error:', error);
        res.status(500).json({ success: false, message: 'Unable to load category' });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, description, status, slug: providedSlug } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            if (req.file) deleteFile(req.file.filename);
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        const trimmedName = name.trim();
        const existingName = await Category.findOne({ name: trimmedName });
        if (existingName) {
            if (req.file) deleteFile(req.file.filename);
            return res.status(400).json({ success: false, message: 'Category name already exists' });
        }
        let baseSlug = (providedSlug && providedSlug.trim()) || slugify(trimmedName, { lower: true, strict: true });
        if (!baseSlug) baseSlug = 'category-' + Date.now();
        let slug = baseSlug;
        let counter = 1;
        while (await Category.findOne({ slug })) slug = `${baseSlug}-${counter++}`;
        const image = req.file ? imgUrl(req.file.filename) : undefined;
        const category = await Category.create({
            name: trimmedName,
            slug,
            description: (description || '').trim(),
            image,
            status: status === 'inactive' ? 'inactive' : 'active'
        });
        res.status(201).json({ success: true, message: 'Category created', category });
    } catch (error) {
        if (req.file) deleteFile(req.file.filename);
        console.error('Admin create category error:', error);
        res.status(500).json({ success: false, message: 'Unable to create category' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const category = await Category.findById(id);
        if (!category) {
            if (req.file) deleteFile(req.file.filename);
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        const { name, description, status, slug: providedSlug, keepImage } = req.body;
        if (name !== undefined && name.trim() !== category.name) {
            const trimmed = name.trim();
            if (!trimmed) {
                if (req.file) deleteFile(req.file.filename);
                return res.status(400).json({ success: false, message: 'Name required' });
            }
            const exists = await Category.findOne({ name: trimmed, _id: { $ne: category._id } });
            if (exists) {
                if (req.file) deleteFile(req.file.filename);
                return res.status(400).json({ success: false, message: 'Category name already exists' });
            }
            category.name = trimmed;
        }
        if (providedSlug !== undefined) {
            const newSlug = slugify(providedSlug.trim() || name || category.name, { lower: true, strict: true });
            if (newSlug && newSlug !== category.slug) {
                let slug = newSlug;
                let counter = 1;
                while (await Category.findOne({ slug, _id: { $ne: category._id } })) slug = `${newSlug}-${counter++}`;
                category.slug = slug;
            }
        }
        if (description !== undefined) category.description = description.trim();
        if (status !== undefined) category.status = status === 'inactive' ? 'inactive' : 'active';
        if (req.file) {
            if (category.image) {
                const fn = filenameFromUrl(category.image);
                if (fn) deleteFile(fn);
            }
            category.image = imgUrl(req.file.filename);
        } else if (keepImage === 'false' && category.image) {
            const fn = filenameFromUrl(category.image);
            if (fn) deleteFile(fn);
            category.image = undefined;
        }
        await category.save();
        res.status(200).json({ success: true, message: 'Category updated', category });
    } catch (error) {
        if (req.file) deleteFile(req.file.filename);
        console.error('Admin update category error:', error);
        res.status(500).json({ success: false, message: 'Unable to update category' });
    }
};

exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        const productCount = await Product.countDocuments({ category: id });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete: ${productCount} product(s) assigned. Reassign or delete them first.`
            });
        }
        if (category.image) {
            const fn = filenameFromUrl(category.image);
            if (fn) deleteFile(fn);
        }
        await category.deleteOne();
        res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('Admin delete category error:', error);
        res.status(500).json({ success: false, message: 'Unable to delete category' });
    }
};

exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        category.status = category.status === 'active' ? 'inactive' : 'active';
        await category.save();
        res.status(200).json({ success: true, message: 'Status toggled', category: { _id: category._id, status: category.status } });
    } catch (error) {
        console.error('Admin toggle category error:', error);
        res.status(500).json({ success: false, message: 'Unable to toggle' });
    }
};
