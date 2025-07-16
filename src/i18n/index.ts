import { SupportedLanguage, CompleteTranslations } from './types';

class I18nService {
  private translations: Map<SupportedLanguage, CompleteTranslations> = new Map();
  private defaultLanguage: SupportedLanguage = 'en';

  /**
   * Carga las traducciones de un idioma específico
   */
  async loadLanguage(language: SupportedLanguage): Promise<void> {
    if (this.translations.has(language)) {
      return;
    }

    try {
      let translations: CompleteTranslations;

      switch (language) {
        case 'en':
          const { enTranslations } = await import('./locales/en/index.js');
          translations = enTranslations;
          break;
        
        case 'es':
          const { esTranslations } = await import('./locales/es/index.js');
          translations = esTranslations;
          break;
        
        case 'pt':
          const { enTranslations: ptFallback } = await import('./locales/en/index.js');
          translations = ptFallback;
          console.warn('Portuguese translations not implemented yet, using English fallback');
          break;
        
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      this.translations.set(language, translations);
      console.log(`Translations loaded for language: ${language}`);
      
    } catch (error) {
      console.error(`Failed to load translations for language: ${language}`, error);
      throw error;
    }
  }

  /**
   * Obtiene una traducción por key y idioma
   */
  async t(language: SupportedLanguage, key: string, interpolations?: Record<string, any>): Promise<string> {
    // Asegurar que el idioma esté cargado
    if (!this.translations.has(language)) {
      await this.loadLanguage(language);
    }

    const translations = this.translations.get(language);
    if (!translations) {
      console.warn(`Translations not loaded for language: ${language}`);
      return key;
    }

    // Navegar por el objeto usando la key con puntos
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      value = value?.[k];
    }

    if (!value) {
      console.warn(`Translation key "${key}" not found for language "${language}"`);
      return key; // Fallback al key
    }

    // Si es una función, ejecutarla con interpolaciones
    if (typeof value === 'function') {
      return value(interpolations);
    }

    // Si es string simple, retornarlo
    if (typeof value === 'string') {
      return value;
    }

    console.warn(`Translation value for key "${key}" is not a string or function`);
    return key;
  }

  /**
   * Versión síncrona de t() para cuando las traducciones ya están cargadas
   */
  tSync(language: SupportedLanguage, key: string, interpolations?: Record<string, any>): string {
    const translations = this.translations.get(language);
    if (!translations) {
      console.warn(`Translations not loaded for language: ${language}. Use loadLanguage() first.`);
      return key;
    }

    // Navegar por el objeto usando la key con puntos
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      value = value?.[k];
    }

    if (!value) {
      console.warn(`Translation key "${key}" not found for language "${language}"`);
      return key; // Fallback al key
    }

    // Si es una función, ejecutarla con interpolaciones
    if (typeof value === 'function') {
      return value(interpolations);
    }

    // Si es string simple, retornarlo
    if (typeof value === 'string') {
      return value;
    }

    console.warn(`Translation value for key "${key}" is not a string or function`);
    return key;
  }

  /**
   * Pre-carga todos los idiomas soportados
   */
  async preloadAllLanguages(): Promise<void> {
    const languages: SupportedLanguage[] = ['en', 'es', 'pt'];
    
    await Promise.all(
      languages.map(lang => this.loadLanguage(lang))
    );
    
    console.log('All supported languages preloaded');
  }

  /**
   * Verifica si un idioma está soportado
   */
  isLanguageSupported(language: string): language is SupportedLanguage {
    return ['en', 'es', 'pt'].includes(language as SupportedLanguage);
  }

  /**
   * Obtiene el idioma por defecto
   */
  getDefaultLanguage(): SupportedLanguage {
    return this.defaultLanguage;
  }

  /**
   * Verifica si un idioma ya está cargado
   */
  isLanguageLoaded(language: SupportedLanguage): boolean {
    return this.translations.has(language);
  }
}

export const i18n = new I18nService();

// Pre-cargar idiomas en el arranque de la aplicación (opcional)
i18n.preloadAllLanguages().catch(console.error);

export * from './types';
export * from './constants';
