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

  jwt: {
    initSecret: process.env.JWT_INIT_SECRET || "un_secreto_muy_seguro_para_inicializacion",
    authSecret: process.env.JWT_AUTH_SECRET || "otro_secreto_muy_seguro_para_autenticacion",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "1d",
    frontendSecretKey: process.env.FRONTEND_SECRET_KEY || "clave_segura_para_frontend",
    useAsymmetricAlgorithm: process.env.JWT_USE_ASYMMETRIC === "true" || false, // Cambiar default a false
    algorithm: process.env.JWT_ALGORITHM || "HS256", // Cambiar default a HS256
    certsPath: process.env.JWT_CERTS_PATH || "./cert/development", // Corregir la ruta por defecto
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

  // Nueva sección para tareas programadas
  tasks: {
    cleanupTokens: {
      runOnStartup: process.env.TASK_CLEANUP_TOKENS_RUN_ON_STARTUP === "true" || true,
      schedule: process.env.TASK_CLEANUP_TOKENS_SCHEDULE || "0 0 * * *", // Por defecto a medianoche
      enabled: process.env.TASK_CLEANUP_TOKENS_ENABLED === "false" ? false : true, // Habilitado por defecto
    },

  },
};