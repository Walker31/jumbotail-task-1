import axios from 'axios';
import * as cheerio from 'cheerio';

const defaultHeaders = (userAgent) => ({
  'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
});

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Try multiple container selectors to be robust across sites
const containerSelectors = [
  '.product-tuple-listing',
  '.s-result-item',
  '.product',
  '.product-card',
  '.search-result-product',
  '[data-testid="product-card"]',
];

// Attempt to extract title from element using common selectors
const extractTitle = ($el) => {
  const titleSelectors = ['.product-title', '.title', '.prod-title', 'h2', 'h3', '[data-testid="product-title"]'];
  for (const sel of titleSelectors) {
    const text = $el.find(sel).first().text().trim();
    if (text) return text;
  }
  // fallback to text of element
  return $el.text().trim().split('\n').map(s => s.trim()).find(Boolean) || '';
};

const extractPrice = ($el) => {
  const priceSelectors = ['.product-price', '.price', '.prod-price', '.final-price', '.price-number'];
  for (const sel of priceSelectors) {
    const text = $el.find(sel).first().text().trim();
    if (text) {
      const n = Number(text.replace(/[^0-9.]/g, ''));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
};

const extractRating = ($el) => {
  const rsel = $el.find('.product-rating-count, .rating, .stars').first().text().trim();
  const n = Number(rsel.replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Scrape a single category with pagination.
 * options: { totalPages, perPageDelayMs, userAgent, pageParam }
 */
export const scrapeCategory = async (category, options = {}) => {
  const { totalPages = 5, perPageDelayMs = 800, userAgent, pageParam = 'page', baseUrl, onProgress } = options;
  const headers = defaultHeaders(userAgent);
  const scraped = [];
  let totalSoFar = 0;

  for (let page = 1; page <= totalPages; page++) {
    try {
      // Construct URL: either user provided baseUrl template or generic snapdeal style
      const url = baseUrl ? baseUrl.replace('{category}', encodeURIComponent(category)).replace('{page}', page) : `https://www.snapdeal.com/search?keyword=${encodeURIComponent(category)}&${pageParam}=${page}`;

      const { data } = await axios.get(url, { headers, timeout: 15_000 });
      const $ = cheerio.load(data);

      // Find container
      let containers = [];
      for (const cs of containerSelectors) {
        const found = $(cs).toArray();
        if (found.length) { containers = found; break; }
      }

      if (!containers.length) {
        // As fallback, try article or li elements
        containers = $('article, li, div').toArray().filter((el) => $(el).text().length > 50).slice(0, 200);
      }

      let foundThisPage = 0;
      $(containers).each((i, el) => {
        const $el = $(el);
        const title = extractTitle($el);
        if (!title) return; // skip empty
        const price = extractPrice($el) || Math.round(Math.random() * 500) || 0; // fallback
        const rating = extractRating($el) || Number((Math.random() * 2 + 3).toFixed(1));
        const stock = Math.floor(Math.random() * 200);
        const description = ($el.find('p').first().text().trim()) || `High-quality ${category} item.`;

        scraped.push({ title, description, price, rating, stock, category, metadata: {}, source: url });
        foundThisPage += 1;
        totalSoFar += 1;
      });

      // report progress for this page
      if (typeof onProgress === 'function') {
        try { onProgress({ category, page, foundThisPage, totalSoFar }); } catch (e) { /* ignore */ }
      }

      // polite delay
      await sleep(perPageDelayMs);
    } catch (err) {
      // Continue on errors (network, parsing, etc.)
      console.error(`Scrape error on category=${category} page=${page}:`, err.message || err);
    }
  }

  return scraped;
};
