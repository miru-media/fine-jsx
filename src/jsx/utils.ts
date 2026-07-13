// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { AppendedChild, MaybeChild, NodeOps } from '#jsx-types'
import { effect, onScopeDispose, toValue, watch } from '#reactivity'

import type { FineElementNode, FineNode } from './nodes.ts'

export const FINE_NODE_MARKER = Symbol()

export const arrayFlatToValue = <T>(value: T | T[], result: T[] = []): T[] => {
  const val = toValue(value)

  if (Array.isArray(val)) val.forEach((v) => arrayFlatToValue(v, result))
  else result.push(val)

  return result
}

export const isFineNode = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  value: any,
): value is FineNode<TNode, TElement, TFragment, TMarker> => value?.[FINE_NODE_MARKER] === true

export const updateChildNode = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  ops: NodeOps<TNode, TElement, TFragment, TMarker>,
  cur: MaybeChild<TNode>,
  prev: AppendedChild<TNode, TFragment> | undefined,
) => {
  if (isFineNode<TNode, TElement, TFragment, TMarker>(cur)) return cur.el

  // return native directly without updating them. assume the parent controls all of its content
  if (ops.isNativeNode(cur)) return cur

  const prevDomNode = prev?.domNode
  const textNode =
    prevDomNode != undefined && !ops.isFragment(prevDomNode) && ops.isText(prevDomNode)
      ? prevDomNode
      : ops.createText()

  ops.setText(
    textNode,
    cur === false || cur == null
      ? ''
      : typeof cur === 'object'
        ? JSON.stringify(cur, null, '  ')
        : String(cur),
  )

  return textNode
}

export const unappend = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  ops: NodeOps<TNode, TElement, TFragment, TMarker>,
  child: AppendedChild<TNode, TFragment>,
  parent: TNode | TFragment,
) => {
  const { domNode } = child

  if (!ops.isFragment(domNode) && ops.parentNode(domNode) === parent) ops.remove(domNode)
}

export const unappendAndStop = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  ops: NodeOps<TNode, TElement, TFragment, TMarker>,
  child: AppendedChild<TNode, TFragment>,
  parent: TNode | TFragment,
) => {
  const { fineNode } = child

  unappend(ops, child, parent)
  if (isFineNode(fineNode)) fineNode.scope?.stop()
}

// https://stackoverflow.com/a/63116134
export const toKebabCase = (str: string) =>
  str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase())

/* eslint-disable @typescript-eslint/no-base-to-string */
export const toClassName = (value: unknown): string => {
  value = toValue(value)
  if (Array.isArray(value)) return value.map(toClassName).join(' ')
  return value === false ? '' : String(value ?? '')
}

export const watchFineDomNode = <
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
>(
  fineNode: FineElementNode<TNode, TElement, TFragment, TMarker>,
): void => {
  const { props } = fineNode

  if (props.children != null) {
    watch([fineNode.getChildren.bind(fineNode)], fineNode.updateChildren.bind(fineNode))
  }

  if (!fineNode.isFragment) {
    effect(fineNode.updateProps.bind(fineNode))

    if (props.ref) props.ref.value = fineNode.el
  }

  onScopeDispose(fineNode.dispose.bind(fineNode))
}
