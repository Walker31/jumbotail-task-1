import express from 'express';
import adminController from '../../controllers/adminController.js';

const router = express.Router();

// POST /api/v1/admin/bootstrap (synchronous, backwards-compatible)
router.post('/admin/bootstrap', adminController.bootstrap);

// POST /api/v1/admin/bootstrap/start -> starts async job, returns { jobId }
router.post('/admin/bootstrap/start', adminController.startBootstrap);

// GET /api/v1/admin/bootstrap/stream/:jobId -> SSE stream for progress/events
router.get('/admin/bootstrap/stream/:jobId', adminController.streamBootstrap);

export default router;
