import productModel from '../models/productModel.js';
import Product from '../models/productSchema.js';

export const createProduct = async (req, res) => {
  try {
    const { title, description, rating, stock, price, metadata, mrp, currency } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const product = productModel.createProduct({ title, description, rating, stock, price, metadata });

    // Try to persist to MongoDB if available
    try {
      await Product.create({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        mrp: mrp || 0,
        rating: product.rating,
        stock: product.stock,
        metadata: metadata || {},
        source: 'api',
      });
    } catch (err) {
      // ignore DB errors - in-memory store still works
      console.warn('Could not persist product to DB:', err.message || err);
    }

    return res.status(201).json({ success: true, product });
  } catch (err) {
    console.error('createProduct error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProductMetadata = async (req, res) => {
  try {
    const { productId, metadata } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required' });
    if (!metadata || typeof metadata !== 'object') return res.status(400).json({ error: 'metadata object is required' });

    const updated = productModel.updateMetaData(productId, metadata);
    if (!updated) return res.status(404).json({ error: 'product not found' });

    // try to update in DB as well
    try {
      await Product.findOneAndUpdate({ productId }, { $set: { metadata, updatedAt: new Date() } }, { new: true }).exec();
    } catch (err) {
      console.warn('Could not update metadata in DB:', err.message || err);
    }

    return res.json({ success: true, product: updated });
  } catch (err) {
    console.error('updateProductMetadata error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default { createProduct, updateProductMetadata };
