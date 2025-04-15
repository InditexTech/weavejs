// import { Vector2d } from "konva/lib/types";
import { create } from "zustand";
// import { ContextMenuOption } from "@/components/context-menu/context-menu";

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
  // contextMenu: {
  //   show: boolean;
  //   position: Vector2d;
  //   options: ContextMenuOption[];
  // };
  setShowUi: (newShowUI: boolean) => void;
  setUser: (newUser: ShowcaseUser | undefined) => void;
  setRoom: (newRoom: string | undefined) => void;
  // setContextMenuShow: (newContextMenuShow: boolean) => void;
  // setContextMenuPosition: (newContextMenuPosition: Vector2d) => void;
  // setContextMenuOptions: (newContextMenuOptions: ContextMenuOption[]) => void;
}

export const useCollaborationRoom = create<CollaborationRoomState>()((set) => ({
  ui: {
    show: true,
  },
  user: undefined,
  room: undefined,
  // contextMenu: {
  //   show: false,
  //   position: { x: 0, y: 0 },
  //   options: [],
  // },
  setShowUi: (newShowUI) =>
    set((state) => ({
      ...state,
      ui: { ...state.ui, show: newShowUI },
    })),
  setUser: (newUser) => set((state) => ({ ...state, user: newUser })),
  setRoom: (newRoom) => set((state) => ({ ...state, room: newRoom })),
  // setContextMenuShow: (newContextMenuShow) =>
  //   set((state) => ({
  //     ...state,
  //     contextMenu: { ...state.contextMenu, show: newContextMenuShow },
  //   })),
  // setContextMenuPosition: (newContextMenuPosition) =>
  //   set((state) => ({
  //     ...state,
  //     contextMenu: { ...state.contextMenu, position: newContextMenuPosition },
  //   })),
  // setContextMenuOptions: (newContextMenuOptions) =>
  //   set((state) => ({
  //     ...state,
  //     contextMenu: { ...state.contextMenu, options: newContextMenuOptions },
  //   })),
}));
