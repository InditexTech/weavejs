import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import {
  Book,
  ComponentIcon,
  Database,
  Pencil,
  Blocks,
  AppWindow,
} from "lucide-react";
import Logo from "@/public/images/logo.png";
import Image from "next/image";
import Preview from "@/public/placeholder.png";

export const logo = (
  <>
    <Image
      alt="Weave.js"
      src={Logo}
      sizes="100px"
      className="w-8 md:w-8 [.uwu_&]:block"
      aria-label="Weave.js"
    />
  </>
);

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        {logo}
        <span className="font-light [.uwu_&]:hidden [header_&]:text-[20px]">
          Weave.js
        </span>
      </>
    ),
    transparentMode: "top",
  },
  links: [
    {
      type: "menu",
      text: "DOCUMENTATION",
      url: "/docs/main",
      items: [
        {
          menu: {
            banner: (
              <div className="-mx-3 -mt-3">
                <Image
                  src={Preview}
                  alt="Preview"
                  className="rounded-t-lg object-cover w-full h-[200px]"
                  style={{
                    maskImage:
                      "linear-gradient(to bottom,white 60%,transparent)",
                  }}
                />
              </div>
            ),
            className: "md:row-span-2",
          },
          icon: <Book strokeWidth={1} />,
          text: "Getting Started",
          description: "Learn how to start your project with Weave.js",
          url: "/docs/main/quickstart",
        },
        {
          icon: <ComponentIcon strokeWidth={1} />,
          text: "Nodes",
          description:
            "Core building blocks of the collaborative interface: lines, rectangles, text, images, frames, etc. Use the provided ones or build your own.",
          url: "/docs/main/build/nodes",
          menu: {
            className: "lg:col-start-2",
          },
        },
        {
          icon: <Blocks strokeWidth={1} />,
          text: "Plugins",
          description:
            "Extend and enhance the functionality of Weave.js. Add behavior to the canvas in a lightweight, composable, and easy way.",
          url: "/docs/main/build/plugins",
          menu: {
            className: "lg:col-start-2",
          },
        },
        {
          icon: <Pencil strokeWidth={1} />,
          text: "Actions",
          description:
            "Handle user interactions and user-driven changes. Actions provide a structured, trackable way to make your visual tool truly collaborative.",
          url: "/docs/main/build/actions",
          menu: {
            className: "lg:col-start-3 lg:row-start-1",
          },
        },
        {
          icon: <Database strokeWidth={1} />,
          text: "Stores",
          description:
            "Stores allow keeping users in sync. They manage changes and the state of the canvas in real time. Simple and easy.",
          url: "/docs/main/build/stores",
          menu: {
            className: "lg:col-start-3",
          },
        },
      ],
    },
    {
      icon: <AppWindow />,
      text: "DEMO",
      url: "https://weavejs.cloud.inditex.com",
      external: true,
    },
  ],
  githubUrl: "https://github.com/InditexTech/weavejs",
};
