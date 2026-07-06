// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createEffectScope, type EffectScope, isRef, toValue } from '#reactivity'

import { SVG_TYPES } from './svgTypes.ts'
import type {
  AppendedChild,
  Component,
  ComponentProps,
  Context,
  FineNodeChild,
  NativeElement,
  NonReadonly,
} from './types'
import {
  arrayFlatToValue,
  FINE_NODE_MARKER,
  isDocFrag,
  isFineNode,
  isIgnoredPropKey,
  setAttribute,
  toClassName,
  toKebabCase,
  unappend,
  unappendAndStop,
  updateChildNode,
} from './utils'

declare global {
  export interface DocumentFragment {
    /** @internal */
    [FINE_NODE_MARKER]?: Comment
  }
}

export let currentContext: Context | undefined
export const withContext = <T>(current: Context | undefined, fn: () => T): T => {
  const prevContext = currentContext

  currentContext = current
  const res = fn()
  currentContext = prevContext

  return res
}

export abstract class FineNode implements JSX.Element {
  readonly type: Component | string | NativeElement
  readonly scope?: EffectScope
  readonly parentContext: Context | undefined
  props: ComponentProps
  marker?: Comment
  readonly [FINE_NODE_MARKER] = true

  abstract readonly el: Node | DocumentFragment

  constructor(
    type: Component | string | NativeElement,
    props: ComponentProps,
    parentContext: Context | undefined,
    scope: EffectScope | undefined,
    marker: Comment | undefined,
  ) {
    this.type = type
    this.props = props
    this.parentContext = parentContext
    this.scope = scope
    this.marker = marker
  }
}

export class FineComponentNode extends FineNode {
  declare readonly type: Component
  declare readonly scope: EffectScope

  context: Context = undefined as never

  el!: Node | DocumentFragment

  constructor(type: Component, props: ComponentProps, parentContext?: Context) {
    super(type, props, parentContext, createEffectScope(), undefined)

    withContext((this.context = { ...this.parentContext }), () => {
      this.scope.run(() => {
        const fineNode = this.type(this.props) as FineNode
        this.el = fineNode.el
        this.marker = fineNode.marker
      })
    })
  }
}

export class FineDomNode extends FineNode {
  readonly el: Node | DocumentFragment
  readonly parentContext: Context | undefined
  readonly parentScope: EffectScope

  readonly isSvg: boolean
  readonly isFragment: boolean
  appendedNodes: AppendedChild[] = []

  constructor(
    type: string | NativeElement,
    props: ComponentProps,
    parentContext: Context | undefined,
    parentScope: EffectScope,
  ) {
    const isSvg = typeof type === 'string' && (SVG_TYPES.has(type) || type.startsWith('svg:'))
    let isFragment = false
    let element: Element | DocumentFragment
    let marker: Comment | undefined = undefined

    if (type === '#fragment') {
      element = document.createDocumentFragment()
      marker = new Comment(import.meta.env.PROD ? '' : 'fragment')
      element.appendChild(marker)
      element[FINE_NODE_MARKER] = marker
      isFragment = true
    } else if (typeof type === 'string') {
      element = isSvg
        ? document.createElementNS('http://www.w3.org/2000/svg', type.replace('svg:', ''))
        : document.createElement(type)
    } else {
      element = type
    }

    super(type, props, parentContext, undefined, marker)

    this.el = element
    this.parentContext = parentContext
    this.parentScope = parentScope
    this.isSvg = isSvg
    this.isFragment = isFragment
  }

  getChildren(): (FineNodeChild | null | undefined)[] {
    return this.parentScope.run(() =>
      withContext(this.parentContext, () => arrayFlatToValue(this.props.children)),
    )
  }

  // accepts an array whose only element is an array of children
  // this is to make it easier to use as a watch callback
  // we use object destructuring even though it's an array to avoid creating an iterator
  updateChildren({ 0: children }: [(FineNodeChild | null | undefined)[]]): void {
    const { el: element, marker, appendedNodes } = this
    const appendTo = marker?.parentNode ?? element

    children.forEach((child, childIndex) => {
      const prevAppended = appendedNodes[childIndex] as AppendedChild | undefined
      const prevDomNode = prevAppended?.domNode

      const domNode = updateChildNode(child, prevAppended)
      // insert the new child at the position of the previous node (which may be the same)
      const beforeNode = isDocFrag(appendTo)
        ? null
        : ((isDocFrag(prevDomNode) ? prevDomNode[FINE_NODE_MARKER] : prevDomNode) ??
          marker?.nextElementSibling)
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

  updateProps(): void {
    const { props, isSvg } = this
    const element = this.el as Element

    for (const key in props) {
      if (!Object.hasOwn(props, key) || isIgnoredPropKey(key)) continue

      const value = props[key]

      if (key.startsWith('on')) {
        const listener = (isRef(value) ? value.value : value) as () => unknown
        const type = key.slice(2).toLowerCase()
        element.addEventListener(type, listener)
      } else if (key === 'class' || key === 'className') {
        element.setAttribute('class', toClassName(value))
      } else if (isSvg) {
        const svgKey =
          /(Box|Type|Transform|Constant|Units|Length|Angle|Alpha|Ratio|Count|Dur|Features|Exponent|Method|Offset|Deviation|Tiles|Scale|Language|Values|targetX|targetY|Selector|edgeMode)$/.test(
            key,
          )
            ? key
            : toKebabCase(key)
        setAttribute(element, svgKey, String(toValue(value)))
      } else if (key === 'style' || !(key in element) || (key === 'list' && element.nodeName === 'INPUT')) {
        setAttribute(element, key, toValue(value) as string)
      } else {
        ;(element as any)[key] = toValue(value)
      }
    }
  }

  // component is to be unmounted
  // assume a parent component will remove it from the DOM
  dispose(): void {
    const { appendedNodes, props, marker } = this
    if (this.isFragment) {
      const parentNode = marker!.parentNode
      marker!.remove()
      if (parentNode != null) appendedNodes.forEach((node) => unappend(node, parentNode))
    }

    appendedNodes.length = 0
    if (props.ref) props.ref.value = undefined

    if (this.isFragment) return

    const element = this.el as Element

    ;(this as Partial<NonReadonly<typeof this>>).el = undefined

    for (const key in props) {
      if (!Object.hasOwn(props, key) || isIgnoredPropKey(key)) continue

      if (key.startsWith('on')) {
        const value = props[key]
        const listener = (isRef(value) ? value.value : value) as () => unknown
        const type = key.slice(2).toLowerCase()
        element.removeEventListener(type, listener)
        continue
      }

      if (this.isSvg) {
        const svgKey = key === 'viewBox' ? key : toKebabCase(key)
        element.removeAttribute(svgKey)
        continue
      }

      if (key in element && key !== 'style' && !(key === 'list' && element.nodeName === 'INPUT'))
        (element as any)[key] = null
      else element.removeAttribute(key === 'className' ? 'class' : key)
    }
  }
}
