// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export function sendEvent<T>(eventName: string, payload: T) {
  const internalEvent = new CustomEvent(eventName, { detail: payload });
  window.dispatchEvent(internalEvent);
}

export function subscribe(eventName: string, callback: (event: CustomEvent) => void) {
  window.addEventListener(eventName, callback as EventListener);
}

export function unsubscribe(eventName: string, callback: (event: CustomEvent) => void) {
  window.removeEventListener(eventName, callback as EventListener);
}
