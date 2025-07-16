// src/server.ts - Archivo principal del servidor
import express, { Application, Request, Response, NextFunction } from "express";
import { createSecureServer, Http2SecureServer } from "http2";
import * as fs from "fs";
import * as path from "path";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { DatabaseManager } from "./core/config/database-manager";
import { config } from "./core/config/env";
import setupLogger from "./shared/utils/logger";
import {apiRoutes} from "./routes";
import { initI18n, i18nMiddleware } from './i18n/middleware';

export class Server {
    private app: Application;
    private httpServer: Http2SecureServer | null = null;
    private logger: any;
    private databaseManager: DatabaseManager;

    constructor() {
        this.app = express();
        this.logger = setupLogger(config.logging);
        this.databaseManager = DatabaseManager.getInstance();
        
    }

    public async initialize(): Promise<void> {
        try {
            this.logger.info(`Iniciando ${config.app.name} (${config.app.version}) en modo ${config.app.env}`);

            // Inicializar conexión a la base de datos
            this.logger.info("Inicializando la conexión a la base de datos...");
            await this.databaseManager.initialize();
            this.logger.info("Conexión a la base de datos establecida correctamente");

            await initI18n();
            this.app.use(i18nMiddleware); 

            // Configurar middlewares básicos
            this.setupMiddlewares();

            // Configurar rutas
            await this.setupRoutes();

            // Configurar manejo de errores
            this.setupErrorHandling();

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
                this.logger.info(`👥 Usuarios: https://localhost:${port}${config.api.prefix}/users`);
                this.logger.info(`🩺 Health Check: https://localhost:${port}${config.api.prefix}/health`);
            });

        } catch (error) {
            this.logger.error('Error al inicializar el servidor:', error);
            throw error;
        }
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

        // Rate limiting
        const limiter = rateLimit({
            windowMs: Number(config.api.rateLimitWindow) * 60 * 1000,
            max: config.api.rateLimit,
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                status: 'error',
                message: 'Too many requests, please try again later'
            }
        });
        this.app.use(limiter);

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

    public async shutdown(): Promise<void> {
        this.logger.info("Apagando servidor...");

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

        try {
            this.logger.info("Cerrando conexión a la base de datos...");
            await this.databaseManager.disconnect();
            this.logger.info("Conexión a la base de datos cerrada exitosamente");
        } catch (error) {
            this.logger.error("Error al cerrar la conexión a la base de datos:", error);
            throw error;
        }

        this.logger.info("Apagado completo del servidor");
    }

    private async setupRoutes(): Promise<void> {
        // Configurar rutas de la API
        const router = await apiRoutes();
        this.app.use(config.api.prefix, router);

        // Ruta de health check
        this.app.get(`${config.api.prefix}/health`, (req: Request, res: Response) => {
            res.status(200).json({
                status: 'ok',
                message: 'Server is running',
                timestamp: new Date().toISOString(),
                environment: config.app.env,
                version: config.app.version
            });
        });

        this.logger.info('Routes configured successfully');
    }
}