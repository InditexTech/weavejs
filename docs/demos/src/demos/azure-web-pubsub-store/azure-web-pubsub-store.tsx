// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { AzureSyncScene } from '../../weave-ui/scenes/store-scenes'
import type { DemoProps } from '../../types'

export default function AzureWebPubsubStore({ theme }: DemoProps) {
  return <AzureSyncScene theme={theme} name="azure-web-pubsub-store" />
}
