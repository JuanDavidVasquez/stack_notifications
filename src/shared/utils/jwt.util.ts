import jwt from 'jsonwebtoken';
import { config } from '../../core/config/env';
import setupLogger from './logger';
import crypto from 'crypto';

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/utils/jwt`,
});

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  deviceId?: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

export interface DecodedToken extends JwtPayload {
  iat: number;
  exp: number;
}

class JwtUtil {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = config.jwt.authSecret;
    this.refreshTokenSecret = config.jwt.initSecret;
    this.accessTokenExpiry = config.jwt.expiresIn;
    this.refreshTokenExpiry = config.jwt.refreshExpiresIn;

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }
  }

  /**
   * Genera un par de tokens (access y refresh)
   */
  public generateTokenPair(payload: Omit<JwtPayload, 'type'>): TokenPair {
    try {
      // Generar session ID único si no existe
      const sessionId = payload.sessionId || this.generateSessionId();

      // Access Token
      const accessPayload: JwtPayload = {
        ...payload,
        sessionId,
        type: 'access',
      };

      const accessToken = jwt.sign(
        accessPayload,
        this.accessTokenSecret,
        {
          expiresIn: String(this.accessTokenExpiry),
          algorithm: 'HS256',
        } as jwt.SignOptions
      );

      // Refresh Token
      const refreshPayload: JwtPayload = {
        ...payload,
        sessionId,
        type: 'refresh',
      };

      const refreshToken = jwt.sign(
        refreshPayload,
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiry as string,
          algorithm: 'HS256',
        } as jwt.SignOptions
      );

      // Calcular fechas de expiración
      const accessExpiresAt = this.calculateExpiryDate(this.accessTokenExpiry);
      const refreshExpiresAt = this.calculateExpiryDate(this.refreshTokenExpiry);

      logger.info(`Token pair generated for user ${payload.userId} with session ${sessionId}`);

      return {
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt,
      };
    } catch (error) {
      logger.error('Error generating token pair:', error);
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Verifica y decodifica un access token
   */
  public verifyAccessToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as DecodedToken;
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Access token expired');
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token');
        throw new Error('Invalid token');
      }
      
      logger.error('Error verifying access token:', error);
      throw error;
    }
  }

  /**
   * Verifica y decodifica un refresh token
   */
  public verifyRefreshToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as DecodedToken;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token expired');
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token');
        throw new Error('Invalid refresh token');
      }
      
      logger.error('Error verifying refresh token:', error);
      throw error;
    }
  }

  /**
   * Genera un token para reset de contraseña
   */
  public generatePasswordResetToken(userId: string, email: string): string {
    try {
      const payload = {
        userId,
        email,
        type: 'password-reset',
        nonce: crypto.randomBytes(16).toString('hex'),
      };

      const token = jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: '1h', // Token válido por 1 hora
        algorithm: 'HS256',
      });

      logger.info(`Password reset token generated for user ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating password reset token:', error);
      throw new Error('Failed to generate password reset token');
    }
  }

  /**
   * Verifica un token de reset de contraseña
   */
  public verifyPasswordResetToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as any;
      
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Password reset token expired');
      }
      
      logger.error('Error verifying password reset token:', error);
      throw new Error('Invalid password reset token');
    }
  }

  /**
   * Genera un token de verificación de email
   */
  public generateEmailVerificationToken(userId: string, email: string): string {
    try {
      const payload = {
        userId,
        email,
        type: 'email-verification',
        nonce: crypto.randomBytes(16).toString('hex'),
      };

      const token = jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: '24h', // Token válido por 24 horas
        algorithm: 'HS256',
      });

      logger.info(`Email verification token generated for user ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating email verification token:', error);
      throw new Error('Failed to generate email verification token');
    }
  }

  /**
   * Verifica un token de verificación de email
   */
  public verifyEmailVerificationToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as any;
      
      if (decoded.type !== 'email-verification') {
        throw new Error('Invalid token type');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Email verification token expired');
      }
      
      logger.error('Error verifying email verification token:', error);
      throw new Error('Invalid email verification token');
    }
  }

  /**
   * Genera un ID de sesión único
   */
  public generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Genera un ID de dispositivo basado en la información del request
   */
  public generateDeviceId(userAgent: string, ip: string): string {
    const data = `${userAgent}-${ip}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calcula la fecha de expiración basada en el tiempo de expiración
   */
  private calculateExpiryDate(expiresIn: string): Date {
    const ms = this.parseExpiryToMs(expiresIn);
    return new Date(Date.now() + ms);
  }

  /**
   * Convierte el tiempo de expiración a milisegundos
   */
  private parseExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error('Invalid time unit');
    }
  }

  /**
   * Extrae el token del header Authorization
   */
  public extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }

    return null;
  }

  /**
   * Decodifica un token sin verificarlo (útil para debugging)
   */
  public decodeToken(token: string): any {
    return jwt.decode(token);
  }


  //TODO, metodos para comunicar entre apis
  /**
 * Genera un token para comunicación entre servicios
 */
public generateServiceToken(service: string, permissions: string[]): string {
  try {
    const payload = {
      service,
      permissions,
      type: 'service',
      issuedAt: new Date().toISOString(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const token = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: '5m', // Token de corta duración para mayor seguridad
      algorithm: 'HS256',
    });

    logger.info(`Service token generated for ${service}`);
    return token;
  } catch (error) {
    logger.error('Error generating service token:', error);
    throw new Error('Failed to generate service token');
  }
}

/**
 * Verifica un token de servicio
 */
public verifyServiceToken(token: string): { service: string; permissions: string[] } {
  try {
    const decoded = jwt.verify(token, this.accessTokenSecret) as any;
    
    if (decoded.type !== 'service') {
      throw new Error('Invalid token type - not a service token');
    }

    return {
      service: decoded.service,
      permissions: decoded.permissions || [],
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Service token expired');
    }
    
    logger.error('Error verifying service token:', error);
    throw new Error('Invalid service token');
  }
}



}

export default new JwtUtil();