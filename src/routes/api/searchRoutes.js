import express from 'express';
import searchController from '../../controllers/searchController.js';

const router = express.Router();

// Search products
router.get('/product', searchController.searchProducts);

export default router;
