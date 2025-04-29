// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type WeaveStageDropCallback = (event: DragEvent) => void;
export type WeaveStageDropUploadFileCallback = (event: File) => Promise<void>;

export type WeaveStageDropAreaPluginCallbacks = {
  onStageDrop?: WeaveStageDropCallback;
  doUploadFile?: WeaveStageDropUploadFileCallback; // TODO: MAYBE REMOVE?
};
