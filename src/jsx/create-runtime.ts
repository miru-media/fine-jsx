// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Component, ComponentProps, FineNodeChild, MaybeGetter, NodeOps } from '#jsx-types'
import { getCurrentScope } from '#reactivity'

import { currentContext, FineComponentNode, FineElementNode, type FineNode } from './nodes'
import { watchFineDomNode } from './utils'

export type JSXElement<
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
> = MaybeGetter<FineNode<TNode, TElement, TFragment, TMarker>>

export interface Jsx<
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
> {
  <
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/no-unused-vars
    T extends string | Component<Props, R, TNode> | TNode,
    Props extends Record<string, unknown> = {}, // eslint-disable-line @typescript-eslint/no-empty-object-type
    R = unknown,
  >(
    type: '#fragment',
    props: { children?: FineNodeChild<TNode>[] },
  ): FineNode<TNode, TElement, TFragment, TMarker>
  <
    T extends string | Component<Props, R, TNode> | TNode,
    Props extends Record<string, unknown> = {}, // eslint-disable-line @typescript-eslint/no-empty-object-type
    R = unknown,
  >(
    type: T,
    props: T extends Component<Props, R, TNode> ? ComponentProps<Props, R, TNode> : Props,
  ): JSXElement<TNode, TElement, TFragment, TMarker>
}

type Fragment<
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
> = (props: { children?: FineNodeChild<TNode>[] }) => FineNode<TNode, TElement, TFragment, TMarker>

export const createRuntime = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  nodeOps: NodeOps<TNode, TElement, TFragment, TMarker>,
) => {
  const jsx: Jsx<TNode, TElement, TFragment, TMarker> = (type, props) => {
    // Component function
    if (typeof type === 'function')
      return new FineComponentNode(nodeOps, type as Component, props, currentContext)

    // DOM Element or Fragment
    const parentScope = getCurrentScope()
    if (!parentScope) throw new Error(`[fine-jsx] jsx element must be created within an EffectScope`)

    const fineNode = new FineElementNode(
      nodeOps,
      type as string | TElement,
      props,
      currentContext,
      parentScope,
    )

    watchFineDomNode(fineNode)

    return fineNode
  }

  const Fragment: Fragment<TNode, TElement, TFragment, TMarker> = (props) => jsx('#fragment', props)

  return { jsx, jsxs: jsx, Fragment }
}

export type { NodeOps, Fragment }
export type { JsxResult } from '#jsx-types'
export { toClassName, toKebabCase, toPascalCase } from './utils'
