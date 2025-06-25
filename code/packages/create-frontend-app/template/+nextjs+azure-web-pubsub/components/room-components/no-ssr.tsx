// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

'use client';

import React from 'react';
import { useMounted } from '@/components/room-components/hooks/use-mounted.tsx';

export function NoSsr({ children }) {
  const mounted = useMounted();
  if (!mounted) return null;
  return <>{children}</>;
}
