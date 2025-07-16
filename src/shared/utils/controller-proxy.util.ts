import { Request, Response, RequestHandler } from 'express';
import { LocalizedRequest } from '../../i18n/middleware.js';

/**
 * Tipo que convierte métodos LocalizedRequest a Request para Express
 */
type ExpressCompatible<T> = {
  [K in keyof T]: T[K] extends (req: LocalizedRequest, res: Response, ...args: any[]) => any
    ? (req: Request, res: Response, ...args: any[]) => ReturnType<T[K]>
    : T[K];
};

/**
 * Proxy inteligente que convierte automáticamente Request a LocalizedRequest
 * y corrige los tipos para que sean compatibles con Express Router
 */
export function createLocalizedProxy<T extends Record<string, any>>(
  controller: T
): ExpressCompatible<T> {
  return new Proxy(controller, {
    get(target: any, prop: string | symbol) {
      const originalMethod = target[prop];
      
      // Si no es una función, retornar el valor original
      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }
      
      // Si es constructor u otros métodos especiales, retornar sin modificar
      if (prop === 'constructor' || typeof prop === 'symbol') {
        return originalMethod;
      }
      
      // Si es método privado, retornar sin modificar
      if (typeof prop === 'string' && prop.startsWith('_')) {
        return originalMethod;
      }
      
      // ✅ Crear wrapper que Express puede entender
      return function(req: Request, res: Response, ...args: any[]) {
        // Convertir automáticamente Request a LocalizedRequest
        const localizedReq = req as LocalizedRequest;
        
        // Validación opcional
        if (!localizedReq.t || !localizedReq.language) {
          console.warn(`Localization middleware not found for method ${String(prop)}`);
        }
        
        // Llamar al método original con tipos correctos
        return originalMethod.call(target, localizedReq, res, ...args);
      };
    }
  }) as ExpressCompatible<T>;
}
