import { Fullscreen, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { SYSTEM_OS } from "@/lib/utils";
import { HelpShortcutElement } from "./help-shortcut-element";

export const HelpZoom = () => {
  return (
    <div className="w-full grid grid-cols-2 py-3 gap-x-5">
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<ZoomIn />}
          label="Zoom in"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⌘ +",
            [SYSTEM_OS.OTHER]: "Ctrl +",
          }}
        />
        <HelpShortcutElement
          icon={<ZoomOut />}
          label="Zoom out"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⌘ -",
            [SYSTEM_OS.OTHER]: "Ctrl -",
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<Maximize />}
          label="Fit to screen"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ 1",
            [SYSTEM_OS.OTHER]: "⇧ 1",
          }}
        />
        <HelpShortcutElement
          icon={<Fullscreen />}
          label="Fit to selection"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ 2",
            [SYSTEM_OS.OTHER]: "⇧ 2",
          }}
        />
      </div>
    </div>
  );
};
