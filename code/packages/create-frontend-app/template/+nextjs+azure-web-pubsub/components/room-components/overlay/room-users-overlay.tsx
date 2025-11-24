"use client";

import React from "react";
import { motion } from "framer-motion";
import { ConnectedUsers } from "../connected-users";
import { topElementVariants } from "./variants";
import { useCollaborationRoom } from "@/store/store";

export function RoomUsersOverlay() {
  const showUI = useCollaborationRoom((state) => state.ui.show);

  if (!showUI) {
    return null;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={topElementVariants}
      className="absolute top-2 right-2 flex flex-col gap-1 justify-center items-center"
    >
      <div className="w-[320px] min-h-[50px] p-2 py-1 bg-white border border-[#c9c9c9] flex flex-col justify-start items-center">
        <div className="w-full min-h-[40px] h-full flex flex-col justify-between items-center gap-2">
          <ConnectedUsers />
        </div>
      </div>
    </motion.div>
  );
}
