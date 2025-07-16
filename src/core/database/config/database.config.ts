// src/core/database/config/database.config.ts
import { DataSource } from "typeorm";
import { config } from "../../config/env";
import setupLogger from "../../../shared/utils/logger";
import * as Entities from '../models';

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/database`,
});

/**
 * Configuración principal de TypeORM para la aplicación (runtime)
 * Esta instancia se usa durante la ejecución normal de la aplicación
 */
export const AppDataSource = new DataSource({
  type: config.database.type as any,
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
  
  // Configuración de sincronización y logging
  synchronize: config.database.synchronize, // Puede ser true en desarrollo
  logging: config.database.logging,
  timezone: config.database.timezone,
  
  // Rutas de entidades, migraciones y subscribers
  entities: Object.values(Entities) as (Function | string | import("typeorm").EntitySchema<any>)[],
  migrations: [
    __dirname + "/../migrations/**/*{.ts,.js}",
  ],
  subscribers: [
    __dirname + "/../subscribers/**/*{.ts,.js}",
  ],
  
  // Configuración del pool de conexiones para aplicación
  extra: {
    connectionLimit: config.database.connectionLimit, // Más conexiones para la app
    queueLimit: 0,
    waitForConnections: true,
    connectTimeout: 30000,
    acquireTimeout: 60000,
    idleTimeout: 300000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
  },
  
  // SSL configuration for production
  ssl: config.app.env === 'production' ? {
    rejectUnauthorized: true,
  } : false,
  
  // Configuración para migraciones (solo si se ejecutan automáticamente)
  migrationsRun: config.app.env === 'development', // Solo en desarrollo
  migrationsTableName: "migrations_history",
});

/**
 * Inicializa la conexión a la base de datos
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      logger.info("Connecting to database...");
      await AppDataSource.initialize();
      logger.info(`Database connection established successfully`);
      
      // Log connection details (sin password)
      logger.info("Database connection details:", {
        type: config.database.type,
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        synchronize: config.database.synchronize,
        logging: config.database.logging,
      });
    } else {
      logger.info("Database already initialized");
    }
  } catch (error) {
    logger.error("Error connecting to database:", error);
    throw error;
  }
};

/**
 * Cierra la conexión a la base de datos
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info("Database connection closed successfully");
    }
  } catch (error) {
    logger.error("Error closing database connection:", error);
    throw error;
  }
};

/**
 * Obtiene el repositorio de una entidad
 */
export const getRepository = <T>(entity: new () => T) => {
  if (!AppDataSource.isInitialized) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return AppDataSource.getRepository(entity);
};