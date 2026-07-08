// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Component, ComponentProps, FineNodeChild, MaybeChild, Stop } from '#jsx-types'
import { getCurrentScope } from '#reactivity'

import { currentContext, FineComponentNode, FineDomNode, type FineNode } from './nodes.ts'
import { isDocFrag, watchFineDomNode } from './utils.ts'

export const provide = (key: string | symbol, value: unknown) => {
  if (!currentContext) throw new Error('[fine-jsx] provide() called outside component context!')

  currentContext[key] = value
}
export const inject = <T>(key: string | symbol, defaultValue?: T) => {
  if (!currentContext) throw new Error('[fine-jsx] inject() called outside component context!')

  const value = currentContext[key]
  if (value === undefined) return defaultValue
  return value as T
}

export const jsx = (type: string | Component | Element, props: ComponentProps): JSX.Element => {
  // Component function
  if (typeof type === 'function') return new FineComponentNode(type, props, currentContext)

  // DOM Element or Fragment
  const parentScope = getCurrentScope()
  if (!parentScope) throw new Error(`[fine-jsx] jsx element must be created within an EffectScope`)

  const fineNode = new FineDomNode(type, props, currentContext, parentScope)

  watchFineDomNode(fineNode)

  return fineNode
}

export const Fragment = (props: { children?: FineNodeChild[] }) => jsx('#fragment', props)

export const render = (node: JSX.Element, root: ParentNode): Stop => {
  if ((root as ParentNode | null) == null) throw new Error(`[fine-jsx] No root to render into`)

  root.appendChild((node as FineNode).el)

  return () => {
    const { scope, el } = node as FineNode
    scope?.stop()
    if (!isDocFrag(el)) root.removeChild(el)
  }
}

export { jsx as h, jsx as jsxs }
export type { Component, ComponentProps, MaybeChild }
