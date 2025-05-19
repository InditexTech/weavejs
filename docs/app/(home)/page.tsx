import type { HTMLAttributes, ReactNode } from "react";
import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import Image from "next/image";
// import ArchImg from "./arch.png";
import PlaceholderImg from "./placeholder.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeBlock } from "@/components/ui/code-block";
// import Threads from "@/src/Backgrounds/Threads/Threads";
import { LinkButton, PreviewImages } from "./page.client";
// import Feature1Img from "./feature.1.png";
// import Feature2Img from "./feature.2.png";

export default function HomePage() {
  return (
    <>
      {/* <div className="absolute left-0 top-0 right-0 h-screen z-1">
        <Threads amplitude={2} distance={0} enableMouseInteraction={false} />
      </div> */}
      <main className="container relative max-w-[1400px] py-4 z-[2] lg:py-0">
        <div className="flex flex-col justify-start items-center">
          <div className="max-w-[1200px] relative w-full flex justify-center items-center">
            <Hero />
          </div>
          <Architecture />
          <OpenSource />
          <Features />
          <Faq />
          <End />
        </div>
      </main>
    </>
  );
}

function Hero() {
  return (
    <div className="max-w-[800px] relative z-[2] flex flex-col justify-center items-center px-6 pt-[56px] text-center md:px-12 md:pt-[96px] [.uwu_&]:hidden max-lg:overflow-hidden">
      <h1 className="mb-[32px] text-[48px] leading-[56px] font-light md:hidden">
        Build collaborative canvas applications
      </h1>
      <h1 className="mb-[32px] max-md:hidden">
        <span className="text-[48px] leading-[56px] font-light">
          Build collaborative canvas applications
        </span>
      </h1>
      <p className="mb-8 !font-light leading-[28px] text-black md:text-[20px]">
        Created for developers, Weave.js is an open-source library that provides
        all the building blocks, plugins, and APIs to develop visual
        collaborative tools at the speed of light.
      </p>
      <div className="w-full flex justify-center items-center gap-3 max-md:mx-auto">
        <LinkButton
          href="https://weavejs.cloud.inditex.com"
          external
          variant="outline"
        >
          Check the Demo
        </LinkButton>
        <LinkButton href="/docs/main/quickstart" variant="default" style="main">
          Getting started
        </LinkButton>
      </div>
      <PreviewImages />
    </div>
  );
}

function Architecture() {
  return (
    <div className="max-w-[1200px] rounded-b-md flex flex-col justify-center items-center gap-4 border-0 px-0 py-0 md:py-0 md:pt-[188px] lg:flex-col md:px-0">
      <div>
        <h2 className="font-light text-[32px] leading-[40px] uppercase text-center">
          Get started in three steps
        </h2>
        <div className="mt-[16px] font-light text-[20px] leading-[28px] text-center">
          Weave.js toolset provides a complete canvas experience.
          <br />
          Extend, customize and develop on top.
        </div>
      </div>
      {/* <div className="mt-[24px]">
        <Image
          src={PlaceholderImg}
          alt="Architecture"
          className="ms-auto max-w-[450px] invert-0 dark:invert"
        />
      </div> */}
      <div className="w-full grid grid-cols-1 gap-[80px] md:grid-cols-3 my-12 rounded-md overflow-hidden">
        <div className="bg-white dark:bg-black flex flex-col gap-3 justify-between items-start">
          <div className="flex flex-col gap-3">
            <div className={cn(badgeVariants())}>1</div>
            <h3 className="text-[20px] leading-[28px] font-light">
              Create the backend.
            </h3>
            <p className="text-[16px] leading-[22px] font-light md:min-h-[72px] ">
              Initialize the backend boilerplate server, using Express to handle
              the real-time synchronization.
            </p>
            <CodeBlock
              wrapper={{ className: "w-full my-0" }}
              lang="bash"
              code="pnpm create weavejs-backend-app"
            />
          </div>
        </div>
        <div className="bg-white dark:bg-black flex flex-col gap-3 justify-between items-start">
          <div className="flex flex-col gap-3">
            <div className={cn(badgeVariants())}>2</div>
            <h3 className="text-[20px] leading-[28px] font-light">
              Create the frontend.
            </h3>
            <p className="text-[16px] leading-[22px] font-light md:min-h-[72px]">
              Initialize the frontend application boilerplate, using Next.js as
              the UI framework.
            </p>
            <CodeBlock
              wrapper={{ className: "w-full my-0" }}
              lang="bash"
              code="pnpm create weavejs-frontend-app"
            />
          </div>
        </div>
        <div className="bg-white dark:bg-black flex flex-col gap-3 justify-between items-end">
          <div className="w-full flex flex-col gap-3">
            <div className={cn(badgeVariants())}>3</div>
            <h3 className="text-[20px] leading-[28px] font-light">Build it.</h3>
            <p className="text-[16px] leading-[22px] font-light md:min-h-[72px]">
              Unlock Weave.js full potential with nodes, plugins, actions, and
              stores. All while customizing the look & feel.
            </p>
            <div className="h-[50px] flex justify-end items-end">
              <LinkButton
                href="/docs/main/quickstart"
                variant="default"
                style="main"
              >
                Quickstart
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpenSource() {
  return (
    <div className="w-full mt-[128px] py-[48px] border-black border-t-[1px] border-b-[1px] flex justify-center items-center">
      <div className="max-w-[800px] flex flex-col gap-[24px]">
        <div className="text-center text-[48px] leading-[56px] font-light uppercase">
          Free & Open Source
        </div>
        <div className="text-center text-[20px] leading-[28px] font-light">
          Loved by users
          <br />
          Built for developers
        </div>
        <div className="text-center">
          <LinkButton
            href="https://github.com/InditexTech/weavejs-frontend/fork"
            variant="default"
            style="main"
          >
            Create a fork
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

const badgeVariants = cva(
  "inline-flex size-7 text-[16px] leading-[20px] font-light items-center justify-center rounded-full bg-black text-white"
);

function Features() {
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
          <div className="w-full mb-0 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
            <Image
              alt="UI Framework Agnostic"
              src={PlaceholderImg}
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
          <div className="w-full mb-0 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
            <Image
              alt="Powerful Abstractions"
              src={PlaceholderImg}
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
          <div className="w-full mb-0 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
            <Image
              alt="Source"
              src={PlaceholderImg}
              sizes="600px"
              className="w-full min-w-[400px] max-h-[400px] object-contain"
            />
          </div>
        </Feature>
        <Feature
          subheading="Light & well-built"
          heading="Fast rendering"
          description={
            <>
              <span>
                Weave.js uses Konva.js and React Reconciler under the hood to
                make canvas&apos; real-time sync and rendering a breeze.
              </span>
            </>
          }
          href="/docs/react"
        >
          <div className="w-full mb-0 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
            <Image
              alt="Source"
              src={PlaceholderImg}
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

function Faq() {
  return (
    <div className="mt-[128px] w-full max-w-[1200px] flex flex-col justify-start items-center">
      <div className="flex flex-col gap-[16px] mb-[48px]">
        <div className="text-[32px] font-light leading-[40px] text-center uppercase">
          Frequently asked questions
        </div>
        <div className="text-[16px] font-light leading-[22px] text-center">
          Have more questions? Contact us and we’ll respond as quickly as
          possible
        </div>
      </div>
      <Accordion
        type="single"
        collapsible
        className="w-full max-w-[600px] flex flex-col gap-[32px]"
      >
        <AccordionItem value="item-1" className="!border-b-0">
          <AccordionTrigger className="text-[20px] font-medium leading-[28px] !py-0">
            What type of applications can I create with Weave.js?
          </AccordionTrigger>
          <AccordionContent className="text-[16px] font-light leading-[22px] mt-[12px]">
            Weave.js is aimed at developers. It provides a framework with all
            the components, plugins, and tools to build custom whiteboards,
            canvas, and collaborative visual tools for your applications. It
            provides a set of nodes, actions, and plugins you can choose from
            and extend to your needs, so you can easily build the perfect
            whiteboard solution.
            <br />
            <br />
            Although we provide a default UI, you can customize it so the visual
            collaborative tool you build has the look & feel of your liking or
            matches your corporate identity.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2" className="!border-b-0">
          <AccordionTrigger className="text-[20px] font-medium leading-[28px] !py-0">
            Can I use Weave.js in frontend frameworks other than React?
          </AccordionTrigger>
          <AccordionContent className="text-[16px] font-light leading-[22px] mt-[12px]">
            Yes, you can use Weave.js with any UI framework, but we recommend to
            use it with React.
            <br />
            <br />
            Weave.js is framework-agnostic at its core, meaning the rendering
            and collaboration logic can be integrated into different
            environments. However, we provide and maintain a React utility to
            make the integration with React more seamlessly.
            <br />
            <br />
            If you&apos;re using another framework (like Vue or Svelte),
            integration is possible, but may require additional setup or custom
            wrappers not provided by Weave.js documentation.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3" className="!border-b-0">
          <AccordionTrigger className="text-[20px] font-medium leading-[28px] !py-0">
            Is Weave.js free to use and open source?
          </AccordionTrigger>
          <AccordionContent className="text-[16px] font-light leading-[22px] mt-[12px]">
            TODO
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4" className="!border-b-0">
          <AccordionTrigger className="text-[20px] font-medium leading-[28px] !py-0">
            Can I use Weave.js in a commercial application?
          </AccordionTrigger>
          <AccordionContent className="text-[16px] font-light leading-[22px] mt-[12px]">
            TODO
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5" className="!border-b-0">
          <AccordionTrigger className="text-[20px] font-medium leading-[28px] !py-0">
            How do I request a feature for Weave.js?
          </AccordionTrigger>
          <AccordionContent className="text-[16px] font-light leading-[22px] mt-[12px]">
            You can find us on [GitHub](link), where you can request new
            features, contribute with your own, find support, and open
            discussions that will help us improve our product further.
            <br />
            <br />
            If you liked it, don&apos;t forget to give us a :star: ;-)
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function End() {
  return (
    <div className="w-full my-[128px] py-[48px] flex justify-center items-center">
      <div className="max-w-[800px] flex flex-col gap-[24px]">
        <div className="text-center text-[48px] leading-[56px] font-light uppercase">
          Get started in minutes
        </div>
        <div className="text-center text-[20px] leading-[28px] font-light">
          Try Weave.js for yourself. Follow the quickstart and start building
          your own collaborative canvas in minutes.
        </div>
        <div className="text-center flex gap-[12px] justify-center items-center">
          <LinkButton
            href="https://weavejs.cloud.inditex.com"
            external
            variant="outline"
          >
            Check the Demo
          </LinkButton>
          <LinkButton
            href="/docs/main/quickstart"
            variant="default"
            style="main"
          >
            Getting started
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
