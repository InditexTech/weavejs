import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import Image from "next/image";
import GithubImg from "@/public/images/github.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeBlock } from "@/components/ui/code-block";
import { LinkButton, PreviewImages } from "./page.client";
import { Architecture, Features } from "./page-components";

export default function HomePage() {
  return (
    <>
      <main className="container relative max-w-[1400px] py-4 z-[2] lg:py-0">
        <div className="flex flex-col justify-start items-center">
          <div className="max-w-[1200px] relative w-full flex justify-center items-center">
            <Hero />
          </div>
          <Architecture />
          <GetStarted />
          <OpenSource />
          <Features />
          <Faq />
        </div>
      </main>
      <End />
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
      <p className="mb-8 font-light leading-[28px] text-black dark:text-white md:text-[20px]">
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
          Open the Demo
        </LinkButton>
        <LinkButton href="/docs/main/quickstart" variant="default" style="main">
          Getting started
        </LinkButton>
      </div>
      <PreviewImages />
    </div>
  );
}

function GetStarted() {
  return (
    <div className="max-w-[1200px] rounded-b-md flex flex-col justify-center items-center gap-4 border-0 px-0 pt-[128px] lg:flex-col md:px-0">
      <div>
        <h2 className="font-light text-[32px] leading-[40px] uppercase text-center">
          Get started in three easy steps...
        </h2>
        <div className="mt-[16px] font-light text-[20px] leading-[28px] text-center">
          Weave.js toolset provides a complete canvas experience.
          <br />
          Extend, customize and develop on top.
        </div>
      </div>
      <div className="w-full px-3 md:px-0 grid grid-cols-1 gap-[80px] md:grid-cols-3 mt-12 rounded-md overflow-hidden">
        <div className="bg-white dark:bg-black flex flex-col gap-3 justify-between items-start">
          <div className="flex flex-col gap-3">
            <div className={cn(badgeVariants())}>1</div>
            <h3 className="text-[20px] leading-[28px] font-light">
              Create the backend
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
              Create the frontend
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
            <h3 className="text-[20px] leading-[28px] font-light">Build it</h3>
            <p className="text-[16px] leading-[22px] font-light md:min-h-[72px]">
              Unlock Weave.js full potential with nodes, plugins, actions, and
              stores. All while customizing the look & feel.
            </p>
            <div className="h-[50px] flex justify-start items-end">
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
    <div className="w-full mt-[128px] py-[48px] border-black dark:border-white border-t-[1px] border-b-[1px] flex justify-center items-center">
      <div className="max-w-[800px] flex flex-col gap-[24px] justify-center items-center">
        <div className="text-center text-[48px] leading-[56px] font-light uppercase">
          Free & Open Source
        </div>
        <div className="text-center text-[20px] leading-[28px] font-light">
          Weave.js is actively maintained and open for contributions.
          <br /> It comes with best-in-class documentation and developer
          experience.
        </div>
        <div>
          <Image
            src={GithubImg}
            width={40}
            height={40}
            alt="Github logo"
            className="ms-auto max-w-[450px] invert-0 dark:invert"
          />
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
  "inline-flex size-7 text-[16px] leading-[20px] font-light items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
);

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
            Yes, Weave.js is free to use and open source. It is distributed
            under the Apache 2.0 License, which means you can use, modify, and
            distribute the software. When using Weave.js, remember to comply
            with the license: simply provide a copy of the License, include the
            required notices, and indicate any modifications you make to the
            Weave.js code.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4" className="!border-b-0">
          <AccordionTrigger className="text-[20px] font-medium leading-[28px] !py-0">
            Can I use Weave.js in a commercial application?
          </AccordionTrigger>
          <AccordionContent className="text-[16px] font-light leading-[22px] mt-[12px]">
            Yes, you can use Weave.js in a commercial application. The Apache
            2.0 License is a permissive license that allows its use in all types
            of applications.
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
    <div className="w-full my-[128px] mb-0 py-[128px] text-white bg-black dark:bg-white dark:text-black flex justify-center items-center">
      <div className="max-w-[800px] flex flex-col gap-[24px]">
        <div className="text-center text-[48px] leading-[56px] font-light uppercase">
          Get started in minutes
        </div>
        <div className="text-center text-[20px] leading-[28px] font-light">
          Try Weave.js for yourself. Follow the quickstart and start building
          your own collaborative canvas in minutes.
        </div>
        <div className="text-center flex gap-[12px] justify-center items-center">
          <LinkButton href="/docs/main/quickstart" variant="outline">
            Go to Quickstart
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
