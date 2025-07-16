import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import setupLogger from '../../../shared/utils/logger';
import { config } from '../../../core/config/env';
import nodemailerUtil, { EmailOptions } from '../../../shared/utils/nodemailer.util';


const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/services/email`,
});

export type SupportedLanguage = 'en' | 'es' | 'pt';

export interface EmailTemplateData {
  [key: string]: any;
}

export interface SendEmailParams {
  to: string | string[];
  template: string;
  language: SupportedLanguage;
  data: EmailTemplateData;
  priority?: 'low' | 'normal' | 'high';
  subject?: string; // Opcional, se puede obtener del i18n
  attachments?: EmailOptions['attachments'];
  cc?: string | string[];
  bcc?: string | string[];
}

interface I18nTranslations {
  [key: string]: any;
}

class EmailService {
  private compiledTemplates: Map<string, handlebars.TemplateDelegate> = new Map();
  private templateCache: Map<string, string> = new Map();
  private i18nCache: Map<string, I18nTranslations> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa el servicio registrando helpers de Handlebars
   */
  private initialize(): void {
    logger.info('Initializing email service...');
    this.registerHelpers();
    this.loadPartials();
    logger.info('Email service initialized successfully');
  }

  /**
   * Carga las traducciones i18n para una plantilla específica
   */
  private async loadI18n(template: string, language: SupportedLanguage): Promise<I18nTranslations> {
    const cacheKey = `i18n-${language}-${template}`;
    
    // Verificar caché
    if (this.i18nCache.has(cacheKey)) {
      return this.i18nCache.get(cacheKey)!;
    }

    try {
      // Construir la ruta al archivo de traducciones
      const i18nPath = path.join(
        process.cwd(),
        'src/i18n/locales',
        language,
        'emails',
        `${template}.json`
      );

      // Si no existe el archivo específico, intentar con el archivo general de emails
      if (!fs.existsSync(i18nPath)) {
        const generalPath = path.join(
          process.cwd(),
          'src/i18n/locales',
          language,
          'emails.json'
        );

        if (fs.existsSync(generalPath)) {
          const content = await fs.promises.readFile(generalPath, 'utf-8');
          const translations = JSON.parse(content);
          
          // Buscar las traducciones específicas del template
          if (translations[template]) {
            this.i18nCache.set(cacheKey, translations[template]);
            return translations[template];
          }
        }

        // Si no se encuentra, usar inglés como fallback
        if (language !== 'en') {
          logger.warn(`Translations not found for ${template} in ${language}, falling back to English`);
          return this.loadI18n(template, 'en');
        }

        // Si tampoco hay en inglés, devolver objeto vacío
        logger.warn(`No translations found for template: ${template}`);
        return {};
      }

      // Cargar el archivo de traducciones
      const content = await fs.promises.readFile(i18nPath, 'utf-8');
      const translations = JSON.parse(content);

      // Guardar en caché
      this.i18nCache.set(cacheKey, translations);

      return translations;
    } catch (error) {
      logger.error(`Error loading i18n for ${template} in ${language}:`, error);
      return {};
    }
  }

  /**
   * Registra helpers personalizados de Handlebars
   */
  private registerHelpers(): void {
    // Helper para URLs
    handlebars.registerHelper('url', (path: string) => {
      return `${config.app.baseUrl}${path}`;
    });

    // Helper para frontend URLs
    handlebars.registerHelper('frontendUrl', (path: string) => {
      return `${config.app.frontendUrl}${path}`;
    });

    // Helper para formatear fechas
    handlebars.registerHelper('formatDate', (date: Date | string) => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString();
    });

    // Helper para año actual
    handlebars.registerHelper('currentYear', () => {
      return new Date().getFullYear();
    });

    // Helper para acceder a traducciones anidadas
    handlebars.registerHelper('t', function(key: string, options: any) {
      const keys = key.split('.');
      let value: any = options.data.root.i18n;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key; // Retornar la clave si no se encuentra la traducción
        }
      }
      
      return value;
    });

    logger.info('Handlebars helpers registered');
  }

  /**
   * Carga todos los partials disponibles
   */
  private loadPartials(): void {
    try {
      const partialsDir = path.join(process.cwd(), 'src/templates/emails/partials');

      if (!fs.existsSync(partialsDir)) {
        logger.warn('Partials directory not found');
        return;
      }

      const files = fs.readdirSync(partialsDir);
      
      files.forEach(file => {
        if (file.endsWith('.hbs')) {
          const partialName = path.basename(file, '.hbs');
          const partialPath = path.join(partialsDir, file);
          const partialContent = fs.readFileSync(partialPath, 'utf-8');
          
          handlebars.registerPartial(partialName, partialContent);
          logger.info(`Partial registered: ${partialName}`);
        }
      });
    } catch (error) {
      logger.error('Error loading partials:', error);
    }
  }

  /**
   * Obtiene la ruta de la plantilla según el idioma
   */
  private getTemplatePath(template: string, language: SupportedLanguage, type: 'layouts' | 'pages'): string {
    // Las plantillas ahora son genéricas (sin idioma en el path)
    return path.join(
      process.cwd(),
      'src/templates/emails',
      type,
      `${template}.hbs`
    );
  }

  /**
   * Carga y compila una plantilla
   */
  private async loadTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
    const cacheKey = `template-${templateName}`;
    
    // Verificar caché
    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey)!;
    }

    try {
      // Las plantillas ahora son genéricas
      const templatePath = this.getTemplatePath(templateName, 'en', 'pages');
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templateName}`);
      }

      const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);

      // Guardar en caché
      this.compiledTemplates.set(cacheKey, compiledTemplate);
      this.templateCache.set(cacheKey, templateContent);

      return compiledTemplate;
    } catch (error) {
      logger.error(`Error loading template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Carga el layout principal
   */
  private async loadLayout(): Promise<handlebars.TemplateDelegate | null> {
    const cacheKey = 'layout-main';
    
    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey)!;
    }

    try {
      const layoutPath = this.getTemplatePath('main', 'en', 'layouts');
      
      if (!fs.existsSync(layoutPath)) {
        logger.warn('No layout found, emails will be sent without layout');
        return null;
      }

      const layoutContent = await fs.promises.readFile(layoutPath, 'utf-8');
      const compiledLayout = handlebars.compile(layoutContent);

      this.compiledTemplates.set(cacheKey, compiledLayout);
      
      return compiledLayout;
    } catch (error) {
      logger.error('Error loading layout:', error);
      return null;
    }
  }

  /**
   * Renderiza una plantilla con datos
   */
  private async renderTemplate(
    templateName: string,
    language: SupportedLanguage,
    data: EmailTemplateData
  ): Promise<{ html: string; subject?: string }> {
    try {
      // Cargar las traducciones i18n
      const i18n = await this.loadI18n(templateName, language);
      
      // Cargar la plantilla (ahora genérica)
      const template = await this.loadTemplate(templateName);
      
      // Cargar el layout
      const layout = await this.loadLayout();

      // Datos base que siempre estarán disponibles
      const baseData = {
        appName: config.app.name,
        appDescription: config.app.description,
        supportEmail: config.app.supportEmail,
        frontendUrl: config.app.frontendUrl,
        baseUrl: config.app.baseUrl,
        i18n, // Añadir las traducciones
        ...data,
      };

      // Renderizar el contenido de la plantilla
      let html = template(baseData);

      // Si hay layout, envolver el contenido
      if (layout) {
        html = layout({
          ...baseData,
          content: html,
        });
      }

      // Extraer el subject del i18n o usar el proporcionado
      const subject = data.subject || i18n.subject || `${config.app.name} - Notification`;

      return { html, subject };
    } catch (error) {
      logger.error(`Error rendering template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Convierte HTML a texto plano (versión básica)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Envía un email usando una plantilla
   */
  public async sendEmail(params: SendEmailParams): Promise<void> {
    const { to, template, language, data, subject: customSubject, attachments, cc, bcc } = params;

    try {
      logger.info(`Sending email: template=${template}, language=${language}, to=${to}`);

      // Renderizar la plantilla
      const { html, subject: templateSubject } = await this.renderTemplate(template, language, data);

      // Usar el subject personalizado o el de la plantilla
      const finalSubject = customSubject || templateSubject;

      // Crear versión de texto plano
      const text = this.htmlToText(html);

      // Opciones del email
      const emailOptions: EmailOptions = {
        to,
        subject: finalSubject ?? `${config.app.name} - Notification`,
        html,
        text,
        attachments,
        cc,
        bcc,
      };

      // Enviar el email usando nodemailerUtil
      await nodemailerUtil.sendEmail(emailOptions);

      logger.info(`Email sent successfully: template=${template}, to=${to}`);
    } catch (error) {
      logger.error(`Error sending email with template ${template}:`, error);
      throw error;
    }
  }

  /**
   * Envía múltiples emails
   */
  public async sendBulkEmails(emailsList: SendEmailParams[]): Promise<void> {
    logger.info(`Starting bulk email send for ${emailsList.length} emails`);

    const errors: Array<{ email: SendEmailParams; error: any }> = [];
    let successCount = 0;

    for (const emailParams of emailsList) {
      try {
        await this.sendEmail(emailParams);
        successCount++;
      } catch (error) {
        errors.push({ email: emailParams, error });
      }
    }

    logger.info(`Bulk email completed. Success: ${successCount}, Failed: ${errors.length}`);

    if (errors.length > 0) {
      logger.error('Bulk email errors:', errors);
    }
  }

  /**
   * Limpia la caché de plantillas
   */
  public clearCache(): void {
    this.compiledTemplates.clear();
    this.templateCache.clear();
    this.i18nCache.clear();
    logger.info('Template and i18n cache cleared');
  }

  /**
   * Obtiene el estado del servicio
   */
  public getStatus(): {
    templatesLoaded: number;
    cacheSize: number;
    i18nLoaded: number;
    emailServiceStatus: any;
  } {
    return {
      templatesLoaded: this.compiledTemplates.size,
      cacheSize: this.templateCache.size,
      i18nLoaded: this.i18nCache.size,
      emailServiceStatus: nodemailerUtil.getStatus(),
    };
  }
}

// Exportar instancia singleton
const emailService = new EmailService();
export default emailService;

// También exportar la clase para testing
export { EmailService };