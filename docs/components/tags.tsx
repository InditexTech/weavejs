import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type TagColor =
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

type TagsProps = {
  children: ReactNode;
};

type TagProps = {
  color: TagColor;
  children: ReactNode;
};

export const Tags = ({ children }: Readonly<TagsProps>) => {
  return <div className="flex gap-1">{children}</div>;
};

export const Tag = ({ color, children }: Readonly<TagProps>) => {
  return (
    <div
      className={cn("px-2 py-1 text-xs rounded", {
        "bg-slate-200 text-black": color === "slate",
        "bg-gray-200 text-black": color === "gray",
        "bg-zinc-200 text-black": color === "zinc",
        "bg-neutral-200 text-black": color === "neutral",
        "bg-stone-200 text-black": color === "stone",
        "bg-red-200 text-black": color === "red",
        "bg-orange-200 text-black": color === "orange",
        "bg-amber-200 text-black": color === "amber",
        "bg-yellow-200 text-black": color === "yellow",
        "bg-lime-200 text-black": color === "lime",
        "bg-green-200 text-black": color === "green",
        "bg-emerald-200 text-black": color === "emerald",
        "bg-teal-200 text-black": color === "teal",
        "bg-cyan-200 text-black": color === "cyan",
        "bg-blue-200 text-black": color === "blue",
        "bg-indigo-200 text-black": color === "indigo",
        "bg-violet-200 text-black": color === "violet",
        "bg-purple-200 text-black": color === "purple",
        "bg-fuchsia-200 text-black": color === "fuchsia",
        "bg-pink-200 text-black": color === "pink",
        "bg-rose-200 text-black": color === "rose",
      })}
    >
      {children}
    </div>
  );
};
