import "reflect-metadata";
import { config } from "./core/config/env";
import setupLogger from "./shared/utils/logger";
import { Server } from "./server";



const logger = setupLogger(config.logging);

async function bootstrap() {
  try {
    const server = new Server();
    await server.initialize();

    // Handle shutdown signals
    const handleShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully`);
      try {
        await server.shutdown();
        logger.info("Application terminated successfully");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
    
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Initialize application
bootstrap();