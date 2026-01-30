// Seed script: posts sample products to running server's POST /api/v1/product
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}/api/v1`;

(async () => {
  try {
    const dataPath = path.join(__dirname, '..', 'src', 'data', 'sampleProducts.json');
    const json = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Seeding ${json.length} products to ${BASE}`);

    for (const p of json) {
      const res = await axios.post(`${BASE}/product`, p);
      console.log('Added:', res.data.product?.productId || '-', '-', res.data.product?.title || p.title);
    }

    console.log('✅ Seeding complete');
  } catch (err) {
    console.error('Seeding failed:', err.response?.data || err.message || err);
    process.exit(1);
  }
})();
