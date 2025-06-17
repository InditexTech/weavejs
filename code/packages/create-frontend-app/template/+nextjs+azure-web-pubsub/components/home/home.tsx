'use client';

import React from 'react';
import { Toaster } from '@/components/ui/sonner';
import { motion } from 'motion/react';
import { Logo } from '@/components/utils/logo';
import LoginForm from '../home-components/login-form';

export const Home = () => {
  return (
    <>
      <main className="w-full h-full flex justify-center items-center relative p-[40px]">
        <motion.section
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex h-full w-full flex-col items-center justify-center"
        >
          <div className="max-w-[520px] w-full flex flex-col items-center justify-between gap-0">
            <div className="w-full flex justify-between items-center gap-2 md:left-8 md:top-8 bg-background p-8 py-8 border border-[#c9c9c9]">
              <Logo kind="landscape" variant="no-text" />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col items-end justify-center"
              >
                <h1 className="text-1xl font-inter font-light text-muted-foreground uppercase">
                  SHOWCASE
                </h1>
              </motion.div>
            </div>
            <div className="w-full flex flex-col gap-2 items-center justify-center bg-background p-[32px] border border-[#c9c9c9] mt-[32px]">
              <LoginForm />
            </div>
          </div>
        </motion.section>
      </main>
      <Toaster />
    </>
  );
};
