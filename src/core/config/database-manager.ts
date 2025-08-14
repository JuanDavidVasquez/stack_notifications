// src/core/config/redis-manager.ts
import { Redis, RedisOptions } from "ioredis";
import setupLogger from "../../shared/utils/logger";
import { config } from "./env";

/**
 * Clase RedisManager con patrón Singleton para gestionar la conexión a Redis
 * Implementa funcionalidades avanzadas como reconexión automática, health checks y pipelines
 */
export class RedisManager {
  private static instance: RedisManager;
  private client: Redis | null = null;
  private subscriber: Redis | null = null; // Cliente separado para pub/sub
  private initialized: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000; // 5 segundos
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/redis`,
  });

  private readonly redisOptions: RedisOptions = {
    host: config.redis.host || "localhost",
    port: config.redis.port || 6379,
    password: config.redis.password,
    db: config.redis.db || 0,
    keyPrefix: config.redis.keyPrefix,
    retryStrategy: (times: number) => {
      if (times > this.maxReconnectAttempts) {
        this.logger.error("Maximum Redis reconnection attempts reached");
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      this.logger.info(`Retrying Redis connection in ${delay}ms...`);
      return delay;
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: config.redis.connection.maxRetriesPerRequest,
    connectTimeout: config.redis.connection.connectTimeout,
    disconnectTimeout: 2000,
    commandTimeout: config.redis.connection.commandTimeout,
    keepAlive: config.redis.connection.keepAlive,
    noDelay: true,
    enableOfflineQueue: config.redis.connection.enableOfflineQueue,
    lazyConnect: false,
  };

  private constructor() {}

  /**
   * Obtener la instancia singleton del RedisManager
   */
  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Inicializa la conexión a Redis con manejo de reintentos
   */
  public async initialize(): Promise<void> {
    if (this.initialized && this.client) {
      this.logger.info("Redis manager already initialized");
      return;
    }

    try {
      this.logger.info("Initializing Redis connection...");
      await this.connect();
      
      // Iniciar health checks periódicos
      this.startHealthChecks();
      
      this.logger.info("Redis manager initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Redis manager", error);
      throw error;
    }
  }

  /**
   * Intenta conectar a Redis con reintentos automáticos
   */
  private async connect(): Promise<void> {
    try {
      // Crear cliente principal
      this.client = new Redis(this.redisOptions);
      
      // Crear cliente para suscripciones (pub/sub requiere cliente dedicado)
      this.subscriber = new Redis(this.redisOptions);

      // Configurar event listeners
      this.setupEventListeners(this.client, "main");
      this.setupEventListeners(this.subscriber, "subscriber");

      // Esperar a que ambos clientes estén listos
      await Promise.all([
        this.waitForConnection(this.client),
        this.waitForConnection(this.subscriber)
      ]);

      this.initialized = true;
      this.reconnectAttempts = 0;
      this.logger.info(`Connected to Redis at ${this.redisOptions.host}:${this.redisOptions.port}`);
    } catch (error) {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.logger.warn(
          `Redis connection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} failed. Retrying in ${this.reconnectDelay/1000} seconds...`,
          error
        );
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        
        // Incrementar el tiempo de espera exponencialmente (hasta máx 30 segundos)
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
        
        // Reintentar conexión
        return this.connect();
      } else {
        this.logger.error("Maximum Redis connection retries reached", error);
        if (error instanceof Error) {
          throw new Error(`Failed to connect to Redis after ${this.maxReconnectAttempts} attempts: ${error.message}`);
        } else {
          throw new Error(`Failed to connect to Redis after ${this.maxReconnectAttempts} attempts: Unknown error`);
        }
      }
    }
  }

  /**
   * Configura los event listeners para un cliente Redis
   */
  private setupEventListeners(client: Redis, clientType: string): void {
    client.on("connect", () => {
      this.logger.info(`Redis ${clientType} client connecting...`);
    });

    client.on("ready", () => {
      this.logger.info(`Redis ${clientType} client ready`);
    });

    client.on("error", (error) => {
      this.logger.error(`Redis ${clientType} client error:`, error);
    });

    client.on("close", () => {
      this.logger.warn(`Redis ${clientType} client connection closed`);
    });

    client.on("reconnecting", (delay: number) => {
      this.logger.info(`Redis ${clientType} client reconnecting in ${delay}ms`);
    });

    client.on("end", () => {
      this.logger.warn(`Redis ${clientType} client connection ended`);
    });
  }

  /**
   * Espera a que un cliente Redis esté listo
   */
  private async waitForConnection(client: Redis): Promise<void> {
    return new Promise((resolve, reject) => {
      if (client.status === "ready") {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Redis connection timeout"));
      }, this.redisOptions.connectTimeout || 10000);

      client.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Inicia verificaciones periódicas del estado de la conexión
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const checkInterval = 30000; // 30 segundos
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.isConnected()) {
          this.logger.warn("Redis connection lost. Attempting to reconnect...");
          this.reconnectAttempts = 0;
          this.reconnectDelay = 5000;
          await this.connect();
        } else {
          // Hacer ping para verificar la conexión
          await this.ping();
        }
      } catch (error) {
        this.logger.error("Redis health check failed", error);
      }
    }, checkInterval);

    this.logger.info(`Redis health check started (interval: ${checkInterval/1000}s)`);
  }

  /**
   * Detiene las verificaciones de estado
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.info("Redis health checks stopped");
    }
  }

  /**
   * Obtiene el cliente Redis principal
   */
  public getClient(): Redis {
    if (!this.initialized || !this.client) {
      throw new Error("Redis not initialized. Call initialize() first.");
    }
    return this.client;
  }

  /**
   * Obtiene el cliente Redis para suscripciones
   */
  public getSubscriber(): Redis {
    if (!this.initialized || !this.subscriber) {
      throw new Error("Redis not initialized. Call initialize() first.");
    }
    return this.subscriber;
  }

  /**
   * Verifica si la conexión está activa
   */
  public isConnected(): boolean {
    return !!(
      this.initialized && 
      this.client && 
      this.client.status === "ready" &&
      this.subscriber &&
      this.subscriber.status === "ready"
    );
  }

  /**
   * Cierra la conexión a Redis
   */
  public async disconnect(): Promise<void> {
    this.stopHealthChecks();
    
    const disconnectPromises: Promise<void>[] = [];

    if (this.client) {
      disconnectPromises.push(
        this.client.quit().then(() => {
          this.logger.info("Main Redis client disconnected");
        }).catch((error) => {
          this.logger.error("Error disconnecting main Redis client", error);
          return this.client!.disconnect();
        })
      );
    }

    if (this.subscriber) {
      disconnectPromises.push(
        this.subscriber.quit().then(() => {
          this.logger.info("Subscriber Redis client disconnected");
        }).catch((error) => {
          this.logger.error("Error disconnecting subscriber Redis client", error);
          return this.subscriber!.disconnect();
        })
      );
    }

    await Promise.all(disconnectPromises);
    
    this.client = null;
    this.subscriber = null;
    this.initialized = false;
    this.logger.info("Redis connection closed successfully");
  }

  /**
   * Ejecuta un pipeline de comandos Redis
   * @param commands Array de comandos para ejecutar en el pipeline
   */
  public async executePipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    const client = this.getClient();
    const pipeline = client.pipeline();
    
    for (const [command, ...args] of commands) {
      (pipeline as any)[command](...args);
    }
    
    try {
      const results = await pipeline.exec();
      if (!results) {
        throw new Error("Pipeline execution returned null");
      }
      
      // Verificar errores en los resultados
      const errors = results.filter(([err]) => err !== null);
      if (errors.length > 0) {
        this.logger.error("Pipeline execution had errors:", errors);
        throw new Error(`Pipeline execution failed: ${errors.map(([err]) => err?.message).join(", ")}`);
      }
      
      return results.map(([, result]) => result);
    } catch (error) {
      this.logger.error("Failed to execute pipeline", error);
      throw error;
    }
  }

  /**
   * Ejecuta una transacción Redis (MULTI/EXEC)
   * @param callback Función que define los comandos de la transacción
   */
  public async executeTransaction<T>(callback: (multi: any) => void): Promise<T> {
    const client = this.getClient();
    const multi = client.multi();
    
    try {
      callback(multi);
      const results = await multi.exec();
      
      if (!results) {
        throw new Error("Transaction execution returned null");
      }
      
      // Verificar errores en los resultados
      const errors = results.filter(([err]) => err !== null);
      if (errors.length > 0) {
        this.logger.warn("Transaction had errors, results may be partial:", errors);
        throw new Error(`Transaction failed: ${errors.map(([err]) => err?.message).join(", ")}`);
      }
      
      return results.map(([, result]) => result) as T;
    } catch (error) {
      this.logger.error("Failed to execute transaction", error);
      throw error;
    }
  }

  /**
   * Ejecuta un script Lua
   * @param script El script Lua a ejecutar
   * @param keys Array de keys
   * @param args Array de argumentos
   */
  public async executeScript(script: string, keys: string[] = [], args: any[] = []): Promise<any> {
    const client = this.getClient();
    
    try {
      return await client.eval(script, keys.length, ...keys, ...args);
    } catch (error) {
      this.logger.error("Failed to execute Lua script", error);
      throw error;
    }
  }

  /**
   * Reinicia la conexión a Redis
   */
  public async restart(): Promise<void> {
    this.logger.info("Restarting Redis connection...");
    await this.disconnect();
    await this.initialize();
  }

  /**
   * Hace ping al servidor Redis
   */
  public async ping(): Promise<string> {
    const client = this.getClient();
    return await client.ping();
  }

  /**
   * Obtiene información del servidor Redis
   */
  public async getInfo(section?: string): Promise<string> {
    const client = this.getClient();
    return section ? await client.info(section) : await client.info();
  }

  /**
   * Obtiene estadísticas de la conexión
   */
  public async getStats(): Promise<Record<string, any>> {
    if (!this.isConnected()) {
      return {
        status: "disconnected",
        initialized: this.initialized,
        reconnectAttempts: this.reconnectAttempts
      };
    }

    try {
      const client = this.getClient();
      const info = await this.getInfo("stats");
      const dbSize = await client.dbsize();
      const memoryInfo = await this.getInfo("memory");
      
      // Parsear información relevante
      const usedMemory = memoryInfo.match(/used_memory_human:(.+)/)?.[1]?.trim();
      const connectedClients = info.match(/connected_clients:(\d+)/)?.[1];
      const totalCommands = info.match(/total_commands_processed:(\d+)/)?.[1];
      
      return {
        status: "connected",
        initialized: this.initialized,
        host: this.redisOptions.host,
        port: this.redisOptions.port,
        database: this.redisOptions.db,
        dbSize,
        memory: {
          used: usedMemory
        },
        connections: {
          clients: connectedClients ? parseInt(connectedClients) : 0
        },
        commands: {
          processed: totalCommands ? parseInt(totalCommands) : 0
        },
        clientStatus: {
          main: this.client?.status,
          subscriber: this.subscriber?.status
        }
      };
    } catch (error) {
      this.logger.error("Failed to get Redis stats", error);
      return {
        status: "connected",
        initialized: this.initialized,
        error: "Failed to retrieve detailed stats"
      };
    }
  }

  /**
   * Métodos de utilidad para operaciones comunes
   */
  
  /**
   * Establece un valor con TTL opcional
   */
  public async set(key: string, value: any, ttl?: number): Promise<string | null> {
    const client = this.getClient();
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    
    if (ttl) {
      return await client.set(key, serialized, "EX", ttl);
    }
    return await client.set(key, serialized);
  }

  /**
   * Obtiene un valor y lo deserializa si es necesario
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const client = this.getClient();
    const value = await client.get(key);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Elimina una o varias claves
   */
  public async del(...keys: string[]): Promise<number> {
    const client = this.getClient();
    return await client.del(...keys);
  }

  /**
   * Verifica si una clave existe
   */
  public async exists(...keys: string[]): Promise<number> {
    const client = this.getClient();
    return await client.exists(...keys);
  }

  /**
   * Establece TTL en una clave
   */
  public async expire(key: string, seconds: number): Promise<number> {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  /**
   * Obtiene todas las claves que coincidan con un patrón
   */
  public async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  /**
   * Limpia toda la base de datos actual
   */
  public async flushdb(): Promise<string> {
    const client = this.getClient();
    return await client.flushdb();
  }

  /**
   * Suscribe a un canal
   */
  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.getSubscriber();
    await subscriber.subscribe(channel);
    
    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  }

  /**
   * Publica un mensaje en un canal
   */
  public async publish(channel: string, message: any): Promise<number> {
    const client = this.getClient();
    const serialized = typeof message === "string" ? message : JSON.stringify(message);
    return await client.publish(channel, serialized);
  }

  /**
   * Desuscribe de un canal
   */
  public async unsubscribe(channel?: string): Promise<void> {
    const subscriber = this.getSubscriber();
    if (channel) {
      await subscriber.unsubscribe(channel);
    } else {
      await subscriber.unsubscribe();
    }
  }

  /**
   * ========================================
   * MÉTODOS ESPECÍFICOS PARA NOTIFICACIONES
   * ========================================
   */

  /**
   * Agrega una notificación a la cola correspondiente
   * @param type Tipo de notificación (email, push, sms)
   * @param notification Datos de la notificación
   * @param priority Prioridad de la notificación
   */
  public async enqueueNotification(
    type: 'email' | 'push' | 'sms',
    notification: any,
    priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    const client = this.getClient();
    const queueMap = {
      email: config.redis.notifications.queues.emailQueue,
      push: config.redis.notifications.queues.pushQueue,
      sms: config.redis.notifications.queues.smsQueue
    };

    const queue = queueMap[type];
    const notificationData = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      data: notification,
      timestamp: new Date().toISOString(),
      attempts: 0,
      status: 'pending'
    };

    // Agregar a la cola según la prioridad
    if (priority === 'urgent' || priority === 'high') {
      // Agregar al inicio de la cola para procesamiento prioritario
      await client.lpush(queue, JSON.stringify(notificationData));
    } else {
      // Agregar al final de la cola
      await client.rpush(queue, JSON.stringify(notificationData));
    }

    // Guardar el estado de la notificación con TTL
    const statusKey = `${config.redis.keyPrefix}notification:status:${notificationData.id}`;
    await this.set(statusKey, notificationData, config.redis.notifications.ttl.notification);

    this.logger.info(`Notification enqueued: ${notificationData.id} (${type}/${priority})`);
    return notificationData.id;
  }

  /**
   * Obtiene el siguiente elemento de una cola de notificaciones
   * @param type Tipo de cola
   * @param timeout Tiempo de espera en segundos (0 = no blocking)
   */
  public async dequeueNotification(
    type: 'email' | 'push' | 'sms',
    timeout: number = 0
  ): Promise<any | null> {
    const client = this.getClient();
    const queueMap = {
      email: config.redis.notifications.queues.emailQueue,
      push: config.redis.notifications.queues.pushQueue,
      sms: config.redis.notifications.queues.smsQueue
    };

    const queue = queueMap[type];
    
    // Usar BLPOP para espera bloqueante o LPOP para no bloqueante
    let result;
    if (timeout > 0) {
      const data = await client.blpop(queue, timeout);
      result = data ? data[1] : null;
    } else {
      result = await client.lpop(queue);
    }

    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
    
    return null;
  }

  /**
   * Obtiene el estado de una notificación
   * @param notificationId ID de la notificación
   */
  public async getNotificationStatus(notificationId: string): Promise<any | null> {
    const statusKey = `${config.redis.keyPrefix}notification:status:${notificationId}`;
    return await this.get(statusKey);
  }

  /**
   * Actualiza el estado de una notificación
   * @param notificationId ID de la notificación
   * @param status Nuevo estado
   * @param additionalData Datos adicionales para guardar
   */
  public async updateNotificationStatus(
    notificationId: string,
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'retry',
    additionalData?: any
  ): Promise<void> {
    const statusKey = `${config.redis.keyPrefix}notification:status:${notificationId}`;
    const currentStatus = await this.get(statusKey);
    
    if (currentStatus) {
      const updatedStatus = {
        ...currentStatus,
        status,
        lastUpdate: new Date().toISOString(),
        ...additionalData
      };
      
      // Usar diferentes TTLs según el estado
      let ttl = config.redis.notifications.ttl.notification;
      if (status === 'failed') {
        ttl = config.redis.notifications.ttl.notification * 2; // Mantener fallidos por más tiempo
      } else if (status === 'sent') {
        ttl = config.redis.notifications.ttl.cache; // Menos tiempo para enviados
      }
      
      await this.set(statusKey, updatedStatus, ttl);
      this.logger.info(`Notification status updated: ${notificationId} -> ${status}`);
    }
  }

  /**
   * Verifica rate limit para un usuario/tipo de notificación
   * @param userId ID del usuario
   * @param type Tipo de notificación
   */
  public async checkRateLimit(userId: string, type: 'email' | 'push' | 'sms'): Promise<{
    allowed: boolean;
    remaining: number;
    resetIn: number;
  }> {
    const client = this.getClient();
    const key = `${config.redis.keyPrefix}rate_limit:${type}:${userId}`;
    const limit = config.redis.notifications.rateLimits.perUser;
    const window = config.redis.notifications.rateLimits.window;

    // Incrementar contador
    const current = await client.incr(key);
    
    // Si es el primer request, establecer TTL
    if (current === 1) {
      await client.expire(key, window);
    }
    
    // Obtener TTL restante
    const ttl = await client.ttl(key);
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetIn: ttl > 0 ? ttl : window
    };
  }

  /**
   * Obtiene estadísticas de las colas de notificaciones
   */
  public async getQueueStats(): Promise<any> {
    const client = this.getClient();
    
    const [emailLen, pushLen, smsLen] = await Promise.all([
      client.llen(config.redis.notifications.queues.emailQueue),
      client.llen(config.redis.notifications.queues.pushQueue),
      client.llen(config.redis.notifications.queues.smsQueue)
    ]);

    // Contar notificaciones por estado (usando scan para eficiencia)
    const statusCounts = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      retry: 0
    };

    const pattern = `${config.redis.keyPrefix}notification:status:*`;
    const keys = await this.keys(pattern);
    
    for (const key of keys) {
      const status = await this.get(key);
      if (status && status.status) {
        statusCounts[status.status as keyof typeof statusCounts]++;
      }
    }

    return {
      queues: {
        email: emailLen,
        push: pushLen,
        sms: smsLen,
        total: emailLen + pushLen + smsLen
      },
      status: statusCounts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mueve notificaciones fallidas a una cola de reintentos
   * @param notification Datos de la notificación
   */
  public async moveToRetryQueue(notification: any): Promise<void> {
    const client = this.getClient();
    const retryQueue = `${config.redis.keyPrefix}queue:retry`;
    
    notification.attempts = (notification.attempts || 0) + 1;
    notification.nextRetry = new Date(Date.now() + (notification.attempts * 60000)).toISOString();
    
    await client.rpush(retryQueue, JSON.stringify(notification));
    this.logger.info(`Notification moved to retry queue: ${notification.id} (attempt ${notification.attempts})`);
  }

  /**
   * Limpia notificaciones antiguas
   * @param daysToKeep Días a mantener
   */
  public async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const pattern = `${config.redis.keyPrefix}notification:status:*`;
    const keys = await this.keys(pattern);
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    let deleted = 0;

    for (const key of keys) {
      const status = await this.get(key);
      if (status && status.timestamp) {
        const notificationDate = new Date(status.timestamp);
        if (notificationDate < cutoffDate) {
          await this.del(key);
          deleted++;
        }
      }
    }

    this.logger.info(`Cleaned up ${deleted} old notifications`);
    return deleted;
  }
}