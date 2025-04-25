"use client";

import { AnimatePresence, motion } from "framer-motion";
import Threads from "@/components/ui/reactbits/Backgrounds/Threads/Threads";
import { Logo } from "@/components/utils/logo";

type RoomLoaderProps = {
  roomId?: string;
  content: string;
  description?: string;
};

const containerVariants = {
  hidden: {
    opacity: 0,
    filter: "blur(10px)",
    transition: { duration: 2, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0 },
  },
  visible: {
    opacity: 1,
    filter: "blur(0)",
    transition: {
      duration: 1,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.3,
    },
  },
};

const childVariants = {
  hidden: {
    filter: "blur(10px)",
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  visible: {
    filter: "blur(0)",
    opacity: 1,
    transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function RoomLoader({
  roomId,
  content,
  description,
}: Readonly<RoomLoaderProps>) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={containerVariants}
      className="w-full h-full bg-white flex justify-center items-center overflow-hidden absolute"
    >
      <motion.div
        className="absolute top-0 left-0 right-0 h-full"
        variants={childVariants}
      >
        <Threads
          color={[246 / 255, 246 / 255, 246 / 255]}
          amplitude={1}
          distance={0}
          enableMouseInteraction={false}
        />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-full flex justify-center items-center">
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
          <motion.div variants={childVariants}>
            <Logo kind="large" variant="no-text" />
          </motion.div>

          <div className="flex flex-col justify-center items-center text-black gap-3">
            <div className="font-noto-sans font-extralight text-2xl uppercase">
              <motion.span variants={childVariants}>{content}</motion.span>
            </div>

            {roomId && (
              <div className="font-noto-sans text-2xl font-semibold">
                <motion.span variants={childVariants}>{roomId}</motion.span>
              </div>
            )}
            <AnimatePresence>
              {description && (
                <div className="font-noto-sans-mono text-xl">
                  <motion.span variants={childVariants} key={description}>
                    {description}
                  </motion.span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
