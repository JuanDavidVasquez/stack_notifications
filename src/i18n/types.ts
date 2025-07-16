export type SupportedLanguage = 'en' | 'es' | 'pt';

export interface TranslationFunction {
  (interpolations?: Record<string, string | number>): string;
}

export interface BaseTranslations {
  // Respuestas generales del sistema
  responses: {
    general: {
      operation_successful: string;
      resource_created: string;
      resource_updated: string;
      resource_deleted: string;
    };
  };

  // Errores generales del sistema  
  errors: {
    general: {
      internal_server: string;
      not_found: string;
      unauthorized: string;
      forbidden: string;
      validation_failed: string;
      invalid_request: string;
    };
  };

  // Mensajes comunes del sistema
  common: {
    loading: string;
    saving: string;
    deleting: string;
    confirm: string;
    cancel: string;
    yes: string;
    no: string;
    ok: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
}

// Traducciones específicas de usuarios
export interface UserTranslations {
  responses: {
    user: {
      created: string;
      updated: string;
      deleted: string;
      activated: string;
      deactivated: string;
      verified: string;
      role_updated: TranslationFunction;
      retrieved: string;
      list_retrieved: TranslationFunction;
    };
  };
  errors: {
    user: {
      not_found: string;
      email_exists: string;
      username_exists: string;
      already_verified: string;
      invalid_credentials: string;
      account_locked: string;
      account_inactive: string;
    };
  };
  validation: {
    user: {
      firstName_required: string;
      firstName_min_length: TranslationFunction;
      lastName_required: string;
      lastName_min_length: TranslationFunction;
      email_required: string;
      email_invalid: string;
      password_required: string;
      password_min_length: TranslationFunction;
      username_min_length: TranslationFunction;
      role_invalid: string;
    };
  };
}

// Traducciones específicas de autenticación
export interface AuthTranslations {
  responses: {
    auth: {
      login_success: string;
      logout_success: string;
      token_refreshed: string;
      password_reset_sent: string;
      password_changed: string;
    };
  };
  errors: {
    auth: {
      invalid_token: string;
      expired_token: string;
      session_expired: string;
      insufficient_permissions: string;
      invalid_refresh_token: string;
    };
  };
  validation: {
    auth: {
      credentials_required: string;
      token_required: string;
      refresh_token_required: string;
    };
  };
}

// Interfaz completa que combina todas las traducciones
export interface CompleteTranslations extends BaseTranslations {
  responses: BaseTranslations['responses'] & 
             UserTranslations['responses'] & 
             AuthTranslations['responses'];
  errors: BaseTranslations['errors'] & 
          UserTranslations['errors'] & 
          AuthTranslations['errors'];
  validation: UserTranslations['validation'] & 
              AuthTranslations['validation'];
  common: BaseTranslations['common'];
}