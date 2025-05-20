"use client";

import type { HTMLAttributes, ReactNode } from "react";
import React from "react";
import Image from "next/image";
import LayersImg from "@/public/images/layers.png";
import LayersDarkImg from "@/public/images/layers_dark.png";
import Feature1Img from "@/public/images/feature_1.png";
import Feature1DarkImg from "@/public/images/feature_1_dark.png";
import Feature2Img from "@/public/images/feature_2.png";
import Feature2DarkImg from "@/public/images/feature_2_dark.png";
import Feature3Img from "@/public/images/feature_3.png";
import Feature3DarkImg from "@/public/images/feature_3_dark.png";
import Feature4Img from "@/public/images/feature_4.png";
import Feature4DarkImg from "@/public/images/feature_4_dark.png";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { LinkButton } from "./page.client";

export function Architecture() {
  const { theme } = useTheme();

  return (
    <div className="max-w-[1200px] rounded-b-md grid grid-cols-1 px-3 md:px-0 md:grid-cols-2 gap-[80px] border-0 px-0 py-0 md:py-0 pt-[64px] md:pt-[188px] lg:flex-col md:px-0">
      <div className="md:hidden mx-3 flex justify-center items-center">
        <Image
          src={theme === "dark" ? LayersDarkImg : LayersImg}
          alt="Architecture"
          className="w-full h-auto max-w-[450px]"
        />
      </div>
      <div>
        <h2 className="font-light text-[32px] leading-[40px] uppercase text-left">
          Focus on your product features, we manage the rest
        </h2>
        <div className="mt-[16px] font-light text-[20px] leading-[28px] text-left">
          Weave.js abstracts the complexity of building real-time, collaborative
          apps from scratch by handling the three core pillars of any
          collaborative visual tool:
          <br />
          <br />
          <ul className="flex flex-col gap-[16px]">
            <li className="list-disc ml-[16px]">
              <b>Shared state model that allows collaboration.</b> A structured
              data layer to model your applications&apos; needs.
            </li>
            <li className="list-disc ml-[16px]">
              <b>Real-time shared state synchronization.</b> Built-in mechanisms
              for syncing shared-state across clients using atomic diffs and
              pluggable transport layers.
            </li>
            <li className="list-disc ml-[16px]">
              <b>Rendering and interactions (User Interface).</b> A decoupled
              rendering and interaction layer with a simple API to handle shared
              state changes, user interactions, and custom behaviors. A headless
              solution (in terms of UI).
            </li>
          </ul>
        </div>
      </div>
      <div className="hidden md:flex justify-center items-center">
        <Image
          src={theme === "dark" ? LayersDarkImg : LayersImg}
          alt="Architecture"
          className="w-full h-auto max-w-[450px]"
        />
      </div>
    </div>
  );
}

export function Features() {
  const { theme } = useTheme();

  return (
    <div className="max-w-[1200px] mt-[128px] flex flex-col">
      <div className="col-span-2">
        <div className="text-center text-[32px] leading-[40px] font-light uppercase">
          An e2e solution to build collaborative
          <br />
          whiteboard applications
        </div>
      </div>
      <div className="w-full mt-[40px] grid grid-cols-1 gap-[80px] md:grid-cols-2">
        <Feature
          subheading="UI-agnostic"
          heading="Integrates with the UI framework of your choice"
          description={
            <>
              <span>
                Change the UI using our included primitives or build a new one.
                With Weave.js, you get a unified system that includes a
                high-performance, fully customizable whiteboard so you can focus
                on building the product.
              </span>
            </>
          }
          className="overflow-hidden"
          href="/docs/main/what-is-weavejs"
        >
          <div className="w-full mb-0 flex flex-col justify-center items-center">
            <Image
              alt="UI Framework Agnostic"
              src={theme === "dark" ? Feature1DarkImg : Feature1Img}
              sizes="800px"
              className="w-full min-w-[400px] max-h-[400px] object-contain"
            />
          </div>
        </Feature>
        <Feature
          subheading="Powerful abstractions"
          heading="Made for developers"
          description={
            <>
              <span>
                Keep what you need, discard the rest, and build your own. Stores
                handle the real-time sync complexity while nodes, plugins, and
                actions allow for selection, drawing, erasing, creating
                geometric shapes, and perfect freehand drawing to smooth
                development.
              </span>
            </>
          }
          href="/docs/main/build"
        >
          <div className="w-full mb-0 flex flex-col justify-center items-center">
            <Image
              alt="Powerful Abstractions"
              src={theme === "dark" ? Feature2DarkImg : Feature2Img}
              sizes="800px"
              className="w-full min-w-[400px] max-h-[400px] object-contain"
            />
          </div>
        </Feature>
        <Feature
          subheading="React Helper library"
          heading="Easy integration into React projects"
          description={
            <>
              <span>
                Our React Helper library provides all the necessary components
                to easily integrate Weave.js on top of React projects.
              </span>
            </>
          }
          href="/docs/react"
        >
          <div className="w-full mb-0 flex flex-col justify-center items-center">
            <Image
              alt="Source"
              src={theme === "dark" ? Feature3DarkImg : Feature3Img}
              sizes="600px"
              className="w-full min-w-[400px] max-h-[400px] object-contain"
            />
          </div>
        </Feature>
        <Feature
          subheading="Light & well-built"
          heading="Optimized for real-time"
          description={
            <>
              <span>
                Weave.js only syncs minimal state changes -not the full tree. It
                uses a custom React Reconciler under the hood to detect and
                transmit mutations with maximum efficiency. Lower overhead,
                higher performance for live collaboration.
              </span>
            </>
          }
          href="/docs/react"
        >
          <div className="w-full mb-0 flex flex-col justify-center items-center">
            <Image
              alt="Source"
              src={theme === "dark" ? Feature4DarkImg : Feature4Img}
              sizes="600px"
              className="w-full min-w-[400px] max-h-[400px] object-contain"
            />
          </div>
        </Feature>
      </div>
    </div>
  );
}

function Feature({
  className,
  heading,
  subheading,
  description,
  href,
  external = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  subheading: ReactNode;
  heading: ReactNode;
  description: ReactNode;
  href: string;
  external?: boolean;
}): React.ReactElement {
  return (
    <div
      className={cn("rounded-md border-0 dark:bg-black", className)}
      {...props}
    >
      {props.children}
      <div className="p-0">
        <div className="mt-[16px] inline-flex items-center gap-2 text-[11px] font-light leading-[16px] uppercase">
          <p>{subheading}</p>
        </div>
        <h2 className="mt-[8px] text-[20px] font-light leading-[28px]">
          {heading}
        </h2>
        <p className="mt-[16px] text-[16px] font-light leading-[22px]">
          {description}
        </p>
        <div className="w-full text-left mt-[16px]">
          <LinkButton
            href={href}
            external={external}
            variant="link"
            className="!px-[0px]"
          >
            Learn More
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
