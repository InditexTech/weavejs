import {
  Brush,
  Frame,
  ImagePlus,
  MousePointer,
  PenTool,
  Square,
  SwatchBook,
  Type,
} from "lucide-react";
import { SYSTEM_OS } from "@/lib/utils";
import { HelpShortcutElement } from "./help-shortcut-element";

export const HelpTools = () => {
  return (
    <div className="w-full grid grid-cols-3 py-3 gap-x-5">
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<MousePointer />}
          label="Select tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "S",
            [SYSTEM_OS.OTHER]: "S",
          }}
        />
        <HelpShortcutElement
          icon={<Frame />}
          label="Frame tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "F",
            [SYSTEM_OS.OTHER]: "F",
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<Square />}
          label="Rectangle tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "R",
            [SYSTEM_OS.OTHER]: "R",
          }}
        />
        <HelpShortcutElement
          icon={<PenTool />}
          label="Pen tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "L",
            [SYSTEM_OS.OTHER]: "L",
          }}
        />
        <HelpShortcutElement
          icon={<Brush />}
          label="Brush tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "B",
            [SYSTEM_OS.OTHER]: "B",
          }}
        />
        <HelpShortcutElement
          icon={<Type />}
          label="Text tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "T",
            [SYSTEM_OS.OTHER]: "T",
          }}
        />
        <HelpShortcutElement
          icon={<ImagePlus />}
          label="Image tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "I",
            [SYSTEM_OS.OTHER]: "I",
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<SwatchBook />}
          label="Color Token tool"
          shortcuts={{
            [SYSTEM_OS.MAC]: "P",
            [SYSTEM_OS.OTHER]: "P",
          }}
        />
      </div>
    </div>
  );
};
