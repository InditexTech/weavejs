import { Express } from "express";
import cors from "cors";
import { getLogger } from "../logger/logger.js";

export function setupCorsMiddleware(app: Express) {
  const logger = getLogger().child({ module: "middlewares.cors" });

  // Setup CORS configuration
  const corsOptions = {
    origin: true,
  };

  logger.info({ corsOptions }, "Setting up CORS middleware");

  app.use(cors(corsOptions));
}
