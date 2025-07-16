import { CompleteTranslations } from '../../types';
import { enBaseTranslations } from './base';
import { enUserTranslations } from './users';
import { enAuthTranslations } from './auth';

// Función helper para combinar traducciones de manera type-safe
function mergeTranslations(...translations: any[]): CompleteTranslations {
  const merged: any = {
    responses: {},
    errors: {},
    validation: {},
    common: {}
  };

  translations.forEach(translation => {
    if (translation.responses) {
      Object.assign(merged.responses, translation.responses);
    }
    if (translation.errors) {
      Object.assign(merged.errors, translation.errors);
    }
    if (translation.validation) {
      Object.assign(merged.validation, translation.validation);
    }
    if (translation.common) {
      Object.assign(merged.common, translation.common);
    }
  });

  return merged;
}

export const enTranslations: CompleteTranslations = mergeTranslations(
  enBaseTranslations,
  enUserTranslations,
  enAuthTranslations
);