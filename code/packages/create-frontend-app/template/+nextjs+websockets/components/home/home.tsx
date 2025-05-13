'use client';

import React from 'react';
import { Toaster } from '@/components/ui/sonner';
import { motion } from 'motion/react';
import { Logo } from '@/components/utils/logo';
import LoginForm from '../home-components/login-form';
import Dither from '../ui/reactbits/Backgrounds/Dither/Dither';
import RotatingText from '../ui/reactbits/TextAnimations/RotatingText/RotatingText';

export const Home = () => {
  return (
    <>
      <main className="w-full h-full flex justify-center items-center relative">
        <div className="absolute top-0 left-0 right-0 bottom-0">
          <Dither
            waveColor={[0.5, 0.5, 0.5]}
            disableAnimation={false}
            enableMouseInteraction={false}
            mouseRadius={0.3}
            colorNum={6}
            pixelSize={1}
            waveAmplitude={0.1}
            waveFrequency={6}
            waveSpeed={0.05}
          />
        </div>
        <motion.section
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex h-full w-full flex-col items-center justify-center"
        >
          <div className="max-w-[520px] w-full flex flex-col items-center justify-between gap-0">
            <div className="w-full flex justify-between items-center gap-2 md:left-8 md:top-8 bg-background p-8 py-6 rounded-xl">
              <Logo />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-end justify-center"
              >
                <h1 className="text-3xl font-questrial text-foreground uppercase">
                  WHITEBOARD
                </h1>
                <h2 className="text-2xl font-questrial font-extralight text-muted-foreground uppercase">
                  SHOWCASE
                </h2>
              </motion.div>
            </div>
            <div className="w-full flex gap-1 items-center justify-center bg-transparent">
              <RotatingText
                texts={[
                  'collaborative',
                  'easy to use',
                  'extensible',
                  'visual',
                  'open source',
                ]}
                mainClassName="font-questrial leading-[100px] w-full h-full text-black overflow-hidden justify-center items-center text-3xl"
                staggerFrom={'last'}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-120%' }}
                staggerDuration={0.025}
                splitBy="characters"
                splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                rotationInterval={2000}
              />
            </div>
            <div className="w-full flex flex-col gap-2 items-center justify-center bg-background p-8 py-10 rounded-xl">
              <LoginForm />
            </div>
          </div>
        </motion.section>
      </main>
      <Toaster />
    </>
  );
};
