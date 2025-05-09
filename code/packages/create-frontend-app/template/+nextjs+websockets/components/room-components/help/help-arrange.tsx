// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  BringToFront,
  ArrowUp,
  ArrowDown,
  SendToBack,
  Group,
  Ungroup,
} from "lucide-react";
import { SYSTEM_OS } from "@/lib/utils";
import { HelpShortcutElement } from "./help-shortcut-element";

export const HelpArrange = () => {
  return (
    <div className="w-full grid grid-cols-2 py-3 gap-x-5">
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<BringToFront />}
          label="Bring to front"
          shortcuts={{
            [SYSTEM_OS.MAC]: "]",
            [SYSTEM_OS.OTHER]: "]",
          }}
        />
        <HelpShortcutElement
          icon={<ArrowUp />}
          label="Move up"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⌘ ]",
            [SYSTEM_OS.OTHER]: "Ctrl ]",
          }}
        />
        <HelpShortcutElement
          icon={<ArrowDown />}
          label="Move down"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⌘ [",
            [SYSTEM_OS.OTHER]: "Ctrl [",
          }}
        />
        <HelpShortcutElement
          icon={<SendToBack />}
          label="Send to back"
          shortcuts={{
            [SYSTEM_OS.MAC]: "[",
            [SYSTEM_OS.OTHER]: "[",
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<Group />}
          label="Group selected elements"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ ⌘ G",
            [SYSTEM_OS.OTHER]: "⇧ Ctrl G",
          }}
        />
        <HelpShortcutElement
          icon={<Ungroup />}
          label="Un-group selected elements"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ ⌘ U",
            [SYSTEM_OS.OTHER]: "⇧ Ctrl U",
          }}
        />
      </div>
    </div>
  );
};
