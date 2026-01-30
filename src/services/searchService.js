import Fuse from 'fuse.js';
import Product from '../models/productSchema.js';
import productModel from '../models/productModel.js';
import rankingService from './rankingService.js';

// Detect intent (price-sensitive, latest)
function detectIntent(query) {
  const q = query.toLowerCase();
  const priceMention = /\b(\d+(k|k\b|,|\d{2,}))\b/i.test(q) || /\b\d+(k|K)\b/.test(q);
  const sasta = /\b(sasta|cheap|cheapest|affordable)\b/.test(q);
  const latest = /\b(latest|new|newest|202\d)\b/.test(q);
  return { priceMention: priceMention || sasta, sasta: sasta, latest };
}

// Normalize numeric arrays to 0..1
function normalize(value, min, max) {
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

// Main search: uses MongoDB if available (text search), else falls back to in-memory store
export async function searchProducts(query, opts = {}) {
  const { limit = 50, timeoutMs = 800 } = opts;
  const intent = detectIntent(query);

  // 1) Candidate fetch
  let candidates = [];
  try {
    // Try MongoDB text search first (fast if indexed)
    const textResults = await Product.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' }, title: 1, description: 1, price: 1, rating: 1, stock: 1, sales: 1, metadata: 1 }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(500)
      .lean()
      .exec();

    if (textResults && textResults.length) {
      candidates = textResults.map((d) => ({
        title: d.title,
        description: d.description,
        price: d.price || 0,
        rating: d.rating || 0,
        stock: d.stock || 0,
        sales: d.sales || 0,
        metadata: d.metadata || {},
        source: d.source || 'db',
        _id: d._id
      }));
    }
  } catch (e) {
    // If db unavailable or error, fallback to in-memory
    // console.warn('DB text search failed, falling back to in-memory', e.message || e);
  }

  if (!candidates.length) {
    // use in-memory store
    const all = productModel._store || [];
    candidates = all.slice(0, 1000); // cap
  }

  // 2) Fuse fuzzy match on candidates
  // We'll rely on RankingService to handle Fuse, normalization, intent detection and weighting
  

  const ranked = rankingService.rankProducts(candidates, query, { limit: 200 });
  return ranked;
}

export default { searchProducts, detectIntent };