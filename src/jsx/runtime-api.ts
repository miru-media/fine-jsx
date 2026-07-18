// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Component, ComponentProps, MaybeChild, MaybeGetter, Stop } from '#jsx-types'

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

export const render = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  node: MaybeGetter<FineNode<TNode, TElement, TFragment, TMarker>>,
  root: TNode,
): Stop => {
  node = typeof node === 'function' ? node() : node
  node.ops.insertBefore(node.el, root, null)

  return () => {
    const { ops, scope, el } = node
    scope?.stop()
    if (!ops.isFragment(el) && ops.parentNode(el) === root) ops.remove(el)
  }
}

export type { Component, ComponentProps, MaybeChild }
export * from '#reactivity'
