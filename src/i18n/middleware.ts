import { Request, Response, NextFunction } from 'express';
import i18next, { TFunction } from 'i18next';
import middleware from 'i18next-http-middleware';
import { config } from '../core/config/env';
import { enTranslations } from './locales/en/index';
import { esTranslations } from './locales/es/index';

// Extender el tipo Request para incluir la función t
export interface LocalizedRequest extends Request {
  t: TFunction;
  language: string;
  languages: string[];
  i18n: any;
}

// Configurar i18next con todas las traducciones
export const initI18n = async () => {
  await i18next
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: 'en',
      supportedLngs: ['en', 'es', 'pt'],
      preload: ['en', 'es', 'pt'],
      
      // ✅ SIN defaultNS para usar claves completas
      // defaultNS: 'responses', // ELIMINAR ESTA LÍNEA
      
      // ✅ Cargar TODAS las traducciones completas
      resources: {
        en: {
          translation: enTranslations // Todas las traducciones en inglés
        },
        es: {
          translation: esTranslations // Todas las traducciones en español
        },
        pt: {
          translation: enTranslations // Fallback a inglés para portugués
        }
      },
      
      // ✅ Usar 'translation' como namespace por defecto
      defaultNS: 'translation',
      
      interpolation: {
        escapeValue: false,
      },
      
      detection: {
        order: ['header', 'querystring', 'cookie'],
        lookupHeader: 'accept-language',
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        caches: ['cookie'],
      },
      
      debug: config.app.env === 'development',
      
      // ✅ Configuración adicional para debugging
      saveMissing: config.app.env === 'development',
      missingKeyHandler: (lng, ns, key, fallbackValue) => {
        if (config.app.env === 'development') {
          console.warn(`Missing translation key: ${key} for language: ${lng}`);
        }
      }
    });

  console.log('i18next initialized successfully');
  console.log('Available languages:', i18next.languages);
  console.log('Current language:', i18next.language);
};

// Middleware personalizado para i18n
export const i18nMiddleware = middleware.handle(i18next);

// Middleware para establecer el idioma del usuario autenticado
export const setUserLanguageMiddleware = (req: LocalizedRequest, _res: Response, next: NextFunction) => {
  if ((req as any).user?.language) {
    req.i18n.changeLanguage((req as any).user.language);
  }
  next();
};

// ✅ Middleware para debugging (opcional, solo en desarrollo)
export const debugI18nMiddleware = (req: LocalizedRequest, _res: Response, next: NextFunction) => {
  if (config.app.env === 'development') {
    console.log('Current language:', req.i18n.language);
    console.log('Available languages:', req.i18n.languages);
    
    // Test de una traducción simple
    const testTranslation = req.t('responses.user.retrieved');
    console.log('Test translation for "responses.user.retrieved":', testTranslation);
  }
  next();
};

// Helpers
export const getSupportedLanguages = () => i18next.languages;
export const changeLanguage = async (language: string) => i18next.changeLanguage(language);