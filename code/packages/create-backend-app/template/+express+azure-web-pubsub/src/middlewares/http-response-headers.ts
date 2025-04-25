import { Express } from "express";
import helmet from "helmet";
import { getLogger } from "../logger/logger.js";

export function setupHttpResponseHeadersMiddleware(app: Express) {
  const logger = getLogger().child({
    module: "middlewares.http-response-headers",
  });

  logger.info("Setting up HTTP response headers middleware");

  // Use Helmet for setting security-related HTTP headers
  app.use(helmet());
}
