import { Response } from 'express';
import { config } from '../../core/config/env';
import { LocalizedRequest } from '../../i18n/middleware';

interface SuccessResponse<T = any> {
  status: 'success';
  message?: string;
  data?: T;
  metadata?: any;
}

interface ErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  errors?: any[];
}

export class ResponseUtil {
  static success<T>(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    data?: T,
    statusCode: number = 200,
    interpolations?: Record<string, any>
  ): Response {
    const message = req.t(messageKey, interpolations);
    
    const response: SuccessResponse<T> = {
      status: 'success',
      message,
      ...(data !== undefined && { data }),
      ...(interpolations && { metadata: interpolations })
    };

    return res.status(statusCode).json(response);
  }

  static error(
    req: LocalizedRequest,
    res: Response,
    messageKey: string,
    statusCode: number = 500,
    interpolations?: Record<string, any>,
    code?: string,
    errors?: any[]
  ): Response {
    const message = req.t(messageKey, interpolations);
    
    const response: ErrorResponse = {
      status: 'error',
      message,
      ...(code && { code }),
      ...(errors && { errors })
    };

    // Log error in development
    if (config.app.env === 'development' && statusCode >= 500) {
      console.error('Error response:', response);
    }

    return res.status(statusCode).json(response);
  }

  // Métodos auxiliares para casos comunes sin i18n (útiles para middleware o casos especiales)
  static successDirect<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200,
    metadata?: any
  ): Response {
    const response: SuccessResponse<T> = {
      status: 'success',
      ...(message && { message }),
      ...(data !== undefined && { data }),
      ...(metadata && { metadata })
    };

    return res.status(statusCode).json(response);
  }

  static errorDirect(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: string,
    errors?: any[]
  ): Response {
    const response: ErrorResponse = {
      status: 'error',
      message,
      ...(code && { code }),
      ...(errors && { errors })
    };

    // Log error in development
    if (config.app.env === 'development' && statusCode >= 500) {
      console.error('Error response:', response);
    }

    return res.status(statusCode).json(response);
  }

  // Métodos de conveniencia para respuestas comunes
  static created<T>(req: LocalizedRequest, res: Response, messageKey: string, data: T): Response {
    return ResponseUtil.success(req, res, messageKey, data, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static notFound(req: LocalizedRequest, res: Response, messageKey: string): Response {
    return ResponseUtil.error(req, res, messageKey, 404, undefined, 'NOT_FOUND');
  }

  static badRequest(req: LocalizedRequest, res: Response, messageKey: string, errors?: any[]): Response {
    return ResponseUtil.error(req, res, messageKey, 400, undefined, 'BAD_REQUEST', errors);
  }

  static unauthorized(req: LocalizedRequest, res: Response, messageKey: string): Response {
    return ResponseUtil.error(req, res, messageKey, 401, undefined, 'UNAUTHORIZED');
  }

  static forbidden(req: LocalizedRequest, res: Response, messageKey: string): Response {
    return ResponseUtil.error(req, res, messageKey, 403, undefined, 'FORBIDDEN');
  }

  static conflict(req: LocalizedRequest, res: Response, messageKey: string): Response {
    return ResponseUtil.error(req, res, messageKey, 409, undefined, 'CONFLICT');
  }

  static tooManyRequests(req: LocalizedRequest, res: Response, messageKey: string): Response {
    return ResponseUtil.error(req, res, messageKey, 429, undefined, 'TOO_MANY_REQUESTS');
  }

  static internalError(req: LocalizedRequest, res: Response, messageKey: string, error?: any): Response {
    // En producción, usar mensaje genérico
    if (config.app.env === 'production') {
      return ResponseUtil.error(req, res, messageKey, 500, undefined, 'INTERNAL_ERROR');
    }
    
    // En desarrollo, incluir detalles del error
    return ResponseUtil.error(
      req, 
      res, 
      messageKey, 
      500, 
      { errorDetail: error?.message || 'Unknown error' }, 
      'INTERNAL_ERROR'
    );
  }
}