// src/middleware/service-auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwtUtil from '../shared/utils/jwt.util';

interface ServiceRequest extends Request {
  service?: {
    name: string;
    permissions: string[];
  };
}

/**
 * Middleware para autenticar servicios usando JWT
 */
export const authenticateService = (requiredPermissions: string[] = []) => {
  return async (req: ServiceRequest, res: Response, next: NextFunction) => {
    try {
      // Extraer token del header
      const token = jwtUtil.extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No authentication token provided',
        });
      }

      // Verificar el token
      const decoded = jwtUtil.verifyServiceToken(token);
      
      // Verificar permisos si se especificaron
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(permission => 
          decoded.permissions.includes(permission)
        );

        if (!hasPermission) {
          return res.status(403).json({
            status: 'error',
            message: 'Insufficient permissions',
          });
        }
      }

      // Agregar información del servicio a la request
      req.service = {
        name: decoded.service,
        permissions: decoded.permissions,
      };
      
      // Log para auditoría
      console.log(`Service request from ${decoded.service} to ${req.path}`);
      
      next();
    } catch (error: any) {
      console.error('Service authentication error:', error.message);
      
      if (error.message.includes('expired')) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication token expired',
        });
      }
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authentication token',
      });
    }
  };
};