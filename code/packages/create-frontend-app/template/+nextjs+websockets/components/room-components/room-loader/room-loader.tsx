'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '@/components/utils/logo';
import React from 'react';
import ScrollVelocity from '@/components/ui/reactbits/TextAnimations/ScrollVelocity/ScrollVelocity';

type RoomLoaderProps = {
  roomId?: string;
  content: string;
  description?: React.ReactNode;
};

const containerVariants = {
  hidden: {
    opacity: 1,
    filter: 'blur(10px)',
    transition: { duration: 2, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0 },
  },
  visible: {
    opacity: 1,
    filter: 'blur(0)',
    transition: {
      duration: 1,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.3,
    },
  },
};

const childVariants = {
  hidden: {
    filter: 'blur(10px)',
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  visible: {
    filter: 'blur(0)',
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
      className="w-full h-full flex justify-center items-center overflow-hidden"
    >
      <div className="absolute top-0 left-[-100px] right-[-100px] bottom-0 flex justify-center items-center">
        <ScrollVelocity
          texts={[
            'collaborative - easy to use - extensible - visual - open source -',
            'this is weave.js - this is weave.js - this is weave.js - this is weave.js -',
            'intuitive - free - html5 canvas - real time - powerful -',
          ]}
          velocity={150}
          numCopies={20}
          className="text-5xl font-questrial font-extralight text-zinc-500/25"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-full flex justify-center items-center">
        <div className="flex flex-col items-center justify-center min-w-[320px] px-6 py-6 bg-white border-2 shadow-md border-zinc-500 rounded-xl">
          <motion.div variants={childVariants}>
            <Logo kind="large" variant="no-text" />
          </motion.div>

          <div className="w-full flex flex-col justify-center items-center text-black gap-0 mt-2">
            <div className="font-questrial font-extralight text-3xl uppercase">
              <motion.span variants={childVariants}>{content}</motion.span>
            </div>

            {roomId && (
              <div className="font-questrial text-2xl mt-5">
                <motion.span variants={childVariants}>{roomId}</motion.span>
              </div>
            )}
            <AnimatePresence>
              {description && (
                <div className="w-full flex text-center justify-center items-center font-questrial font-extralight text-xl">
                  <motion.span
                    className="w-full"
                    variants={childVariants}
                    key="description"
                  >
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
