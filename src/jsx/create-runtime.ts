// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { Component, ComponentProps, FineNodeChild, NodeOps } from '#jsx-types'
import { getCurrentScope } from '#reactivity'

import { currentContext, FineComponentNode, FineElementNode } from './nodes'
import { watchFineDomNode } from './utils'

type Jsx<TNode extends object = any> = <
  T extends string | Component<Props, R, TNode> | TNode,
  Props extends Record<string, unknown> = {}, // eslint-disable-line @typescript-eslint/no-empty-object-type
  R = unknown,
>(
  type: T,
  props: T extends Component<Props, R, TNode> ? ComponentProps<Props, R, TNode> : Props,
) => JSX.Element

type Fragment<TNode extends object> = (props: { children?: FineNodeChild<TNode>[] }) => JSX.Element

export const createRuntime = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  nodeOps: NodeOps<TNode, TElement, TFragment, TMarker>,
): { jsx: Jsx<TNode>; jsxs: Jsx<TNode>; Fragment: Fragment<TNode> } => {
  const jsx: Jsx<TNode> = (type, props): JSX.Element => {
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

  const Fragment: Fragment<TNode> = (props) => jsx('#fragment', props)

  return { jsx, jsxs: jsx, Fragment }
}

export type { NodeOps, Fragment }
export { toClassName, toKebabCase } from './utils'
