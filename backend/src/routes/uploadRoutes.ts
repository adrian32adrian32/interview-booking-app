import { Router } from 'express';

const router = Router();

// Placeholder routes
router.post('/single', (req, res) => {
  res.json({ success: true, message: 'Upload endpoint' });
});

router.get('/list', (req, res) => {
  res.json({ success: true, files: [] });
});

export default router;
