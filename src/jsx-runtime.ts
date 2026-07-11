// SPDX-FileCopyrightText: 2025 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { FINE_NODE_MARKER } from './jsx/utils.ts'

declare global {
  export namespace JSX {
    type IntrinsicElements = Record<string, unknown>

    // all poperties are optional so that render functions can qualify as component return values
    interface Element {
      readonly [FINE_NODE_MARKER]?: true

      // Typescript doesn't support optional function signatures in interfaces so instead,
      // we include a property that's common to Objects and Functions so that there's
      // overlap with render functions returned from components
      toString(): string
    }
  }
}

export * from './dom/jsx-runtime-dom.ts'
