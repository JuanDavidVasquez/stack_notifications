import { Router } from 'express';
import emailController from './email.controller';

const router = Router();

// Rutas públicas (no requieren autenticación)
router.post('/welcome',
  emailController.sendWelcomeEmail
);

router.post('/password-reset',
  emailController.sendPasswordResetEmail
);

router.post('/password-changed',
  emailController.sendPasswordChangedEmail
);

// Rutas protegidas (requieren autenticación)
router.post('/notification',
  emailController.sendNotificationEmail
);

// Rutas administrativas (requieren rol admin)
router.post('/bulk',
  emailController.sendBulkEmails
);

router.get('/status',
  emailController.getEmailServiceStatus
);

router.post('/cache/clear',
  emailController.clearTemplateCache
);

export default router;