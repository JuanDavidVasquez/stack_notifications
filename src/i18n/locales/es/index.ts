import { CompleteTranslations } from '../../types';
import { esBaseTranslations } from './base';
import { esUserTranslations } from './users';
import { esAuthTranslations } from './auth';

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

export const esTranslations: CompleteTranslations = mergeTranslations(
  esBaseTranslations,
  esUserTranslations,
  esAuthTranslations,
);