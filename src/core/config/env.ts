import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Buscar en la carpeta environments en lugar de la raíz
const envDir = path.join(process.cwd(), "environments");

//Construir rutas para los posibles archivos .env

const envLocalFile = process.env.NODE_ENV
  ? path.join(envDir, `.env.${process.env.NODE_ENV}`)
  : path.join(envDir, ".env");

const envLocalPath = path.join(envDir, envLocalFile);
const defaultLocalPath = path.join(envDir, ".env.local");
const defaultEnvPath = path.join(envDir, ".env");

console.log(`NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);

// Intentar cargar en orden: .env.{NODE_ENV}.local, .env.local, .env desde la carpeta environments
let loaded = false;

if (fs.existsSync(envLocalPath)) {
  console.log(`Cargando variables desde: ${envLocalPath}`);
  dotenv.config({ path: envLocalPath });
  loaded = true;
} else if (fs.existsSync(defaultLocalPath)) {
  console.log(`Cargando variables desde: ${defaultLocalPath}`);
  dotenv.config({ path: defaultLocalPath });
  loaded = true;
} else if (fs.existsSync(defaultEnvPath)) {
  console.log(`Cargando variables desde: ${defaultEnvPath}`);
  dotenv.config({ path: defaultEnvPath });
  loaded = true;
} else {
  console.log("No se encontró ningún archivo .env en la carpeta environments");
}

export const config = {
  app: {
    name: process.env.APP_NAME || "One Lesson Per Day",
    description: process.env.APP_DESCRIPTION || "Veterinary Management System",
    version: process.env.APP_VERSION || "1.0.0",
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "4000", 10),
    baseUrl: process.env.APP_BASE_URL || "http://localhost:4000",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    supportEmail: process.env.SUPPORT_EMAIL || "suport@onelessonperday.co",
  },

  database: {
    type: process.env.DB_TYPE || "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "secret",
    name: process.env.DB_NAME || "plantilla_node_2025",
    synchronize: process.env.DB_SYNCHRONIZE === "true",
    logging: process.env.DB_LOGGING === "true",
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "1000", 1000),
    timezone: process.env.DB_TIMEZONE || "Z",
  },

  // Configuración de Redis para notificaciones y caché
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || "olpd:", // Prefijo para todas las claves
    
    // Configuración de conexión
    connection: {
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || "3", 10),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || "10000", 10),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || "5000", 10),
      keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE || "30000", 10),
      enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== "false",
    },
    
    // Configuración específica para notificaciones
    notifications: {
      enabled: process.env.REDIS_NOTIFICATIONS_ENABLED !== "false",
      channels: {
        // Canales de pub/sub para diferentes tipos de notificaciones
        userNotifications: process.env.REDIS_CHANNEL_USER_NOTIFICATIONS || "notifications:user",
        systemAlerts: process.env.REDIS_CHANNEL_SYSTEM_ALERTS || "notifications:system",
        broadcast: process.env.REDIS_CHANNEL_BROADCAST || "notifications:broadcast",
        presence: process.env.REDIS_CHANNEL_PRESENCE || "presence:updates",
      },
      ttl: {
        // TTL en segundos para diferentes tipos de datos
        notification: parseInt(process.env.REDIS_TTL_NOTIFICATION || "86400", 10), // 24 horas
        presence: parseInt(process.env.REDIS_TTL_PRESENCE || "300", 10), // 5 minutos
        cache: parseInt(process.env.REDIS_TTL_CACHE || "3600", 10), // 1 hora
        session: parseInt(process.env.REDIS_TTL_SESSION || "86400", 10), // 24 horas
      },
      queues: {
        // Configuración para colas de notificaciones
        emailQueue: process.env.REDIS_QUEUE_EMAIL || "queue:email",
        pushQueue: process.env.REDIS_QUEUE_PUSH || "queue:push",
        smsQueue: process.env.REDIS_QUEUE_SMS || "queue:sms",
        priorityLevels: {
          high: parseInt(process.env.REDIS_QUEUE_PRIORITY_HIGH || "1", 10),
          normal: parseInt(process.env.REDIS_QUEUE_PRIORITY_NORMAL || "5", 10),
          low: parseInt(process.env.REDIS_QUEUE_PRIORITY_LOW || "10", 10),
        },
      },
      // Límites de rate limiting para notificaciones
      rateLimits: {
        perUser: parseInt(process.env.REDIS_RATE_LIMIT_PER_USER || "100", 10), // Por hora
        perChannel: parseInt(process.env.REDIS_RATE_LIMIT_PER_CHANNEL || "1000", 10), // Por hora
        window: parseInt(process.env.REDIS_RATE_LIMIT_WINDOW || "3600", 10), // En segundos
      },
    },
    
    // Configuración de cluster (si se usa Redis Cluster)
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === "true",
      nodes: process.env.REDIS_CLUSTER_NODES 
        ? process.env.REDIS_CLUSTER_NODES.split(",").map(node => {
            const [host, port] = node.split(":");
            return { host, port: parseInt(port || "6379", 10) };
          })
        : [],
    },
    
    // Configuración de Sentinel (para alta disponibilidad)
    sentinel: {
      enabled: process.env.REDIS_SENTINEL_ENABLED === "true",
      masterName: process.env.REDIS_SENTINEL_MASTER || "mymaster",
      sentinels: process.env.REDIS_SENTINEL_HOSTS
        ? process.env.REDIS_SENTINEL_HOSTS.split(",").map(sentinel => {
            const [host, port] = sentinel.split(":");
            return { host, port: parseInt(port || "26379", 10) };
          })
        : [],
    },
  },

  jwt: {
    initSecret: process.env.JWT_INIT_SECRET || "un_secreto_muy_seguro_para_inicializacion",
    authSecret: process.env.JWT_AUTH_SECRET || "otro_secreto_muy_seguro_para_autenticacion",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "1d",
    frontendSecretKey: process.env.FRONTEND_SECRET_KEY || "clave_segura_para_frontend",
    useAsymmetricAlgorithm: process.env.JWT_USE_ASYMMETRIC === "true" || false,
    algorithm: process.env.JWT_ALGORITHM || "HS256",
    certsPath: process.env.JWT_CERTS_PATH || "./cert/development",
  },

  email: {
    host: process.env.EMAIL_HOST || "sandbox.smtp.mailtrap.io",
    port: parseInt(process.env.EMAIL_PORT || "2525", 10),
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER || "3b944c4cf8d08a",
    pass: process.env.EMAIL_PASS || "727837fc2dbd9d",
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    testMode: process.env.EMAIL_TEST_MODE === 'true',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: (process.env.CORS_METHODS || "GET,HEAD,PUT,PATCH,POST,DELETE").split(','),
    credentials: process.env.CORS_CREDENTIALS === "true",
  },

  logging: {
    level: process.env.LOG_LEVEL || "debug",
    format: process.env.LOG_FORMAT || "combined",
    dir: process.env.LOG_DIR || "logs",
  },

  api: {
    prefix: process.env.API_PREFIX || "/api/v1",
    rateLimit: parseInt(process.env.API_RATE_LIMIT || "100", 10),
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    supportEmail: process.env.SUPPORT_EMAIL || "suport@onelessonperday.co",
    rateLimitWindow: process.env.API_RATE_LIMIT_WINDOW || "1m",
  },

  // Configuración de WebSocket para notificaciones en tiempo real
  websocket: {
    enabled: process.env.WS_ENABLED !== "false",
    port: parseInt(process.env.WS_PORT || "4001", 10),
    path: process.env.WS_PATH || "/socket.io",
    cors: {
      origin: process.env.WS_CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: process.env.WS_CORS_CREDENTIALS !== "false",
    },
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000", 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || "25000", 10),
    maxHttpBufferSize: parseInt(process.env.WS_MAX_HTTP_BUFFER_SIZE || "1e6", 10), // 1MB
    transports: (process.env.WS_TRANSPORTS || "polling,websocket").split(","),
    allowUpgrades: process.env.WS_ALLOW_UPGRADES !== "false",
  },

  // Configuración de notificaciones push
  pushNotifications: {
    fcm: {
      enabled: process.env.FCM_ENABLED === "true",
      serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH || "./config/firebase-service-account.json",
      projectId: process.env.FCM_PROJECT_ID,
    },
    apns: {
      enabled: process.env.APNS_ENABLED === "true",
      keyPath: process.env.APNS_KEY_PATH,
      keyId: process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID,
      bundleId: process.env.APNS_BUNDLE_ID,
      production: process.env.APNS_PRODUCTION === "true",
    },
  },

  // Configuración de tareas programadas para notificaciones
  tasks: {
    cleanupTokens: {
      runOnStartup: process.env.TASK_CLEANUP_TOKENS_RUN_ON_STARTUP === "true" || true,
      schedule: process.env.TASK_CLEANUP_TOKENS_SCHEDULE || "0 0 * * *",
      enabled: process.env.TASK_CLEANUP_TOKENS_ENABLED === "false" ? false : true,
    },
    cleanupNotifications: {
      enabled: process.env.TASK_CLEANUP_NOTIFICATIONS_ENABLED !== "false",
      schedule: process.env.TASK_CLEANUP_NOTIFICATIONS_SCHEDULE || "0 2 * * *", // 2 AM
      daysToKeep: parseInt(process.env.TASK_CLEANUP_NOTIFICATIONS_DAYS || "30", 10),
    },
    processNotificationQueue: {
      enabled: process.env.TASK_PROCESS_QUEUE_ENABLED !== "false",
      schedule: process.env.TASK_PROCESS_QUEUE_SCHEDULE || "*/5 * * * *", // Cada 5 minutos
      batchSize: parseInt(process.env.TASK_PROCESS_QUEUE_BATCH_SIZE || "100", 10),
    },
    retryFailedNotifications: {
      enabled: process.env.TASK_RETRY_FAILED_ENABLED !== "false",
      schedule: process.env.TASK_RETRY_FAILED_SCHEDULE || "*/15 * * * *", // Cada 15 minutos
      maxRetries: parseInt(process.env.TASK_RETRY_FAILED_MAX_RETRIES || "3", 10),
    },
  },
};