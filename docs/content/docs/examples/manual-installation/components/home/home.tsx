"use client";

import React from "react";
import LoginForm from "./login-form";

export const Home = () => {
  return (
    <>
      <main className="w-full h-full">
        <section
          className="relative flex h-full w-full flex-col items-center justify-center p-6"
        >
          <h3 className="text-2xl font-noto-sans-mono font-extralight text-muted-foreground uppercase mb-8">
            Join a Room
          </h3>
          <LoginForm />
        </section>
      </main>
    </>
  );
};
