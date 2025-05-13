'use client';

import type React from 'react';
import { motion } from 'framer-motion';

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => {
    const delay = 1 + i * 0.5;
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: 'spring', duration: 1.5, bounce: 0 },
        opacity: { delay, duration: 0.01 },
      },
    };
  },
};

export const HomeShowCaseAnimation: React.FC = () => {
  return (
    <motion.svg
      width="600"
      height="600"
      viewBox="0 0 600 600"
      initial="hidden"
      animate="visible"
      className="max-w-full h-auto"
    >
      <motion.rect
        x="50"
        y="50"
        width="500"
        height="500"
        rx="30"
        fill="#f0f0f0"
        stroke="#e0e0e0"
        strokeWidth="5"
      />

      <motion.path
        d="M150 400 Q150 300 300 200 Q450 300 450 400 L450 400 Q450 420 430 420 L170 420 Q150 420 150 400 Z"
        stroke="#ff6b6b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={draw}
        custom={0}
      />
      <motion.path
        d="M250 420 L250 340 Q250 320 270 320 L330 320 Q350 320 350 340 L350 420"
        stroke="#ff6b6b"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={draw}
        custom={1}
      />

      <motion.path
        d="M380 180 Q410 140 450 160 Q490 160 490 200 Q490 240 450 240 Q430 270 390 240 Q350 240 350 200 Q350 160 380 180 Z"
        stroke="#4ecdc4"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={draw}
        custom={2}
      />

      <motion.path
        d="M120 450 Q120 380 150 380 Q180 380 180 450 M150 380 Q120 340 150 300 Q180 340 150 380"
        stroke="#45b7d1"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={draw}
        custom={3}
      />
      <motion.path
        d="M470 450 Q470 380 500 380 Q530 380 530 450 M500 380 Q470 340 500 300 Q530 340 500 380"
        stroke="#45b7d1"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={draw}
        custom={4}
      />

      <motion.circle
        cx="200"
        cy="200"
        r="5"
        fill="#ff6b6b"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 5,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'reverse',
        }}
      />
      <motion.circle
        cx="400"
        cy="400"
        r="5"
        fill="#4ecdc4"
        animate={{
          x: [0, -50, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'reverse',
        }}
      />
    </motion.svg>
  );
};
