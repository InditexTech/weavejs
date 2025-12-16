import {
  ClipboardPaste,
  Copy,
  ClipboardCopy,
  ImageDown,
  MonitorDown,
  Undo,
  Redo,
} from "lucide-react";
import { SYSTEM_OS } from "@/lib/utils";
import { HelpShortcutElement } from "./help-shortcut-element";

export const HelpEdit = () => {
  return (
    <div className="w-full grid grid-cols-3 py-3 gap-x-5">
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<ClipboardCopy />}
          label="Copy"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⌘ C",
            [SYSTEM_OS.OTHER]: "Ctrl C",
          }}
        />
        <HelpShortcutElement
          icon={<ClipboardPaste />}
          label="Paste"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⌘ P",
            [SYSTEM_OS.OTHER]: "Ctrl P",
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<Copy />}
          label="Duplicate"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⌘ D",
            [SYSTEM_OS.OTHER]: "Ctrl D",
          }}
        />
        <HelpShortcutElement
          icon={<Undo />}
          label="Undo"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ ⌘ ,",
            [SYSTEM_OS.OTHER]: "⇧ Ctrl ,",
          }}
        />
        <HelpShortcutElement
          icon={<Redo />}
          label="Redo"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ ⌘ .",
            [SYSTEM_OS.OTHER]: "⇧ Ctrl .",
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<ImageDown />}
          label="Export selected as image"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ ⌘ E",
            [SYSTEM_OS.OTHER]: "⇧ Ctrl E",
          }}
        />
        <HelpShortcutElement
          icon={<MonitorDown />}
          label="Export viewport as image"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ ⌘ V",
            [SYSTEM_OS.OTHER]: "⇧ Ctrl V",
          }}
        />
      </div>
    </div>
  );
};
