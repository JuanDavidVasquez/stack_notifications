import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { config } from '../../core/config/env';
import setupLogger from './logger';

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/email`,
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

class NodemailerUtil {
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa el transporter de Nodemailer
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Nodemailer transporter...');

      // Configuración del transporter
      const transporterConfig: SMTPTransport.Options = {
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure, // true para 465, false para otros puertos
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
        tls: {
          rejectUnauthorized: config.app.env === 'production', // Solo validar certificados en producción
        },
      };

      // Crear el transporter - corregido el nombre del método
      this.transporter = nodemailer.createTransport(transporterConfig);

      // Verificar la conexión
      await this.verifyConnection();

      this.isInitialized = true;
      logger.info('Nodemailer transporter initialized successfully');

    } catch (error) {
      logger.error('Error initializing Nodemailer transporter:', error);
      throw error;
    }
  }

  /**
   * Verifica la conexión con el servidor SMTP
   */
  private async verifyConnection(): Promise<void> {
    if (!this.transporter) {
      throw new Error('Transporter not initialized');
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      throw error;
    }
  }

  /**
   * Obtiene el transporter, reinicializando si es necesario
   */
  private async getTransporter(): Promise<Transporter<SMTPTransport.SentMessageInfo>> {
    if (!this.isInitialized || !this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      throw new Error('Failed to initialize email transporter');
    }

    return this.transporter;
  }

  /**
   * Envía un email
   */
  public async sendEmail(options: EmailOptions): Promise<SMTPTransport.SentMessageInfo> {
    const startTime = Date.now();

    try {
      // Si estamos en modo de prueba, solo loguear
      if (config.email.testMode) {
        logger.info('TEST MODE - Email would be sent:', {
          to: options.to,
          subject: options.subject,
          from: config.email.from,
        });
        
        // Retornar un objeto completo SentMessageInfo para modo test
        const testResponse: SMTPTransport.SentMessageInfo = {
          messageId: `test-${Date.now()}@example.com`,
          accepted: Array.isArray(options.to) ? options.to : [options.to],
          rejected: [],
          pending: [],
          envelope: {
            from: config.email.from,
            to: Array.isArray(options.to) ? options.to : [options.to]
          },
          response: 'TEST MODE - Email logged but not sent',
        };
        
        return testResponse;
      }

      const transporter = await this.getTransporter();

      // Preparar opciones del email
      const mailOptions: nodemailer.SendMailOptions = {
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo || config.email.from,
        headers: {
          'X-Application': config.app.name,
          'X-Environment': config.app.env,
        },
      };

      // Enviar el email
      const info = await transporter.sendMail(mailOptions);

      const duration = Date.now() - startTime;
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
        duration: `${duration}ms`,
        response: info.response,
      });

      return info;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error sending email', {
        error,
        to: options.to,
        subject: options.subject,
        duration: `${duration}ms`,
      });

      throw error;
    }
  }

  /**
   * Cierra el transporter
   */
  public async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isInitialized = false;
      logger.info('Nodemailer transporter closed');
    }
  }

  /**
   * Obtiene el estado del servicio
   */
  public getStatus(): {
    initialized: boolean;
    connected: boolean;
    config: any;
  } {
    return {
      initialized: this.isInitialized,
      connected: this.transporter !== null,
      config: {
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        from: config.email.from,
        testMode: config.email.testMode,
      },
    };
  }
}

// Exportar una instancia singleton
const nodemailerUtil = new NodemailerUtil();

export default nodemailerUtil;

// También exportar la clase para testing
export { NodemailerUtil };