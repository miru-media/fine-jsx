// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Component, ComponentProps, FineNodeChild, NodeOps } from '#jsx-types'
import { getCurrentScope } from '#reactivity'

import { currentContext, FineComponentNode, FineElementNode } from './nodes'
import { watchFineDomNode } from './utils'

export const createRuntime = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  nodeOps: NodeOps<TNode, TElement, TFragment, TMarker>,
) => {
  const jsx = (type: string | Component | TElement, props: ComponentProps): JSX.Element => {
    // Component function
    if (typeof type === 'function') return new FineComponentNode(nodeOps, type, props, currentContext)

    // DOM Element or Fragment
    const parentScope = getCurrentScope()
    if (!parentScope) throw new Error(`[fine-jsx] jsx element must be created within an EffectScope`)

    const fineNode = new FineElementNode(nodeOps, type, props, currentContext, parentScope)

    watchFineDomNode(fineNode)

    return fineNode
  }

  const Fragment = (props: { children?: FineNodeChild<TNode>[] }) => jsx('#fragment', props)

  return { jsx, jsxs: jsx, Fragment }
}
