// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { AzureLogger, createClientLogger } from '@azure/logger';

export const logger: AzureLogger = createClientLogger('store-azure-web-pubsub');
