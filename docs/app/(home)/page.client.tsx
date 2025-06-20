"use client";

import {
  useEffect,
  useState,
  Fragment,
  type ReactElement,
  type HTMLAttributes,
  type ReactNode,
  type HTMLProps,
} from "react";
import React from "react";
import { TerminalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import scrollIntoView from "scroll-into-view-if-needed";
import Image from "next/image";
import MainImg from "./main.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CreateAppAnimation() {
  const installCmd = "npm create fumadocs-app";
  const tickTime = 100;
  const timeCommandEnter = installCmd.length;
  const timeCommandRun = timeCommandEnter + 3;
  const timeCommandEnd = timeCommandRun + 3;
  const timeWindowOpen = timeCommandEnd + 1;
  const timeEnd = timeWindowOpen + 1;

  const [tick, setTick] = useState(timeEnd);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev >= timeEnd ? prev : prev + 1));
    }, tickTime);

    return () => {
      clearInterval(timer);
    };
  }, [timeEnd]);

  const lines: ReactElement[] = [];

  lines.push(
    <span key="command_type">
      {installCmd.substring(0, tick)}
      {tick < timeCommandEnter && (
        <div className="inline-block h-3 w-1 animate-pulse bg-white" />
      )}
    </span>
  );

  if (tick >= timeCommandEnter) {
    lines.push(<span key="space"> </span>);
  }

  if (tick > timeCommandRun)
    lines.push(
      <Fragment key="command_response">
        <span className="font-bold">┌ Create Fumadocs App</span>
        <span>│</span>
        {tick > timeCommandRun + 1 && (
          <>
            <span className="font-bold">◇ Project name</span>
            <span>│ my-app</span>
          </>
        )}
        {tick > timeCommandRun + 2 && (
          <>
            <span>│</span>
            <span className="font-bold">◆ Choose a content source</span>
          </>
        )}
        {tick > timeCommandRun + 3 && (
          <>
            <span>│ ● Fumadocs MDX</span>
            <span>│ ○ Content Collections</span>
          </>
        )}
      </Fragment>
    );

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (tick >= timeEnd) {
          setTick(0);
        }
      }}
    >
      {tick > timeWindowOpen && (
        <LaunchAppWindow className="absolute bottom-5 right-4 z-10 animate-in fade-in slide-in-from-top-10" />
      )}
      <pre className="overflow-hidden rounded-xl border text-xs">
        <div className="flex flex-row items-center gap-2 border-b px-4 py-2">
          <TerminalIcon className="size-4" />{" "}
          <span className="font-bold">Terminal</span>
          <div className="grow" />
          <div className="size-2 rounded-full bg-red-400" />
        </div>
        <div className="min-h-[200px] bg-gradient-to-b from-fd-secondary [mask-image:linear-gradient(to_bottom,white,transparent)]">
          <code className="grid p-4">{lines}</code>
        </div>
      </pre>
    </div>
  );
}

function LaunchAppWindow(
  props: HTMLAttributes<HTMLDivElement>
): React.ReactElement {
  return (
    <div
      {...props}
      className={cn(
        "overflow-hidden rounded-md border bg-fd-background shadow-xl",
        props.className
      )}
    >
      <div className="relative flex h-6 flex-row items-center border-b bg-fd-muted px-4 text-xs text-fd-muted-foreground">
        <p className="absolute inset-x-0 text-center">localhost:3000</p>
      </div>
      <div className="p-4 text-sm">New App launched!</div>
    </div>
  );
}

export function WhyInteractive(props: {
  codeblockTheme: ReactNode;
  codeblockSearchRouter: ReactNode;
  codeblockInteractive: ReactNode;
  typeTable: ReactNode;
  codeblockMdx: ReactNode;
}) {
  const [autoActive, setAutoActive] = useState(true);
  const [active, setActive] = useState(0);
  const duration = 1000 * 8;
  const items = [
    "Full-text Search",
    "Design System & Tailwind CSS",
    "Generate from TypeScript & OpenAPI",
    "Interactive Examples",
    "Automation & Server",
    "Flexible",
  ];

  useEffect(() => {
    if (!autoActive) return;
    const timer = setTimeout(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [active, autoActive, duration, items.length]);

  return (
    <div id="why-interactive" className="flex flex-col gap-6 md:flex-row">
      <div className="flex flex-col mt-1.5 border h-fit">
        {items.map((item, i) => (
          <button
            key={item}
            ref={(element) => {
              if (!element || i !== active) return;

              scrollIntoView(element, {
                behavior: "smooth",
                boundary: document.getElementById("why-interactive"),
              });
            }}
            type="button"
            className={cn(
              "inline-flex flex-col text-nowrap py-1.5 text-start text-sm text-fd-muted-foreground font-medium px-2",
              i === active
                ? "text-fd-primary-foreground bg-fd-primary"
                : "hover:text-fd-accent-foreground/80"
            )}
            onClick={() => {
              if (active === i) setAutoActive((prev) => !prev);
              else {
                setAutoActive(false);
                setActive(i);
              }
            }}
          >
            {item}
            {i === active && autoActive ? (
              <div
                className="animate-[why-interactive-x] bg-fd-primary-foreground h-1"
                style={{
                  animationDuration: `${duration.toString()}ms`,
                  animationTimingFunction: "linear",
                  animationFillMode: "forwards",
                }}
              />
            ) : null}
          </button>
        ))}
      </div>
      <style>
        {`
        @keyframes why-interactive-x {
          from {
            width: 0px;
          }
          
          to {
            width: 100%;
          }
        }`}
      </style>

      <div className="flex-1">
        {active === 0 ? (
          <WhyPanel>
            <h3 className="mb-4 text-lg font-semibold">
              Implementing search is difficult, we made it simple.
            </h3>
            <p>
              Fumadocs offers native support for Orama and Algolia Search, it is
              as easy as plugging a route handler.
            </p>
            {props.codeblockSearchRouter}
            <p className="mb-4 text-fd-muted-foreground">
              In addition, you can plug your own search modal to allow full
              control over the search UI.
            </p>
            <div className="flex flex-row items-center gap-1.5">
              <Link href="/weavejs/docs/headless/search">Check the docs</Link>
              <Link href="/weavejs/docs/ui/search">Customise UI?</Link>
            </div>
          </WhyPanel>
        ) : null}

        {active === 1 ? (
          <WhyPanel>
            <h3 className="mb-4 text-lg font-semibold">Tailwind CSS Plugin</h3>
            <p>
              Share the same design system cross the docs and your app with
              Tailwind CSS. Works great with <b>Shadcn UI</b>.
            </p>
            {props.codeblockTheme}
            <Link href="/weavejs/docs/ui/theme">See Themes</Link>
          </WhyPanel>
        ) : null}

        {active === 2 ? (
          <WhyPanel>
            <h3 className="mb-4 text-lg font-semibold">
              From the source of truth, never repeat yourself again.
            </h3>
            <p>
              Fumadocs has a smart Type Table component that renders the
              properties of interface/type automatically, powered by the
              TypeScript Compiler API.
            </p>
            {props.typeTable}
            <p>
              We also have a built-in OpenAPI playground and docs generator.
            </p>

            <div className="mt-4 flex flex-row items-center gap-1.5">
              <Link href="/weavejs/docs/ui/components/auto-type-table">
                Type Table
              </Link>
              <Link href="/weavejs/docs/ui/openapi">OpenAPI Integration</Link>
            </div>
          </WhyPanel>
        ) : null}
        {active === 3 ? (
          <WhyPanel>
            <h3 className="mb-4 text-lg font-semibold">
              Interactive docs with React.
            </h3>
            <p>
              Fumadocs offers many useful components, from File Tree, Tabs, to
              Zoomable Image.
            </p>
            {props.codeblockInteractive}
            <Link href="/weavejs/docs/ui/components">View Components</Link>
          </WhyPanel>
        ) : null}
        {active === 4 ? (
          <WhyPanel>
            <h3 className="mb-4 text-lg font-semibold">
              Connect your content and server.
            </h3>

            <p>
              React Server Component made it very easy to automate docs. Use
              server data, server components, and even client components in MDX
              documents.
            </p>

            {props.codeblockMdx}
          </WhyPanel>
        ) : null}
        {active === 5 ? (
          <WhyPanel>
            <h3 className="mb-4 text-lg font-semibold">
              Your own content source, search solution, everything.
            </h3>
            <p>
              Fumadocs is designed to be flexible, working with any content
              sources, offering powerful utilities.
              <br />
              <br />
              With our remark plugins, you can parse documents into search
              indexes, and integrate with different search solutions seamlessly.
            </p>

            <Link href="/weavejs/docs/headless/mdx/structure">
              See MDX Plugins
            </Link>
          </WhyPanel>
        ) : null}
      </div>
    </div>
  );
}

function WhyPanel(props: HTMLProps<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "duration-700 animate-in fade-in slide-in-from-left-4 text-sm",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function PreviewImages() {
  return (
    <div className="mt-[48px] mb-12 min-w-full lg:-mb-18 xl:min-w-[1100px] xl:-mx-24">
      <Image
        src={MainImg}
        alt="preview"
        priority
        className={cn(
          "w-full object-cover select-none duration-1000 animate-in fade-in slide-in-from-bottom-12"
        )}
      />
    </div>
  );
}

type LinkButtonProps = {
  className?: string;
  href: string;
  external?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  style?: "default" | "main";
  children: ReactNode;
};

export const LinkButton = ({
  className = "",
  href,
  external = false,
  variant = "default",
  style = "default",
  children,
}: Readonly<LinkButtonProps>) => {
  const router = useRouter();

  const handleStartApplicationClick = React.useCallback(() => {
    if (!external) {
      router.push(href);
    } else {
      window.open(href, "_blank", "noreferrer,noopener")?.focus();
    }
  }, [href, external, router]);

  return (
    <Button
      variant={variant}
      className={cn(
        "font-light text-[13px] uppercase cursor-pointer px-[32px] h-[40px]",
        className,
        style === "default" &&
          "bg-white dark:bg-white text-black dark:text-white hover:bg-[#ededed] dark:hover:bg-[#454545]",
        style === "main" &&
          "bg-black hover:bg-[#757575] border-zinc-950 hover:border-zinc-500 dark:bg-white dark:hover:bg-[#454545] dark:hover:text-white dark:hover:border-[#454545]"
      )}
      onClick={handleStartApplicationClick}
    >
      {children}
    </Button>
  );
};
