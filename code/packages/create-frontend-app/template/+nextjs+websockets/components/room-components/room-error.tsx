"use client";

import { motion } from "framer-motion";
import { Logo } from "../utils/logo";

type RoomLoaderProps = {
  content: string;
};

export function RoomError({ content }: Readonly<RoomLoaderProps>) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      >
        <Logo kind="large" variant="no-text" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col justify-center items-center"
      >
        <p className="text-lg font-semibold text-primary">AN ERROR OCCURRED</p>
        <p className="text-base text-primary">{content}</p>
      </motion.div>
    </div>
  );
}
