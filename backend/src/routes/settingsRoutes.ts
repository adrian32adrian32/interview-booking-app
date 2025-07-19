import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      email: {
        enabled: true,
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || '587',
        from: process.env.EMAIL_FROM || 'noreply@example.com'
      },
      system: {
        timezone: 'Europe/Bucharest',
        language: 'ro',
        workingHours: {
          start: '09:00',
          end: '18:00'
        }
      }
    }
  });
});

router.put('/', async (req: Request, res: Response) => {
  const { settings } = req.body;
  // În producție, salvează în DB
  res.json({ 
    success: true, 
    message: 'Settings updated successfully',
    data: settings 
  });
});

export default router;
