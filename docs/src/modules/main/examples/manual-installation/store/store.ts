// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand'

type ShowcaseUser = {
  id: string
  name: string
  email: string
}

interface CollaborationRoomState {
  ui: {
    show: boolean
  }
  user: ShowcaseUser | undefined
  room: string | undefined
  setShowUi: (newShowUI: boolean) => void
  setUser: (newUser: ShowcaseUser | undefined) => void
  setRoom: (newRoom: string | undefined) => void
}

export const useCollaborationRoom = create<CollaborationRoomState>()((set) => ({
  ui: {
    show: true,
  },
  user: undefined,
  room: undefined,
  setShowUi: (newShowUI) =>
    set((state) => ({
      ...state,
      ui: { ...state.ui, show: newShowUI },
    })),
  setUser: (newUser) => set((state) => ({ ...state, user: newUser })),
  setRoom: (newRoom) => set((state) => ({ ...state, room: newRoom })),
}))
