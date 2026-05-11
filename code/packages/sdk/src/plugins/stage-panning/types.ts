// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type WeaveStagePanningPluginParams = {
  config?: Partial<WeaveStagePanningPluginConfig>;
};

export type WeaveStagePanningPluginConfig = {
  edgePan: {
    offset: number;
    speed: number;
  };
};
