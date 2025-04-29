import { create } from "zustand";

type ShowcaseUser = {
  name: string;
  email: string;
};

interface CollaborationRoomState {
  ui: {
    show: boolean;
  };
  user: ShowcaseUser | undefined;
  room: string | undefined;
  setShowUi: (newShowUI: boolean) => void;
  setUser: (newUser: ShowcaseUser | undefined) => void;
  setRoom: (newRoom: string | undefined) => void;
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
}));
