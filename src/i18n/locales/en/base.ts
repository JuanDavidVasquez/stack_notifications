import { BaseTranslations } from '../../types';

export const enBaseTranslations: BaseTranslations = {
  responses: {
    general: {
      operation_successful: 'Operation completed successfully',
      resource_created: 'Resource created successfully',
      resource_updated: 'Resource updated successfully',
      resource_deleted: 'Resource deleted successfully',
    },
  },
  errors: {
    general: {
      internal_server: 'Internal server error. Please try again later.',
      not_found: 'The requested resource was not found',
      unauthorized: 'Authentication required to access this resource',
      forbidden: 'You do not have permission to access this resource',
      validation_failed: 'Validation failed. Please check your input.',
      invalid_request: 'Invalid request format or parameters',
    },
  },
  common: {
    loading: 'Loading...',
    saving: 'Saving...',
    deleting: 'Deleting...',
    confirm: 'Confirm',
    cancel: 'Cancel',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
  },
};