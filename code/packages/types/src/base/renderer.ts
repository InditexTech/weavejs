// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export abstract class WeaveRendererBase {
  protected name!: string;

  getName(): string {
    return this.name;
  }

  abstract init(): void;

  abstract render(callback?: () => void): void;
}
