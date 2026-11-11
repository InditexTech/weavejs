// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// Type-level tests: they run with `vitest --typecheck` and fail at compile time
// if an optional lifecycle hook becomes required again.

import { describe, expectTypeOf, test } from 'vitest';
import type {
  WeaveElementAttributes,
  WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '@/nodes/node';
import { WeaveAction } from '@/actions/action';
import { WeavePlugin } from '@/plugins/plugin';

class MinimalNode extends WeaveNode {
  protected nodeType = 'minimal';

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    return props as unknown as WeaveElementInstance;
  }

  onUpdate(): void {}
}

class MinimalAction extends WeaveAction {
  protected name = 'minimal';

  trigger(): void {}
}

class MinimalPlugin extends WeavePlugin {
  protected name = 'minimal';

  enable(): void {}

  disable(): void {}
}

// The `hook = undefined` pattern used across the SDK must keep compiling.
class UndefinedHooksAction extends WeaveAction {
  protected name = 'undefined-hooks';
  initialize = undefined;
  onInit = undefined;
  onPropsChange = undefined;

  trigger(): void {}
}

describe('optional lifecycle hooks', () => {
  test('subclasses do not have to implement them', () => {
    expectTypeOf<MinimalNode>().toHaveProperty('initialize');
    expectTypeOf<MinimalAction['cleanup']>().toEqualTypeOf<
      (() => void) | undefined
    >();
    expectTypeOf<MinimalPlugin['onRender']>().toEqualTypeOf<
      (() => void) | undefined
    >();
  });

  test('subclasses can still set them to undefined', () => {
    expectTypeOf<UndefinedHooksAction['onPropsChange']>().toBeUndefined();
  });
});
