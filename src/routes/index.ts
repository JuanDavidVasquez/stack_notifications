import { Router } from 'express';
import emailRouter from '../api/channels/email/email.routes'

export const apiRoutes = async () => {
  const router = Router();
  router.use('/emails', emailRouter);

  return router;
};