// Client helper to trigger bootstrap endpoint
import axios from 'axios';
const BASE = `http://localhost:${process.env.PORT || 3000}/api/v1`;

(async () => {
  try {
    const res = await axios.post(
      `${BASE}/admin/bootstrap`,
      { categories: ['mobiles','laptops','headphones'], totalPages: 3, perPageDelayMs: 600, persist: true },
      { headers: { 'x-admin-token': process.env.ADMIN_TOKEN || '' } }
    );
    console.log('Bootstrap result:', res.data);
  } catch (err) {
    console.error('Bootstrap failed:', err.response ? err.response.data : err.message);
  }
})();