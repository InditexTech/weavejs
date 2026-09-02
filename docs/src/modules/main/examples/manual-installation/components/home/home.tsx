// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

'use client'

import React from 'react'
import LoginForm from './login-form'

export const Home = () => {
  return (
    <>
      <main className="w-full h-full">
        <section className="relative flex h-full w-full flex-col items-center justify-center p-6">
          <h3 className="text-2xl font-noto-sans-mono font-extralight text-muted-foreground uppercase mb-8">
            Join a Room
          </h3>
          <LoginForm />
        </section>
      </main>
    </>
  )
}
