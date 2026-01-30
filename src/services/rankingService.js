import Fuse from 'fuse.js';

class RankingService {
  constructor() {
    this.fuseOptions = {
      keys: ['title', 'description', 'metadata.brand', 'metadata.model'],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    };
  }

  // Detect intent and budget
  detectIntent(query = '') {
    const q = (query || '').toLowerCase();
    const priceIntent = /\b(cheap|budget|low price|sasta)\b/.test(q);
    const latest = /\b(latest|new|newest|just out)\b/.test(q);
    // budget like "under 50k" or "under 50000" or just "50k"
    const budgetRegex = /under\s*([0-9,]+\s*[kKmM]?|[0-9]+\s*[kKmM])|\b([0-9,]+\s*[kKmM])\b/;
    const m = q.match(budgetRegex);
    let budget = null;
    if (m) {
      const str = (m[1] || m[2] || '').replace(/[,\s]/g, '');
      if (str) {
        const lower = str.toLowerCase();
        if (lower.endsWith('k')) budget = Number(lower.slice(0, -1)) * 1000;
        else if (lower.endsWith('m')) budget = Number(lower.slice(0, -1)) * 1000000;
        else budget = Number(lower);
      }
    }

    return { priceIntent, latest, budget };
  }

  // normalize 0..1
  normalize(value, min, max) {
    if (typeof value !== 'number') return 0;
    if (max <= min) return 0.5;
    const v = (value - min) / (max - min);
    return Math.min(1, Math.max(0, v));
  }

  // products: array of items (must include price, rating, unitsSold/sales, stock), query: string
  rankProducts(products, query = '', opts = {}) {
    if (!Array.isArray(products)) return [];

    const { limit = 50 } = opts;
    const intent = this.detectIntent(query);

    // Prepare Fuse for relevance
    const fuse = new Fuse(products, this.fuseOptions);
    const fuseRes = fuse.search(query, { limit: products.length || 200 });

    // Build base arrays and find maxes
    const prices = products.map((p) => Number(p.price) || 0);
    const units = products.map((p) => Number(p.unitsSold || p.sales || 0) || 0);
    const ratings = products.map((p) => Number(p.rating) || 0);

    const maxPrice = Math.max(...prices, 1);
    const maxUnits = Math.max(...units, 1);
    const maxRating = 5; // rating is out of 5

    // map fuse results to items
    const mapped = fuseRes.map((r) => {
      const p = r.item;
      const fuseScore = r.score == null ? 0 : r.score; // lower better
      const relevance = 1 - Math.min(1, fuseScore * 1.2);
      const ratingScore = (Number(p.rating) || 0) / maxRating;
      const popularityScore = (Number(p.unitsSold || p.sales || 0) || 0) / maxUnits;
      const priceScore = 1 - ((Number(p.price) || 0) / maxPrice);

      return { product: p, relevance, ratingScore, popularityScore, priceScore };
    });

    // compute weights based on intent
    let relevanceW = 0.4, ratingW = 0.2, popularityW = 0.2, priceW = 0.2;
    if (intent.priceIntent) {
      priceW = 0.6; relevanceW = 0.2; ratingW = 0.1; popularityW = 0.1;
    }
    if (intent.latest) {
      popularityW = 0.6; relevanceW = 0.25; ratingW = 0.1; priceW = 0.05;
    }

    // apply ranking and business rules
    const ranked = mapped.map((m) => {
      let final = (m.relevance * relevanceW) + (m.ratingScore * ratingW) + (m.popularityScore * popularityW) + (m.priceScore * priceW);
      // budget prioritization
      if (intent.budget) {
        const budget = intent.budget;
        if ((Number(m.product.price) || 0) <= budget) {
          final *= 1.2; // boost in-budget products
        }
      }

      // stock penalty
      if ((m.product.stock || 0) <= 0) {
        final = final * 0.1;
      }

      return {
        product: m.product,
        score: Number(final.toFixed(6)),
        breakdown: {
          relevance: Number(m.relevance.toFixed(4)),
          rating: Number(m.ratingScore.toFixed(4)),
          popularity: Number(m.popularityScore.toFixed(4)),
          price: Number(m.priceScore.toFixed(4))
        }
      };
    });

    // sort
    const sorted = ranked.sort((a, b) => b.score - a.score).slice(0, limit);
    return sorted;
  }
}

const defaultRankingService = new RankingService();
export default defaultRankingService;