// SPDX-FileCopyrightText: 2025 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { type _JSXElement } from './dom/jsx-runtime-dom.ts'

declare global {
  export namespace JSX {
    type IntrinsicElements = Record<string, unknown>
    type Element = _JSXElement
  }
}

export * from './dom/jsx-runtime-dom.ts'
