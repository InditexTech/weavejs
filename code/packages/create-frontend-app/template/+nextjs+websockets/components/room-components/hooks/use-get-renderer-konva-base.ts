// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { WeaveKonvaBaseRenderer } from "@inditextech/weave-renderer-konva-base";

function useGetRendererKonvaBase() {
  const [renderer, setRenderer] = React.useState<WeaveKonvaBaseRenderer | null>(
    null,
  );

  React.useEffect(() => {
    if (!renderer) {
      const konvaBaseRenderer = new WeaveKonvaBaseRenderer();

      setRenderer(konvaBaseRenderer);
    }
  }, []);

  return renderer;
}

export default useGetRendererKonvaBase;
