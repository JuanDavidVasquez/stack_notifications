import { AuthTranslations } from '../../types';

export const esAuthTranslations: AuthTranslations = {
  responses: {
    auth: {
      login_success: 'Inicio de sesión exitoso',
      logout_success: 'Cierre de sesión exitoso',
      token_refreshed: 'Token de autenticación renovado exitosamente',
      password_reset_sent: 'Email de restablecimiento de contraseña enviado exitosamente',
      password_changed: 'Contraseña cambiada exitosamente',
    },
  },
  errors: {
    auth: {
      invalid_token: 'Token de autenticación inválido o malformado',
      expired_token: 'El token de autenticación ha expirado',
      session_expired: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
      insufficient_permissions: 'No tienes permisos suficientes para realizar esta acción',
      invalid_refresh_token: 'Token de renovación inválido. Por favor, inicia sesión nuevamente',
    },
  },
  validation: {
    auth: {
      credentials_required: 'El email y la contraseña son requeridos',
      token_required: 'El token de autenticación es requerido',
      refresh_token_required: 'El token de renovación es requerido',
    },
  },
};