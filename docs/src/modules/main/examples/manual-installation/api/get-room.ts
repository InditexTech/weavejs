// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const getRoom = async (roomId: string) => {
  const endpoint = `/api/rooms/${roomId}`
  const response = await fetch(endpoint)

  if (!response.ok && response.status === 404) {
    throw new Error(`Room doesn't exist`)
  }

  const data = await response.bytes()
  return data
}
