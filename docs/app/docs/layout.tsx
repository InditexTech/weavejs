import { DocsLayout } from "@/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { source } from "@/lib/source";
import React from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions}
      tree={source.pageTree}
      links={[]}
      sidebar={{
        tabs: {
          transform(option, node) {
            const meta = source.getNodeMeta(node);
            if (!meta) return option;

            const color = `var(--${meta.file.dirname}-color, var(--color-fd-foreground))`;

            return {
              ...option,
              icon: (
                <div
                  className="rounded-md p-1 shadow-none ring-0 [&_svg]:size-5"
                  style={
                    {
                      color,
                      border: `0px solid color-mix(in oklab, ${color} 50%, transparent)`,
                      "--tw-ring-color": `color-mix(in oklab, ${color} 20%, transparent)`,
                    } as object
                  }
                >
                  {React.cloneElement(node.icon as any, { strokeWidth: 1 })}
                </div>
              ),
            };
          },
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}
