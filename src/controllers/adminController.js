import * as scraper from '../services/scraperService.js';
import Product from '../models/productSchema.js';
import * as jobService from '../services/jobService.js';

// Helper to dedupe by title+price
const dedupe = (arr) => {
  const seen = new Set();
  const out = [];
  for (const p of arr) {
    const key = `${(p.title || '').toLowerCase()}::${p.price || 0}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
};

const bootstrap = async (req, res) => {
  try {
    // Backwards-compatible synchronous bootstrap (keeps previous behavior)
    // Basic admin auth: requires header x-admin-token matching env var (if set)
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      const provided = req.header('x-admin-token');
      if (!provided || provided !== adminToken) return res.status(401).json({ error: 'unauthorized' });
    }

    const { categories = ['mobiles', 'laptops', 'headphones'], totalPages = 5, perPageDelayMs = 800, persist = true } = req.body || {};

    let all = [];
    for (const cat of categories) {
      const results = await scraper.scrapeCategory(cat, { totalPages, perPageDelayMs });
      console.log(`Scraped ${results.length} items for ${cat}`);
      all = all.concat(results.map(r => ({ ...r, category: cat })));
    }

    all = dedupe(all);

    let inserted = 0;
    if (persist && all.length) {
      // bulk insert; to avoid duplicates, we try insertMany with ordered=false
      try {
        const docs = all.map((p) => ({
          title: p.title,
          description: p.description,
          price: p.price,
          rating: p.rating,
          stock: p.stock,
          category: p.category,
          metadata: p.metadata || {},
          source: p.source || 'scrape'
        }));
        const resIns = await Product.insertMany(docs, { ordered: false });
        inserted = resIns.length;
      } catch (err) {
        // If duplicate key errors or partial failures, count successful inserts if possible
        if (err && err.insertedDocs) inserted = err.insertedDocs.length;
        console.warn('Partial insert or error while inserting:', err.message || err);
      }
    }

    return res.status(201).json({ success: true, scraped: all.length, inserted });
  } catch (err) {
    console.error('bootstrap error', err);
    return res.status(500).json({ error: 'Bootstrap failed', details: err.message || err });
  }
};

// Start an asynchronous bootstrap job and stream progress via SSE (client connects to stream endpoint)
const startBootstrap = async (req, res) => {
  try {
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      const provided = req.header('x-admin-token');
      if (!provided || provided !== adminToken) return res.status(401).json({ error: 'unauthorized' });
    }

    const { categories = ['mobiles', 'laptops', 'headphones'], totalPages = 5, perPageDelayMs = 800, persist = true } = req.body || {};

    const { id: jobId, emitter } = jobService.createJob();

    // run async job
    (async () => {
      try {
        let all = [];
        for (const cat of categories) {
          emitter.emit('progress', { step: 'start-category', category: cat });

          const results = await scraper.scrapeCategory(cat, {
            totalPages,
            perPageDelayMs,
            onProgress: (p) => {
              // p: { category, page, foundThisPage, totalSoFar }
              jobService.emitProgress(jobId, { step: 'page', ...p });
            }
          });

          jobService.emitProgress(jobId, { step: 'category-complete', category: cat, found: results.length });
          all = all.concat(results.map(r => ({ ...r, category: cat })));
        }

        all = dedupe(all);

        let inserted = 0;
        if (persist && all.length) {
          try {
            const docs = all.map((p) => ({
              title: p.title,
              description: p.description,
              price: p.price,
              rating: p.rating,
              stock: p.stock,
              category: p.category,
              metadata: p.metadata || {},
              source: p.source || 'scrape'
            }));
            const resIns = await Product.insertMany(docs, { ordered: false });
            inserted = resIns.length;
          } catch (err) {
            if (err && err.insertedDocs) inserted = err.insertedDocs.length;
            console.warn('Partial insert or error while inserting:', err.message || err);
          }
        }

        jobService.finishJob(jobId, { success: true, scraped: all.length, inserted });
      } catch (err) {
        jobService.finishJob(jobId, { success: false, error: err.message || err });
      }
    })();

    return res.status(202).json({ jobId });
  } catch (err) {
    console.error('startBootstrap error', err);
    return res.status(500).json({ error: 'Start bootstrap failed', details: err.message || err });
  }
};

// Server-Sent Events stream for a job
const streamBootstrap = (req, res) => {
  const jobId = req.params.jobId;
  const job = jobService.getJob(jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const onProgress = (payload) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', payload })}\n\n`);
  };

  const onDone = (result) => {
    res.write(`data: ${JSON.stringify({ type: 'done', payload: result })}\n\n`);
    res.end();
  };

  job.emitter.on('progress', onProgress);
  job.emitter.on('done', onDone);

  // Cleanup on client disconnect
  req.on('close', () => {
    try { job.emitter.off('progress', onProgress); job.emitter.off('done', onDone); } catch (e) { }
  });
};

export default { bootstrap, startBootstrap, streamBootstrap };
