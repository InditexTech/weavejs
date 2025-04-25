import { Express } from "express";
import { pinoHttp } from "pino-http";
import { getLogger } from "../logger/logger.js";

export function setupHttpLoggerMiddleware(app: Express) {
  const logger = getLogger().child({ module: "middlewares.http-logger" });

  logger.info("Setting up HTTP logger middleware");

  // Setup http logger
  const httpLogger = pinoHttp({ logger: getLogger(), useLevel: "info" });
  app.use(httpLogger);
}
