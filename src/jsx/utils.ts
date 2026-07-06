// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { AppendedChild, FineNodeChild, MaybeChild } from '#jsx-types'
import { toValue } from '#reactivity'

import type { FineDomNode, FineNode } from './nodes.ts'

export const FINE_NODE_MARKER = Symbol()

export const arrayFlatToValue = <T>(value: T | T[], result: T[] = []): T[] => {
  const val = toValue(value)

  if (Array.isArray(val)) val.forEach((v) => arrayFlatToValue(v, result))
  else result.push(val)

  return result
}

export const isFineNode = (value: any): value is FineNode => value?.[FINE_NODE_MARKER] != null

const isDomNode = (value: any): value is Node =>
  value != null &&
  typeof value.nodeType === 'number' &&
  Object.prototype.toString.call(value) !== '[opbject Object]'
const isTextNode = (value: any): value is Text => {
  return isDomNode(value) && value.nodeType === 3
}

export const isDocFrag = (value: Node | DocumentFragment | undefined): value is DocumentFragment =>
  value?.nodeType === 11

export const updateChildNode = (cur: MaybeChild, prev: AppendedChild | undefined) => {
  if (isFineNode(cur)) return cur.el

  // return domeNodes directly without updating them. assume the parent controls all of its content
  if (isDomNode(cur)) return cur

  const prevTextNode = prev?.domNode
  const textNode = prevTextNode != undefined && isTextNode(prevTextNode) ? prevTextNode : new Text()

  if (cur === false || cur == null) textNode.nodeValue = ''
  else if (typeof cur === 'object') textNode.nodeValue = JSON.stringify(cur, null, '  ')
  else textNode.nodeValue = String(cur)

  return textNode
}

export const unappend = (child: AppendedChild, parent: Node) => {
  const { domNode } = child
  if (domNode.parentNode === parent) parent.removeChild(domNode)
}

export const unappendAndStop = (child: AppendedChild, parent: Node) => {
  const { fineNode } = child

  unappend(child, parent)
  if (isFineNode(fineNode)) fineNode.scope?.stop()
}

export const isIgnoredPropKey = (key: string) =>
  key === 'children' || key === 'ref' || key === 'innerHTML' || key === 'innerText'

// https://stackoverflow.com/a/63116134
export const toKebabCase = (str: string) =>
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase())

/* eslint-disable @typescript-eslint/no-base-to-string */
export const toClassName = (value: unknown): string => {
  value = toValue(value)
  if (Array.isArray(value)) return value.map(toClassName).join(' ')
  return value === false ? '' : String(value ?? '')
}

export const setAttribute = (element: Element, name: string, value: unknown) => {
  if (value == null) element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

export const updateNodeChildren = (
  fineNode: FineDomNode,
  children: (FineNodeChild | null | undefined)[],
): void => {
  const { el: element, marker, appendedNodes } = fineNode
  const appendTo = marker?.parentNode ?? element

  children.forEach((child, childIndex) => {
    const prevAppended = appendedNodes[childIndex] as AppendedChild | undefined
    const prevDomNode = prevAppended?.domNode

    const domNode = updateChildNode(child, prevAppended)
    // insert the new child at the position of the previous node (which may be the same)
    const beforeNode = isDocFrag(appendTo)
      ? null
      : ((isDocFrag(prevDomNode) ? prevDomNode[FINE_NODE_MARKER] : prevDomNode) ?? marker?.nextElementSibling)
    if (beforeNode?.parentNode === appendTo) appendTo.insertBefore(domNode, beforeNode)
    else appendTo.appendChild(domNode)

    if ((isFineNode(child) && child !== prevAppended?.fineNode) || domNode !== prevAppended?.domNode) {
      // remove the previous child if it changed
      if (prevAppended != undefined) unappendAndStop(prevAppended, appendTo)

      // update the list of appended children
      appendedNodes[childIndex] = { fineNode: child, domNode }
    }
  })

  // if there are fewer children than before, unmount the extra from before
  for (let i = children.length; i < appendedNodes.length; i++) unappendAndStop(appendedNodes[i], appendTo)
}
