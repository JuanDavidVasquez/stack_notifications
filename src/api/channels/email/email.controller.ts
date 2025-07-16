import { Request, Response } from 'express';
import { LocalizedRequest } from '../../../i18n/middleware';
import emailService, { SupportedLanguage } from './email.service';


export class EmailController {
  /**
   * Enviar email de bienvenida
   */
  async sendWelcomeEmail(req: LocalizedRequest, res: Response) {
    try {
      const { to, data, priority, language } = req.body;

      await emailService.sendEmail({
        to: to,
        template: 'welcome',
        language,
        priority,
        data: {
          userName: data.userName || to,
          confirmationCode: data.confirmationCode,
          confirmationUrl: data.confirmationUrl,
          appName: data.appName,
          firstName: data.firstName,
          year: data.year,
          companyLogoUrl: data.companyLogoUrl,
          companyName: data.companyName
        }
      });

      res.status(200).json({
        status: 'success',
        message: req.t('responses.general.operation_successful')
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      res.status(500).json({
        status: 'error',
        message: req.t('errors.general.internal_server')
      });
    }
  }

  /**
   * Enviar email de restablecimiento de contraseña
   */
  async sendPasswordResetEmail(req: LocalizedRequest, res: Response) {
    try {
      const { to, data, priority } = req.body;

      const language = (data.language || 'en') as SupportedLanguage;

      await emailService.sendEmail({
        to: to,
        template: 'password-reset',
        language,
        data: {
          firstName: data.firstName,
          temporaryPassword: data.temporaryPassword,
          resetToken: data.resetToken,
          resetExpiry: data.resetExpiry,
          year: data.year,
          companyLogoUrl: data.companyLogoUrl,
          companyName: data.companyName,
        }
      });

      res.status(200).json({
        status: 'success',
        message: req.t('responses.auth.password_reset_sent')
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      res.status(500).json({
        status: 'error',
        message: req.t('errors.general.internal_server')
      });
    }
  }

  /**
   * Enviar email de cambio de contraseña
   */
  async sendPasswordChangedEmail(req: LocalizedRequest, res: Response) {
    try {
      const { email, userName, changedAt } = req.body;

      const language = (req.language || 'en') as SupportedLanguage;

      await emailService.sendEmail({
        to: email,
        template: 'password-changed',
        language,
        data: {
          userName,
          changedAt: changedAt || new Date(),
          supportLink: `${process.env.FRONTEND_URL}/support`
        }
      });

      res.status(200).json({
        status: 'success',
        message: req.t('responses.general.operation_successful')
      });
    } catch (error) {
      console.error('Error sending password changed email:', error);
      res.status(500).json({
        status: 'error',
        message: req.t('errors.general.internal_server')
      });
    }
  }

  /**
   * Enviar email genérico/notificación
   */
  async sendNotificationEmail(req: LocalizedRequest, res: Response) {
    try {
      const {
        to,
        subject,
        template = 'notification',
        language = req.language || 'en',
        data,
        attachments,
        cc,
        bcc
      } = req.body;

      await emailService.sendEmail({
        to,
        template,
        language: language as SupportedLanguage,
        subject,
        data,
        attachments,
        cc,
        bcc
      });

      res.status(200).json({
        status: 'success',
        message: req.t('responses.general.operation_successful')
      });
    } catch (error) {
      console.error('Error sending notification email:', error);
      res.status(500).json({
        status: 'error',
        message: req.t('errors.general.internal_server')
      });
    }
  }

  /**
   * Enviar emails masivos
   */
  async sendBulkEmails(req: LocalizedRequest, res: Response) {
    try {
      const { emails } = req.body;

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: req.t('errors.general.validation_failed')
        });
      }

      // Validar que cada email tenga la estructura correcta
      const validEmails = emails.every(email =>
        email.to && email.template && email.language && email.data
      );

      if (!validEmails) {
        return res.status(400).json({
          status: 'error',
          message: req.t('errors.general.validation_failed')
        });
      }

      await emailService.sendBulkEmails(emails);

      res.status(200).json({
        status: 'success',
        message: req.t('responses.general.operation_successful'),
        count: emails.length
      });
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      res.status(500).json({
        status: 'error',
        message: req.t('errors.general.internal_server')
      });
    }
  }

  /**
   * Obtener estado del servicio de emails
   */
  async getEmailServiceStatus(req: LocalizedRequest, res: Response) {
    try {
      const status = emailService.getStatus();

      res.status(200).json({
        status: 'success',
        data: status
      });
    } catch (error) {
      console.error('Error getting email service status:', error);
      res.status(500).json({
        status: 'error',
        message: req.t('errors.general.internal_server')
      });
    }
  }

  /**
   * Limpiar caché de templates
   */
  async clearTemplateCache(req: LocalizedRequest, res: Response) {
    try {
      emailService.clearCache();

      res.status(200).json({
        status: 'success',
        message: req.t('responses.general.operation_successful')
      });
    } catch (error) {
      console.error('Error clearing template cache:', error);
      res.status(500).json({
        status: 'error',
        message: req.t('errors.general.internal_server')
      });
    }
  }
}

export default new EmailController();