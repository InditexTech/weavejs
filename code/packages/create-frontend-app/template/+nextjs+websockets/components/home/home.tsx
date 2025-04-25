"use client";

import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { motion } from "motion/react";
import { Logo } from "@/components/utils/logo";
import LoginForm from "../home-components/login-form";
import Dither from "../ui/reactbits/Backgrounds/Dither/Dither";
import RotatingText from "../ui/reactbits/TextAnimations/RotatingText/RotatingText";

export const Home = () => {
  return (
    <>
      <main className="w-full h-full grid grid-cols-2">
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex h-full w-full flex-col items-center justify-center p-6"
        >
          <div className="absolute left-6 top-6 flex flex-col gap-2 md:left-8 md:top-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-start justify-start bg-background"
            >
              <h1 className="text-5xl font-noto-sans-mono font-extralight text-foreground uppercase">
                WHITEBOARD
              </h1>
              <h2 className="text-3xl font-noto-sans-mono font-extralight text-muted-foreground uppercase mb-8">
                SHOWCASE
              </h2>
            </motion.div>
          </div>
          <h3 className="text-2xl font-noto-sans-mono font-extralight text-muted-foreground uppercase mb-8">
            Join a Room
          </h3>
          <LoginForm />
          <div className="absolute bottom-8 left-8 flex flex-col gap-5 justify-center items-center">
            <div className="p-0 bg-light-background-1 flex justify-start items-center gap-2">
              <Logo />
            </div>
          </div>
        </motion.section>
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative items-center justify-center bg-muted"
        >
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
          <div className="absolute top-0 left-0 right-0 bottom-0 flex gap-3 justify-center items-center">
            <div className="font-noto-sans-mono bg-transparent text-black p-3 rounded-lg text-4xl">
              Weave.js is
            </div>
            <RotatingText
              texts={[
                "collaborative",
                "easy to use",
                "extensible",
                "flexible",
                "open source",
              ]}
              mainClassName="font-noto-sans-mono p-3 bg-orange-400/50 text-black overflow-hidden justify-center rounded-lg text-4xl"
              staggerFrom={"last"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitBy="characters"
              splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2000}
            />
          </div>
        </motion.aside>
      </main>
      <Toaster />
    </>
  );
};
