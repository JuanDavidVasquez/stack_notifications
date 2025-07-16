import { UserTranslations } from '../../types';

export const esUserTranslations: UserTranslations = {
  responses: {
    user: {
      created: 'Usuario creado exitosamente',
      updated: 'Perfil de usuario actualizado exitosamente',
      deleted: 'Cuenta de usuario eliminada exitosamente',
      activated: 'Cuenta de usuario activada exitosamente',
      deactivated: 'Cuenta de usuario desactivada exitosamente',
      verified: 'Email del usuario verificado exitosamente',
      role_updated: ({ role } = {}) => `Rol del usuario actualizado a ${role} exitosamente`,
      retrieved: 'Usuario obtenido exitosamente',
      list_retrieved: ({ count } = {}) => `${count} usuarios obtenidos exitosamente`
    }
  },
  errors: {
    user: {
      not_found: 'Usuario no encontrado',
      email_exists: 'Ya existe un usuario con esta dirección de email',
      username_exists: 'Ya existe un usuario con este nombre de usuario',
      already_verified: 'El email del usuario ya está verificado',
      invalid_credentials: 'Email o contraseña inválidos',
      account_locked: 'Cuenta bloqueada temporalmente debido a múltiples intentos de inicio de sesión fallidos',
      account_inactive: 'La cuenta está inactiva. Por favor, contacta al soporte.',
    },
  },
  validation: {
    user: {
      firstName_required: 'El nombre es requerido',
      firstName_min_length: ({ min } = {}) => `El nombre debe tener al menos ${min} caracteres`,
      lastName_required: 'El apellido es requerido',
      lastName_min_length: ({ min } = {}) => `El apellido debe tener al menos ${min} caracteres`,
      email_required: 'La dirección de email es requerida',
      email_invalid: 'Por favor, proporciona una dirección de email válida',
      password_required: 'La contraseña es requerida',
      password_min_length: ({ min } = {}) => `La contraseña debe tener al menos ${min} caracteres`,
      username_min_length: ({ min } = {}) => `El nombre de usuario debe tener al menos ${min} caracteres`,
      role_invalid: 'Por favor, selecciona un rol de usuario válido',
    },
  },
};