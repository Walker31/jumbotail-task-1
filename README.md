# Node + Express + MongoDB 🔧

Quick setup:

1. Create `.env` and set `MONGO_URI` (example: `mongodb://localhost:27017/mydb`) and `PORT`.
2. Install dependencies: `npm install`
3. Start the server: `npm run start` (or `npm run dev` with nodemon)

Helpful endpoints:

- `GET /` — root
- `GET /health` — health check

Admin / Scraping:

- `POST /api/v1/admin/bootstrap` — Trigger scraping to bootstrap product data (synchronous/backwards compatible).
- `POST /api/v1/admin/bootstrap/start` — Start an async scrape job. Returns `{ jobId }` immediately (202)
- `GET  /api/v1/admin/bootstrap/stream/:jobId` — Server-Sent Events stream for progress & final result.

Request body (JSON): { categories: ['mobiles','laptops'], totalPages: 5, perPageDelayMs: 800, persist: true }
Protect these endpoints by setting `ADMIN_TOKEN` in `.env` and sending header `x-admin-token`.

Admin UI:

- `GET /admin` — Simple UI to trigger bootstrap and view progress using Server-Sent Events.

Ranking algorithm (tailored for Tier-2/3 Indian customers) 🔧

- Score = (Relevance * 0.4) + (RatingScore * 0.2) + (PopularityScore * 0.2) + (ValueFactor * 0.2)
  - Relevance: Fuzzy match relevance using `Fuse.js` (captures misspellings like "Ifone").
  - RatingScore: Normalized product rating (0..1).
  - PopularityScore: Log-normalized `sales` / `unitsSold` to capture real-world popularity.
  - ValueFactor: "Affordability" score — favors lower-priced items in the candidate set. For queries that indicate price-sensitivity (contains `sasta`, `cheap`, or a numeric price), the algorithm increases the weight of `ValueFactor` to surface budget-friendly options preferred in Tier-2/3 markets.

- Intent detection: The search service detects keywords like `sasta`, numeric price mentions (e.g., `50k`), and `latest` to dynamically re-balance weights, prioritizing price or recency/popularity as appropriate.

Notes & safety:

- Respect target sites' `robots.txt` and terms of service — scraping may be disallowed.
- Use gentle `perPageDelayMs` and limit `totalPages` to avoid burdening external sites.
- Selectors are heuristics and may need updating for target sites. This script includes fallbacks.

API Reference 📦

1) Store Product in Catalog — POST /api/v1/product ✅

- Request (JSON):

  {
    "title": "Iphone 17",
    "description": "6.3-inch 120Hz ProMotion OLED display...",
    "rating": 4.2,
    "stock": 1000,
    "price": 81999,
    "mrp": 82999,
    "currency": "Rupee"
  }

- Response (201):

  {
    "success": true,
    "product": {
      "productId": "<uuid>",
      "title": "Iphone 17",
      ...
    }
  }

Notes: Product is stored in-memory and an attempt is made to persist it to MongoDB if available.

2) Update Product Metadata — PUT /api/v1/product/meta-data ✅

- Request (JSON):

  {
    "productId": "<uuid>",
    "metadata": {
      "ram": "8GB",
      "screensize": "6.3 inches",
      "model": "Iphone 17",
      "storage": "128GB",
      "brightness": "300nits"
    }
  }

- Response (200):

  {
    "success": true,
    "product": { /* current product object with updated metadata */ }
  }

Notes: Metadata updates the in-memory store and attempts to update the DB record if present.

3) Search Products — GET /api/v1/search/product?query=...

- Example: GET /api/v1/search/product?query=Sasta%20Iphone

- Response (200):

  {
    "data": [
      {
        "productId": "<id>",
        "title": "Iphone 13",
        "description": "...",
        "mrp": 62999,
        "Sellingprice": 35000,
        "Metadata": { ... },
        "stock": 10,
        "score": 0.72,
        "breakdown": { "relevance": 0.8, "rating": 0.9, "popularity": 0.4, "price": 0.9 }
      },
      ...
    ]
  }

Notes on ranking: The service applies fuzzy search using Fuse.js and a weighted ranking algorithm tuned for Tier-2/3 Indian customers (see 'Ranking algorithm' section above). The search endpoint is optimized to run under 1000ms by limiting candidate sets and using DB text search when available.

Scripts & utilities 🧰

- `npm run seed` — Post sample products from `src/data/sampleProducts.json` to the running server (POST /api/v1/product).
- `npm run bootstrap` — Trigger local client helper to call `POST /api/v1/admin/bootstrap`.
- `npm run dev` — Start server in dev mode with `nodemon`.

Admin UI 🧭

- Open http://localhost:3000/admin to access the admin interface that can start the scraper and show live progress via Server-Sent Events.
- Protect `/api/v1/admin/*` endpoints by setting `ADMIN_TOKEN` in `.env` and using header `x-admin-token`.

Behavior when MongoDB is unavailable ⚠️

- The server will still start and the application will operate using the in-memory product store. If MongoDB connects later, newly created products will still be written to the DB where possible.

Security & next steps 🔒

- Add request validation (express-validator/Joi) and authentication for admin endpoints before using this in production.
- Add tests for `RankingService` and API endpoints to lock behavior and regression tests.

---
