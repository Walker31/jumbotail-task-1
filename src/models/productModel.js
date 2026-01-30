import { v4 as uuidv4 } from 'uuid';

// In-memory products store
const products = [];

export const createProduct = (data) => {
  const product = {
    productId: uuidv4(),
    title: data.title || '',
    description: data.description || '',
    rating: typeof data.rating === 'number' ? data.rating : 0,
    stock: typeof data.stock === 'number' ? data.stock : 0,
    price: typeof data.price === 'number' ? data.price : 0,
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  return product;
};

export const updateMetaData = (productId, metadata = {}) => {
  const idx = products.findIndex((p) => p.productId === productId);
  if (idx === -1) return null;
  products[idx].metadata = { ...products[idx].metadata, ...metadata };
  products[idx].updatedAt = new Date().toISOString();
  return products[idx];
};

export const getProductById = (productId) => products.find((p) => p.productId === productId) || null;

// Basic ranking based on keyword occurrences + rating
export const searchProducts = (query) => {
  if (!query) return [];
  const q = query.toLowerCase();
  const results = products
    .map((p) => {
      const titleHits = (p.title.toLowerCase().match(new RegExp(q, 'g')) || []).length;
      const descHits = (p.description.toLowerCase().match(new RegExp(q, 'g')) || []).length;
      const score = titleHits * 3 + descHits + p.rating / 5; // simple heuristic
      return { product: p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      productId: r.product.productId,
      title: r.product.title,
      description: r.product.description,
      price: r.product.price,
      rating: r.product.rating,
      stock: r.product.stock,
      metadata: r.product.metadata,
      score: Number(r.score.toFixed(3)),
    }));

  return results;
};

export default {
  createProduct,
  updateMetaData,
  getProductById,
  searchProducts,
  // expose store for inspection (dev)
  _store: products,
};
