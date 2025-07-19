// backend/src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const {
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  downloadDocument,
  getAllDocuments,
  updateDocumentStatus
} = require('../controllers/uploadController');

// Rute pentru utilizatori autentificați
router.post('/upload', authenticate, uploadDocument);
router.get('/my-documents', authenticate, getUserDocuments);
router.delete('/document/:id', authenticate, deleteDocument);
router.get('/document/:id/download', authenticate, downloadDocument);

// Rute pentru admin
router.get('/admin/documents', authenticate, authorize(['admin']), getAllDocuments);
router.patch('/admin/document/:id/status', authenticate, authorize(['admin']), updateDocumentStatus);

module.exports = router;