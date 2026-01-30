import searchService from '../services/searchService.js';

export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query parameter is required' });

    const results = await searchService.searchProducts(query);

    // Map to API response shape similar to sample
    const data = results.map((r) => {
      const p = r.product;
      return {
        productId: p.productId || p._id || null,
        title: p.title,
        description: p.description,
        mrp: p.mrp || p.mrp || 0,
        Sellingprice: p.price || p.Sellingprice || 0,
        Metadata: p.metadata || {},
        stock: p.stock || 0,
        score: r.score,
        breakdown: r.breakdown
      };
    });

    return res.json({ data });
  } catch (err) {
    console.error('searchProducts error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default { searchProducts };
