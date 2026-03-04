// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export function watchMap<K, V>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (event: any) => void,
  map = new Map<K, V>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Map<K, V> {
  const handler: ProxyHandler<Map<K, V>> = {
    get(target, prop, receiver) {
      if (prop === 'set') {
        return (key: K, value: V) => {
          const had = target.has(key);
          const prev = had ? target.get(key) : undefined;
          target.set(key, value);
          onChange({
            type: had ? 'update' : 'add',
            key,
            value,
            prevValue: prev,
            size: target.size,
          });
          return receiver; // return Proxy, not raw Map
        };
      }
      if (prop === 'delete') {
        return (key: K) => {
          const had = target.has(key);
          const prev = had ? target.get(key) : undefined;
          const ok = target.delete(key);
          if (ok && had) {
            onChange({
              type: 'delete',
              key,
              prevValue: prev,
              size: target.size,
            });
          }
          return ok;
        };
      }
      if (prop === 'clear') {
        return () => {
          if (target.size > 0) {
            target.clear();
            onChange({ type: 'clear', size: 0 });
          }
        };
      }

      // default: bind functions so "this" is correct
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
  };

  return new Proxy(map, handler);
}
