import type { HTMLAttributes, ReactNode } from "react";
import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import Image from "next/image";
// import ArchImg from "./arch.png";
import PlaceholderImg from "./placeholder.png";
import { type LucideIcon, PencilRulerIcon, ToyBrickIcon } from "lucide-react";
import {
  HeartIcon,
  BatteryChargingIcon,
  GithubIcon,
  LayoutIcon,
  PaperclipIcon,
  RocketIcon,
  SearchIcon,
  TimerIcon,
  BlocksIcon,
  DatabaseIcon,
} from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import Threads from "@/src/Backgrounds/Threads/Threads";
import { LinkButton, PreviewImages } from "./page.client";
import SplitText from "@/src/blocks/TextAnimations/SplitText/SplitText";
import ShinyText from "@/src/blocks/TextAnimations/ShinyText/ShinyText";
import RotatingText from "@/src/blocks/TextAnimations/RotatingText/RotatingText";
// import Feature1Img from "./feature.1.png";
// import Feature2Img from "./feature.2.png";

export default function HomePage() {
  return (
    <>
      <div className="absolute left-0 top-0 right-0 h-screen z-1">
        <Threads amplitude={2} distance={0} enableMouseInteraction={false} />
      </div>
      <main className="container relative max-w-[1100px] px-2 py-4 z-[2] lg:py-8">
        <div>
          <div className="relative">
            <Hero />
          </div>
          <Architecture />
          <div className="my-12 text-2xl w-full font-mono text-center leading-relaxed">
            Get started in three easy steps...
          </div>
          <Introduction />
          <div className="my-12 text-2xl w-full font-mono text-center leading-relaxed">
            Weave.js provides you and end-to-end solution...
          </div>
          <Features />
          <div className="my-12 text-2xl w-full font-mono text-center leading-relaxed">
            We&apos;re a complete toolbox
            <br />
            to build visual collaborative applications...
          </div>
          <Highlights />
          <End />
        </div>
      </main>
    </>
  );
}

function Hero() {
  return (
    <div className="relative z-[2] flex flex-col justify-center items-center px-6 pt-12 text-center md:px-12 md:pt-16 [.uwu_&]:hidden max-lg:overflow-hidden">
      <h1 className="mb-8 text-4xl font-medium md:hidden">
        Build your
        <br />
        <SplitText
          text="Visual Collaborative Tool"
          className="text-4xl font-medium text-center"
          delay={25}
          animationFrom={{ opacity: 0, transform: "translate3d(0,-50px,0)" }}
          animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
          threshold={0.1}
          rootMargin="50px"
        />
      </h1>
      <h1 className="mb-8 text-3xl font-medium max-md:hidden">
        <span className="font-mono text-fd-muted-foreground">build</span>
        <br />
        <span className="text-5xl">
          <SplitText
            text="Visual Collaborative Tools"
            className="text-5xl font-medium text-center"
            delay={25}
            animationFrom={{ opacity: 0, transform: "translate3d(0,-50px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
            threshold={0.1}
            rootMargin="50px"
          />
        </span>
        <br />
        <span className="font-mono text-fd-muted-foreground">
          with less effort
        </span>
      </h1>
      <p className="mb-8 font-light text-fd-muted-foreground md:max-w-[80%] md:text-xl">
        <span className="font-normal">Weave.js</span> is a visual collaborative
        framework build for Developers, flexible and performant. Your
        collaborative tool will be ready in minutes.
      </p>
      <div className="w-full flex justify-center items-center gap-3 max-md:mx-auto">
        <LinkButton href="/docs/main/quickstart" variant="default" style="main">
          <ShinyText
            text="Getting started"
            disabled={false}
            speed={3}
            className="dark:text-black"
          />
        </LinkButton>
        <LinkButton
          href="https://weavejs.cloud.inditex.com"
          external
          variant="outline"
        >
          Check the Demo
        </LinkButton>
      </div>
      <PreviewImages />
    </div>
  );
}

function Architecture() {
  return (
    <div className="rounded-b-md flex flex-col items-center gap-4 border-x border-t border-b px-8 py-8 md:py-12 md:pt-24 lg:flex-row md:px-12">
      <Image
        src={PlaceholderImg}
        alt="Architecture"
        className="ms-auto w-full max-w-[450px] invert-0 dark:invert"
      />
      <div className="shrink-0 flex-1 text-start">
        <p className="p-3 py-2 rounded-md text-sm font-mono bg-fd-primary text-fd-primary-foreground font-bold w-fit mb-4">
          Designed with <HeartIcon size={24} className="inline" />
        </p>
        <h2 className="text-xl font-semibold mb-4 sm:text-2xl">
          One framework to smooth the complexity of building visual
          collaborative tools.
        </h2>
        <p className="mb-6 font-light text-fd-muted-foreground">
          <span className="font-normal">Weave.js</span> makes it really easy to
          build beautiful visual collaborative tools, you focus on your UI and
          tool features, and we handle the rest.
          <br />
          <br />
          Every abstraction: Node, Plugin and Action is handled with love, being
          incredibly flexible and customizable, we just do the heavy-lifting for
          you.
        </p>
      </div>
    </div>
  );
}

const badgeVariants = cva(
  "inline-flex size-7 items-center justify-center rounded-full bg-zinc-600 font-medium text-fd-primary-foreground"
);

function Introduction(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-[1px] bg-[var(--border)] md:grid-cols-3 my-12 rounded-md overflow-hidden border">
      <div className="bg-white dark:bg-black flex flex-col gap-3 px-6 py-6 justify-between items-start">
        <div className="flex flex-col gap-3">
          <div className={cn(badgeVariants())}>1</div>
          <h3 className="text-xl font-semibold font-mono">
            Create the backend.
          </h3>
          <p className="mb-8 text-fd-muted-foreground">
            Initialize your project backend boilerplate, using Express as the
            server.
          </p>
        </div>
        <CodeBlock
          wrapper={{ className: "w-full my-0" }}
          lang="bash"
          code="pnpm create weavejs-backend-app"
        />
      </div>
      <div className="bg-white dark:bg-black flex flex-col gap-3 px-6 py-6 justify-between items-start">
        <div className="flex flex-col gap-3">
          <div className={cn(badgeVariants())}>2</div>
          <h3 className="text-xl font-semibold font-mono">
            Create the frontend.
          </h3>
          <p className="mb-8 text-fd-muted-foreground">
            Initialize your project frontend boilerplate, using Next.js as the
            UI framework.
          </p>
        </div>
        <CodeBlock
          wrapper={{ className: "w-full my-0" }}
          lang="bash"
          code="pnpm create weavejs-frontend-app"
        />
      </div>
      <div className="bg-white dark:bg-black flex flex-col gap-3 px-6 py-6 justify-between items-end">
        <div className="w-full flex flex-col gap-3">
          <div className={cn(badgeVariants())}>3</div>
          <h3 className="text-xl font-semibold font-mono">Build it.</h3>
          <p className="mb-8 text-fd-muted-foreground">
            Build the UI / UX for your visual collaborative tool.
          </p>
        </div>
        <LinkButton href="/docs/main/quickstart" variant="outline">
          Start your Application
        </LinkButton>
      </div>
    </div>
  );
}

function Features() {
  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
      <Feature
        icon={PaperclipIcon}
        subheading="UI Framework Agnostic"
        heading="The UI framework. Your choice"
        description={
          <>
            <span className="font-normal text-fd-foreground">
              Designed to integrate with any UI framework:{" "}
            </span>
            <span>
              Focus on the heavy-lifting and the glue-parts when it comes to
              building visual collaborative tools, you focus on your UI and tool
              features, and we handle the rest.
            </span>
          </>
        }
        className="overflow-hidden"
        href="/docs/main/architecture"
      >
        <div className="w-full mb-12 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
          <Image
            alt="UI Framework Agnostic"
            src={PlaceholderImg}
            sizes="800px"
            className="w-full min-w-[400px] max-h-[400px] object-contain"
          />
        </div>
      </Feature>
      <Feature
        icon={BlocksIcon}
        subheading="Powerful Abstractions"
        heading="The features your need, with no hassle."
        description={
          <>
            <span className="font-normal text-fd-foreground">
              Build the visual collaborative tool your users needs:{" "}
            </span>
            <span>
              Our powerful abstractions: nodes, plugins and actions pave the way
              and smooth the ride.
            </span>{" "}
            <span className="italic">
              Your users will love it, your developers will enjoy it.
            </span>
          </>
        }
        href="/docs/main/build"
      >
        <div className="w-full mb-12 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
          <Image
            alt="Powerful Abstractions"
            src={PlaceholderImg}
            sizes="800px"
            className="w-full min-w-[400px] max-h-[400px] object-contain"
          />
        </div>
      </Feature>
      <Feature
        icon={DatabaseIcon}
        subheading="Stores"
        heading="Too complex? We got you covered."
        description={
          <>
            <span className="font-normal text-fd-foreground">
              Complexity abstracted:{" "}
            </span>
            <span>
              Stores abstraction smooths the backend management and development,
              remember, the one that handles all the realtime sync of the
              shared-state?, we obfuscate all that complexity so you can focus
              on your tool.
            </span>
          </>
        }
        href="/docs/main/build/stores"
      >
        <div className="w-full mb-12 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
          <Image
            alt="Source"
            src={PlaceholderImg}
            sizes="600px"
            className="w-full min-w-[400px] max-h-[400px] object-contain"
          />
        </div>
      </Feature>
      <Feature
        icon={ToyBrickIcon}
        subheading="React Helper"
        heading="Using React? We got you covered."
        description={
          <>
            <span className="font-normal text-fd-foreground">
              Setup Weave.js on top of React:{" "}
            </span>
            <span>
              Our React Helper library focus on provide an easy way to integrate
              Weave.js on top of a React project, providing the necessary
              components (provider and a hook) to make the integration as easy
              as possible.
            </span>
          </>
        }
        href="/docs/react"
      >
        <div className="w-full mb-12 flex flex-col justify-center items-center bg-[#d9d9d9] invert-0 dark:invert">
          <Image
            alt="Source"
            src={PlaceholderImg}
            sizes="600px"
            className="w-full min-w-[400px] max-h-[400px] object-contain"
          />
        </div>
      </Feature>
    </div>
  );
}

function Feature({
  className,
  icon: Icon,
  heading,
  subheading,
  description,
  href,
  external = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  icon: LucideIcon;
  subheading: ReactNode;
  heading: ReactNode;
  description: ReactNode;
  href: string;
  external?: boolean;
}): React.ReactElement {
  return (
    <div
      className={cn("rounded-md border dark:bg-black", className)}
      {...props}
    >
      {props.children}
      <div className="p-12 pt-0">
        <div className="mb-4 inline-flex items-center gap-2 text-sm font-mono text-fd-muted-foreground">
          <Icon className="size-4" />
          <p>{subheading}</p>
        </div>
        <h2 className="mb-2 text-lg font-semibold">{heading}</h2>
        <p className="font-light text-fd-muted-foreground">{description}</p>
        <LinkButton
          className="w-full mt-4"
          href={href}
          external={external}
          variant="outline"
        >
          Learn More
        </LinkButton>
      </div>
    </div>
  );
}

function Highlights(): React.ReactElement {
  return (
    <div className="overflow-hidden grid gap-[1px] bg-[var(--border)] grid-cols-1 rounded-md border md:grid-cols-2 lg:grid-cols-3 my-12">
      <Highlight icon={LayoutIcon} heading="UI & UX first.">
        Framework UI agnostic, bring your ouw UI framework and focus on user
        experience.
      </Highlight>
      <Highlight icon={TimerIcon} heading="Fast rendering & well built.">
        Under the hood: Konva.js powerful and simple canvas rendering engine and
        the React Reconciler life-cycle makes rendering a breeze.
      </Highlight>
      <Highlight icon={PencilRulerIcon} heading="Extensible.">
        Create your own nodes, plugins and actions, or use the provided ones. As
        simple as that.
      </Highlight>
      <Highlight icon={SearchIcon} heading="Powerful Abstractions.">
        Nodes, Plugins, Actions & Stores, all of them designed to make the DX as
        smooth as possible.
      </Highlight>
      <Highlight icon={GithubIcon} heading="Open-Source powered.">
        Built using rock-start open-source libraries like Konva.js, Yjs and
        SyncedStore.
      </Highlight>
      <Highlight icon={RocketIcon} heading="Next.js First.">
        Startup CLI app and powerful documentation supported by Next.js.
      </Highlight>
    </div>
  );
}

function Highlight({
  icon: Icon,
  heading,
  children,
}: {
  icon: LucideIcon;
  heading: ReactNode;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="px-6 py-10 bg-white dark:bg-black">
      <div className="mb-4 flex flex-row items-center gap-2 text-fd-muted-foreground">
        <Icon className="size-4" />
        <h2 className="text-sm font-mono">{heading}</h2>
      </div>
      <span className="font-normal">{children}</span>
    </div>
  );
}

function End() {
  return (
    <div className="grid grid-cols-1 bg-[var(--border)] gap-[1px] rounded-md border overflow-hidden md:grid-cols-2 lg:grid-cols-12">
      <Integration className="lg:col-span-6" />
      <div className="bg-white dark:bg-black relative flex flex-col gap-8 overflow-hidden p-8 lg:col-span-6">
        <h2 className="text-3xl font-thin font-mono uppercase text-fd-muted-foreground/50">
          Build Your
          <br />
          Visual Collaborative Tool
        </h2>
        <ul className="mt-2 flex flex-col gap-6">
          <li>
            <span className="flex flex-row items-center gap-2 font-mono">
              <BatteryChargingIcon className="size-5" />
              Support guaranteed.
            </span>
            <span className="mt-2 text-sm font-light text-fd-muted-foreground">
              Actively maintained, open for contributions.
            </span>
          </li>
          <li>
            <span className="flex flex-row items-center gap-2 font-mono">
              <GithubIcon className="size-5" />
              Fully open-source.
            </span>
            <span className="mt-2 text-sm font-light text-fd-muted-foreground">
              Open source, available on Github.
            </span>
          </li>
          <li>
            <span className="flex flex-row items-center gap-2 font-mono">
              <TimerIcon className="size-5" />
              Within minutes.
            </span>
            <span className="mt-2 text-sm font-light text-fd-muted-foreground">
              Initialize a new project in a few minutes.
            </span>
          </li>
        </ul>
        <div className="grid grid-cols-1 flex-wrap gap-2 border-t pt-8">
          <LinkButton href="/docs/main" variant="outline">
            Read the docs
          </LinkButton>
          <LinkButton
            href="https://weavejs.cloud.inditex.com"
            external
            variant="outline"
          >
            Check the Demo
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function Integration({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        "bg-white dark:bg-black relative grid grid-cols-1 lg:grid-cols-1",
        className
      )}
      {...props}
    >
      <div className="col-span-full p-8">
        <p className="text-md text-3xl font-thin font-mono uppercase text-fd-muted-foreground/50">
          Available now
        </p>
        <p className="text-sm font-mono mt-5">Scaffold a backend service</p>
        <CodeBlock
          wrapper={{ className: "mt-2" }}
          lang="bash"
          code="pnpm create weave-backend-app"
        />
        <p className="text-sm font-mono">Scaffold a frontend application</p>
        <CodeBlock
          wrapper={{ className: "mt-2" }}
          lang="bash"
          code="pnpm create weave-frontend-app"
        />
      </div>
      <div className="flex flex-col gap-3 p-8 bg-[#d9d9d9] justify-center items-center invert-0 dark:invert">
        <div className="font-mono text-2xl text-zinc-800">Weave.js is</div>
        <RotatingText
          texts={["creativity", "collaborative", "simple", "synced"]}
          mainClassName="font-mono bg-red-300 text-3xl px-2 sm:px-2 md:px-3 bg-cyan-300 text-black overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
          staggerFrom={"last"}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-120%" }}
          staggerDuration={0.025}
          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          rotationInterval={2000}
        />
      </div>
      {/* <Image
        alt="Source"
        src={PlaceholderImg}
        sizes="600px"
        className="w-full min-w-[400px] max-h-[200px] object-contain bg-[#d9d9d9] invert-0 dark:invert"
      /> */}
    </div>
  );
}
