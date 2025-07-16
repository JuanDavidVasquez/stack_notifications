import winston, { format, transports } from 'winston';
import fs from 'fs';
import path from 'path';

const { combine, timestamp, printf, colorize } = format;

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} | ${level}: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` | ${JSON.stringify(metadata)}`;
  }
  return msg;
});

export const setupLogger = (config: any) => {
  // Create logs directory if it doesn't exist
  const logDir = path.join(process.cwd(), config.dir);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Define transport options
  const transportOptions = [
    // Console transport
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // File transport for errors
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // File transport for all logs
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
  ];

  // Create and return a custom logger instance
  const logger = winston.createLogger({
    level: config.level || 'info',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    transports: transportOptions,
    exitOnError: false,
  });

  // Add stream for Morgan HTTP logger if needed
  (logger as any).stream = {
    write: (message: string) => {
      logger.info(message.trim());
    },
  };

  return logger;
};

export default setupLogger;