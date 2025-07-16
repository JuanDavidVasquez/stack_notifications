import { BaseTranslations } from '../../types';

export const esBaseTranslations: BaseTranslations = {
  responses: {
    general: {
      operation_successful: 'Operación completada exitosamente',
      resource_created: 'Recurso creado exitosamente',
      resource_updated: 'Recurso actualizado exitosamente',
      resource_deleted: 'Recurso eliminado exitosamente',
    },
  },
  errors: {
    general: {
      internal_server: 'Error interno del servidor. Por favor, inténtalo de nuevo más tarde.',
      not_found: 'El recurso solicitado no fue encontrado',
      unauthorized: 'Se requiere autenticación para acceder a este recurso',
      forbidden: 'No tienes permisos para acceder a este recurso',
      validation_failed: 'Falló la validación. Por favor, verifica tu información.',
      invalid_request: 'Formato de solicitud o parámetros inválidos',
    },
  },
  common: {
    loading: 'Cargando...',
    saving: 'Guardando...',
    deleting: 'Eliminando...',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    yes: 'Sí',
    no: 'No',
    ok: 'OK',
    error: 'Error',
    success: 'Éxito',
    warning: 'Advertencia',
    info: 'Información',
  },
};