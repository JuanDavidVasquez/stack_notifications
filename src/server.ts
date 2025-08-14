// src/server.ts - Archivo principal del servidor con Redis
import express, { Application, Request, Response, NextFunction } from "express";
import { createSecureServer, Http2SecureServer } from "http2";
import * as fs from "fs";
import * as path from "path";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { config } from "./core/config/env";
import setupLogger from "./shared/utils/logger";
import { apiRoutes } from "./routes";
import { initI18n, i18nMiddleware } from './i18n/middleware';
import { RedisManager } from "./core/config/database-manager";


export class Server {
    private app: Application;
    private httpServer: Http2SecureServer | null = null;
    private logger: any;
    private redisManager: RedisManager;

    constructor() {
        this.app = express();
        this.logger = setupLogger(config.logging);
        this.redisManager = RedisManager.getInstance();
    }

    public async initialize(): Promise<void> {
        try {
            this.logger.info(`Iniciando ${config.app.name} (${config.app.version}) en modo ${config.app.env}`);

            // Inicializar conexión a Redis
            this.logger.info("Inicializando la conexión a Redis...");
            await this.redisManager.initialize();
            this.logger.info("Conexión a Redis establecida correctamente");

            // Verificar conexión con ping
            const pingResponse = await this.redisManager.ping();
            this.logger.info(`Redis ping response: ${pingResponse}`);

            // Mostrar estadísticas iniciales de Redis
            const stats = await this.redisManager.getStats();
            this.logger.info("Redis stats:", stats);

            // Inicializar i18n
            await initI18n();
            this.app.use(i18nMiddleware);

            // Configurar middlewares básicos
            this.setupMiddlewares();

            // Configurar rutas
            await this.setupRoutes();

            // Configurar manejo de errores
            this.setupErrorHandling();

            // Configurar servidor HTTP/2
            await this.setupHttp2Server();

            // Configurar listeners para eventos de Redis (opcional)
            this.setupRedisListeners();

        } catch (error) {
            this.logger.error('Error al inicializar el servidor:', error);
            throw error;
        }
    }

    private async setupHttp2Server(): Promise<void> {
        // Rutas a los archivos de seguridad
        const certDir = path.join(process.cwd(), 'cert', 'development');
        const privateKeyPath = path.join(certDir, 'private.key');
        const certificatePath = path.join(certDir, 'certificate.pem');

        // Verificar que los archivos existen
        if (!fs.existsSync(privateKeyPath) || !fs.existsSync(certificatePath)) {
            throw new Error(`Archivos de seguridad no encontrados en ${certDir}. Asegúrate de que existan private.key y certificate.pem`);
        }

        // Opciones para el servidor HTTP/2
        const options = {
            key: fs.readFileSync(privateKeyPath),
            cert: fs.readFileSync(certificatePath),
            allowHTTP1: true
        };

        // Crear un servidor HTTP/2 seguro
        this.httpServer = createSecureServer(options);

        // Conectar Express con el servidor HTTP/2
        this.httpServer.on('request', (req, res) => {
            (this.app as any)(req, res);
        });

        // Manejar errores del servidor
        this.httpServer.on('error', (err) => {
            this.logger.error('Error en el servidor HTTP/2:', err);
        });

        // Iniciar el servidor HTTP/2
        const port = config.app.port;
        this.httpServer.listen(port, () => {
            this.logger.info(`🚀 Servidor HTTP/2 iniciado en el puerto ${port} (${config.app.env})`);
            this.logger.info(`📚 API disponible en https://localhost:${port}${config.api.prefix}`);
            this.logger.info(`📧 Notificaciones: https://localhost:${port}${config.api.prefix}/notifications`);
            this.logger.info(`🩺 Health Check: https://localhost:${port}${config.api.prefix}/health`);
            this.logger.info(`📊 Métricas: https://localhost:${port}${config.api.prefix}/metrics`);
        });
    }

    private setupMiddlewares(): void {
        // Middlewares de seguridad
        this.app.use(helmet({
            contentSecurityPolicy: config.app.env === 'production' ? undefined : false
        }));

        // Configuración CORS
        this.app.use(cors({
            origin: config.cors.origin,
            methods: config.cors.methods,
            credentials: true
        }));

        this.app.use(cookieParser());
        this.app.use(compression());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Rate limiting con Redis
        const limiter = this.createRedisRateLimiter();
        this.app.use(limiter);

        // Middleware para pasar RedisManager a las rutas
        this.app.use((req: Request, _res: Response, next: NextFunction) => {
            (req as any).redisManager = this.redisManager;
            next();
        });

        // Logging de solicitudes
        this.app.use((req: Request, _res: Response, next: NextFunction) => {
            const logBody = req.path.includes('/login') || req.path.includes('/password')
                ? { ...req.body, password: '[HIDDEN]' }
                : req.body;

            this.logger.info(`${req.method} ${req.url}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                body: Object.keys(logBody).length > 0 ? logBody : undefined
            });
            next();
        });
    }

    private createRedisRateLimiter() {
        // Rate limiter personalizado usando Redis
        return async (req: Request, res: Response, next: NextFunction) => {
            if (!this.redisManager.isConnected()) {
                // Si Redis no está disponible, permitir el request
                return next();
            }

            const identifier = req.ip || 'unknown';
            const key = `rate_limit:${identifier}`;
            const limit = config.api.rateLimit;
            const window = 60; // 1 minuto en segundos

            try {
                const client = this.redisManager.getClient();
                
                // Incrementar contador
                const current = await client.incr(key);
                
                // Si es el primer request, establecer TTL
                if (current === 1) {
                    await client.expire(key, window);
                }

                // Verificar límite
                if (current > limit) {
                    return res.status(429).json({
                        status: 'error',
                        message: 'Too many requests, please try again later',
                        retryAfter: window
                    });
                }

                // Agregar headers informativos
                res.setHeader('X-RateLimit-Limit', limit.toString());
                res.setHeader('X-RateLimit-Remaining', (limit - current).toString());
                res.setHeader('X-RateLimit-Reset', new Date(Date.now() + window * 1000).toISOString());

                next();
            } catch (error) {
                this.logger.error('Error en rate limiting:', error);
                // En caso de error, permitir el request
                next();
            }
        };
    }

    private setupRedisListeners(): void {
        // Suscribirse a canales de Redis para eventos del sistema
        this.redisManager.subscribe('system:shutdown', async (message) => {
            this.logger.warn('Shutdown signal received via Redis:', message);
            await this.shutdown();
        });

        this.redisManager.subscribe('system:maintenance', (message) => {
            this.logger.info('Maintenance mode signal received:', message);
            // Implementar lógica de modo mantenimiento
        });

        this.logger.info('Redis event listeners configured');
    }

    private setupErrorHandling(): void {
        this.app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
            const status = err.status || 500;
            const message = err.message || 'Error interno del servidor';

            if (status === 401 || status === 403) {
                this.logger.warn(`Auth error ${status}: ${message}`, {
                    ip: req.ip,
                    path: req.path,
                    method: req.method
                });
            } else {
                this.logger.error(`Error ${status}: ${message}`, {
                    stack: err.stack,
                    ip: req.ip,
                    path: req.path,
                    method: req.method
                });
            }

            res.status(status).json({
                status: 'error',
                message: config.app.env === 'production' && status === 500
                    ? 'Error interno del servidor'
                    : message
            });
        });
    }

    private async setupRoutes(): Promise<void> {
        // Configurar rutas de la API
        const router = await apiRoutes();
        this.app.use(config.api.prefix, router);

        // Ruta de health check mejorada con estado de Redis
        this.app.get(`${config.api.prefix}/health`, async (req: Request, res: Response) => {
            const redisStatus = this.redisManager.isConnected();
            let redisInfo = {};

            if (redisStatus) {
                try {
                    const ping = await this.redisManager.ping();
                    redisInfo = {
                        status: 'connected',
                        ping: ping
                    };
                } catch (error) {
                    redisInfo = {
                        status: 'error',
                        error: 'Failed to ping Redis'
                    };
                }
            } else {
                redisInfo = {
                    status: 'disconnected'
                };
            }

            const healthStatus = redisStatus ? 'healthy' : 'degraded';
            const httpStatus = redisStatus ? 200 : 503;

            res.status(httpStatus).json({
                status: healthStatus,
                message: 'Server health check',
                timestamp: new Date().toISOString(),
                environment: config.app.env,
                version: config.app.version,
                services: {
                    redis: redisInfo
                }
            });
        });

        // Ruta de métricas
        this.app.get(`${config.api.prefix}/metrics`, async (req: Request, res: Response) => {
            try {
                const stats = await this.redisManager.getStats();
                
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    redis: stats,
                    server: {
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        cpu: process.cpuUsage()
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to retrieve metrics'
                });
            }
        });

        // Ruta de estado de colas (específica para servicio de notificaciones)
        this.app.get(`${config.api.prefix}/queues/status`, async (req: Request, res: Response) => {
            try {
                const client = this.redisManager.getClient();
                
                // Obtener longitud de cada cola
                const emailQueueLength = await client.llen(config.redis.notifications.queues.emailQueue);
                const pushQueueLength = await client.llen(config.redis.notifications.queues.pushQueue);
                const smsQueueLength = await client.llen(config.redis.notifications.queues.smsQueue);

                res.json({
                    status: 'ok',
                    queues: {
                        email: {
                            name: config.redis.notifications.queues.emailQueue,
                            length: emailQueueLength
                        },
                        push: {
                            name: config.redis.notifications.queues.pushQueue,
                            length: pushQueueLength
                        },
                        sms: {
                            name: config.redis.notifications.queues.smsQueue,
                            length: smsQueueLength
                        }
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Error getting queue status:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to retrieve queue status'
                });
            }
        });

        this.logger.info('Routes configured successfully');
    }

    public async shutdown(): Promise<void> {
        this.logger.info("Iniciando apagado del servidor...");

        // Detener aceptación de nuevas conexiones
        if (this.httpServer) {
            await new Promise<void>((resolve, reject) => {
                this.httpServer?.close((err) => {
                    if (err) {
                        this.logger.error("Error al apagar el servidor HTTP:", err);
                        reject(err);
                    } else {
                        this.logger.info("Servidor HTTP apagado exitosamente");
                        resolve();
                    }
                });
            });
        }

        // Desuscribirse de todos los canales de Redis
        try {
            this.logger.info("Desuscribiendo de canales Redis...");
            await this.redisManager.unsubscribe();
            this.logger.info("Desuscripción completada");
        } catch (error) {
            this.logger.error("Error al desuscribirse de Redis:", error);
        }

        // Cerrar conexión a Redis
        try {
            this.logger.info("Cerrando conexión a Redis...");
            await this.redisManager.disconnect();
            this.logger.info("Conexión a Redis cerrada exitosamente");
        } catch (error) {
            this.logger.error("Error al cerrar la conexión a Redis:", error);
            throw error;
        }

        this.logger.info("Apagado completo del servidor");
    }

    // Método para obtener el RedisManager (útil para testing o uso externo)
    public getRedisManager(): RedisManager {
        return this.redisManager;
    }

    // Método para obtener la app de Express (útil para testing)
    public getApp(): Application {
        return this.app;
    }
}