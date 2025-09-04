// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// DOM utils types

export type DOMElement = HTMLElement | Element | null;

export type WeaveAsyncElement = {
  type: string;
  status: 'loading' | 'loaded';
};
