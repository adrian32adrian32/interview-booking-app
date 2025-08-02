import { Router, Request, Response } from 'express';
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplate,
  sendTestEmail,
  getEmailLogs,
  getEmailStatistics
} from '../controllers/emailTemplateController';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import emailService from '../services/emailService';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(authorize(['admin']));

// Template management routes
router.get('/templates', getEmailTemplates);
router.get('/templates/:id', getEmailTemplate);
router.post('/templates', createEmailTemplate);
router.put('/templates/:id', updateEmailTemplate);
router.delete('/templates/:id', deleteEmailTemplate);

// Template preview and testing
router.post('/templates/:id/preview', previewEmailTemplate);
router.post('/templates/:id/test', sendTestEmail);

// Email logs and statistics
router.get('/logs', getEmailLogs);
router.get('/statistics', getEmailStatistics);

// Bulk email sending
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { templateName, recipients, batchSize = 10, delayMs = 1000 } = req.body;
    
    if (!templateName || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Template name and recipients array are required'
      });
    }
    
    const results = await emailService.sendBulkEmails(
      templateName,
      recipients,
      { batchSize, delayMs }
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      results: {
        total: results.length,
        successful,
        failed,
        details: results
      }
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk emails'
    });
  }
});

export default router;