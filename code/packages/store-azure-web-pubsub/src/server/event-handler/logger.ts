import { AzureLogger, createClientLogger } from '@azure/logger';

export const logger: AzureLogger = createClientLogger('store-azure-web-pubsub');
