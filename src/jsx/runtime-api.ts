// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Component, ComponentProps, MaybeChild, Stop } from '#jsx-types'

import { currentContext, type FineNode } from './nodes.ts'

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

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- false positive
export const render = <TNode extends object>(node: JSX.Element, root: TNode): Stop => {
  if ((root as ParentNode | null) == null) throw new Error(`[fine-jsx] No root to render into`)

  const node_ = node as FineNode<TNode, TNode>
  node_.ops.insertBefore(node_.el, root, null)

  return () => {
    const { ops, scope, el } = node_
    scope?.stop()
    if (!ops.isFragment(el) && ops.parentNode(el) === root) ops.remove(el)
  }
}

export type { Component, ComponentProps, MaybeChild }
export * from '#reactivity'
