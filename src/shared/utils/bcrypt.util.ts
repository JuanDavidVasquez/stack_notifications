import bcrypt from 'bcryptjs';
import setupLogger from './logger';
import { config } from '../../core/config/env';

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/utils`,
});

/**
 * Utilidad para manejo de contraseñas con bcrypt
 * Proporciona funciones para hash y verificación de contraseñas
 */
export class BcryptUtil {
  private static readonly SALT_ROUNDS = 12; // Nivel de seguridad alto
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly MAX_PASSWORD_LENGTH = 128;

  /**
   * Genera un hash de la contraseña usando bcrypt
   * @param password - Contraseña en texto plano
   * @returns Promise<string> - Hash de la contraseña
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Generar salt y hash
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);

      logger.debug('Password hashed successfully');
      return hashedPassword;

    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verifica si una contraseña coincide con su hash
   * @param password - Contraseña en texto plano
   * @param hashedPassword - Hash almacenado
   * @returns Promise<boolean> - true si coinciden, false si no
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      // Validar entradas
      if (!password || !hashedPassword) {
        logger.warn('Invalid password or hash provided for comparison');
        return false;
      }

      const isMatch = await bcrypt.compare(password, hashedPassword);
      
      if (isMatch) {
        logger.debug('Password verification successful');
      } else {
        logger.debug('Password verification failed');
      }

      return isMatch;

    } catch (error) {
      logger.error('Error comparing password:', error);
      return false; // Por seguridad, devolver false en caso de error
    }
  }

  /**
   * Genera una contraseña temporal segura
   * @param length - Longitud de la contraseña (por defecto 12)
   * @returns string - Contraseña temporal
   */
  static generateTemporaryPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    logger.debug('Temporary password generated');
    return password;
  }

  /**
   * Verifica si un hash es válido (tiene el formato correcto de bcrypt)
   * @param hash - Hash a verificar
   * @returns boolean - true si es un hash válido
   */
  static isValidHash(hash: string): boolean {
    // Los hashes de bcrypt tienen un formato específico: $2a$, $2b$, $2x$, $2y$
    const bcryptRegex = /^\$2[abyxy]?\$[0-9]{2}\$[A-Za-z0-9\.\/]{53}$/;
    return bcryptRegex.test(hash);
  }

  /**
   * Obtiene información sobre un hash de bcrypt
   * @param hash - Hash a analizar
   * @returns object - Información del hash
   */
  static getHashInfo(hash: string): {
    isValid: boolean;
    version?: string;
    rounds?: number;
  } {
    if (!this.isValidHash(hash)) {
      return { isValid: false };
    }

    const parts = hash.split('$');
    return {
      isValid: true,
      version: parts[1],
      rounds: parseInt(parts[2], 10),
    };
  }

  /**
   * Constantes para usar en validaciones externas
   */
  static get PASSWORD_MIN_LENGTH() { return this.MIN_PASSWORD_LENGTH; }
  static get PASSWORD_MAX_LENGTH() { return this.MAX_PASSWORD_LENGTH; }
}

// Exportar funciones individuales para compatibilidad
export const hashPassword = BcryptUtil.hashPassword.bind(BcryptUtil);
export const comparePassword = BcryptUtil.comparePassword.bind(BcryptUtil);
export const generateTemporaryPassword = BcryptUtil.generateTemporaryPassword.bind(BcryptUtil);

export default BcryptUtil;