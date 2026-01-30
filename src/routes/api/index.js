import express from 'express';
import productRoutes from './productRoutes.js';
import searchRoutes from './searchRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

router.use('/', productRoutes);
router.use('/search', searchRoutes);
router.use('/', adminRoutes);

export default router;
