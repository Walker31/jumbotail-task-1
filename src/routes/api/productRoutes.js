import express from 'express';
import productController from '../../controllers/productController.js';

const router = express.Router();

// Create a product
router.post('/product', productController.createProduct);

// Update product metadata
router.put('/product/meta-data', productController.updateProductMetadata);

export default router;
