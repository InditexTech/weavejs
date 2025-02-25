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
