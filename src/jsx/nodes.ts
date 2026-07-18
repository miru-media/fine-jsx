// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createEffectScope, type EffectScope } from '#reactivity'

import type {
  AppendedChild,
  Component,
  ComponentProps,
  Context,
  FineNodeChild,
  MaybeGetter,
  NodeOps,
  NonReadonly,
} from './types'
import {
  arrayFlatToValue,
  FINE_NODE_MARKER,
  isFineNode,
  unappend,
  unappendAndStop,
  updateChildNode,
  watchFineDomNode,
} from './utils'

const FRAGMENT_MARKERS = new WeakMap()

export let currentContext: Context | undefined

const withContext = <T>(current: Context | undefined, fn: () => T): T => {
  const prevContext = currentContext

  currentContext = current
  const res = fn()
  currentContext = prevContext

  return res
}

const shouldIgnoreProp = (key: string) => key === 'children' || key === 'ref'

export abstract class FineNode<
  TNode extends object = object,
  TElement extends TNode = TNode,
  TFragment extends object = object,
  TMarker extends TNode = TNode,
> {
  readonly ops: NodeOps<TNode, TElement, TFragment, TMarker>
  readonly type: Component | string | TElement
  readonly scope: EffectScope | undefined
  readonly parentContext: Context | undefined
  readonly props: ComponentProps
  fragmentMarker: TMarker | undefined
  readonly [FINE_NODE_MARKER] = true

  declare el: TElement | TFragment

  constructor(
    ops: NodeOps<TNode, TElement, TFragment, TMarker>,
    type: Component | string | TElement,
    props: ComponentProps,
    parentContext: Context | undefined,
    scope: EffectScope | undefined,
    fragmentMarker: TMarker | undefined,
  ) {
    this.ops = ops
    this.type = type
    this.props = props
    this.parentContext = parentContext
    this.scope = scope
    this.fragmentMarker = fragmentMarker
  }
}

export class FineComponentNode<
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
> extends FineNode<TNode, TElement, TFragment, TMarker> {
  declare readonly type: Component
  declare readonly scope: EffectScope

  context: Context = undefined as never

  constructor(
    ops: NodeOps<TNode, TElement, TFragment, TMarker>,
    type: Component,
    props: ComponentProps,
    parentContext?: Context,
  ) {
    super(ops, type, props, parentContext, createEffectScope(), undefined)

    withContext((this.context = { ...this.parentContext }), () => {
      this.scope.run(() => {
        let fineNode = this.type(this.props) as unknown as MaybeGetter<
          FineNode<TNode, TElement, TFragment, TMarker>
        >

        if (typeof fineNode === 'function')
          watchFineDomNode(
            (fineNode = new FineElementNode(
              ops,
              '#fragment',
              { children: fineNode },
              this.context,
              this.scope,
            )),
          )

        this.el = fineNode.el
        this.fragmentMarker = fineNode.fragmentMarker
      })
    })
  }
}

export class FineElementNode<
  TNode extends object,
  TElement extends TNode,
  TFragment extends object,
  TMarker extends TNode,
> extends FineNode<TNode, TElement, TFragment, TMarker> {
  readonly parentScope: EffectScope
  readonly appendedNodes: AppendedChild<TNode, TFragment>[] = []

  get isFragment(): boolean {
    return !!this.fragmentMarker
  }

  constructor(
    ops: NodeOps<TNode, TElement, TFragment, TMarker>,
    type: string | TElement,
    props: ComponentProps,
    parentContext: Context | undefined,
    parentScope: EffectScope,
  ) {
    let element: TElement | TFragment
    let fragmentMarker: TMarker | undefined = undefined

    if (type === '#fragment') {
      element = ops.createFragment()
      fragmentMarker = ops.createMarker(import.meta.env.PROD ? '' : 'fragment')
      ops.insertBefore(fragmentMarker, element, null)
      FRAGMENT_MARKERS.set(element, fragmentMarker)
    } else if (typeof type === 'string') {
      element = ops.createElement(type)
    } else {
      element = type
    }

    super(ops, type, props, parentContext, undefined, fragmentMarker)

    this.el = element
    this.parentScope = parentScope
  }

  getChildren(): (FineNodeChild<TNode> | null | undefined)[] {
    return this.parentScope.run(() =>
      withContext(this.parentContext, () => arrayFlatToValue(this.props.children)),
    )
  }

  // accepts an array whose only element is an array of children
  // this is to make it easier to use as a watch callback
  // we use object destructuring even though it's an array to avoid creating an iterator
  updateChildren({ 0: children }: [(FineNodeChild<TNode> | null | undefined)[]]): void {
    const { ops, el: element, fragmentMarker, appendedNodes } = this
    const appendTo = ops.parentNode(fragmentMarker) ?? element

    children.forEach((child, childIndex) => {
      const prevAppended = appendedNodes[childIndex] as AppendedChild<TNode, TFragment> | undefined
      const prevDomNode = prevAppended?.domNode

      const domNode = updateChildNode(ops, child, prevAppended)
      // insert the new child at the position of the previous node (which may be the same)
      const beforeNode = ops.isFragment(appendTo)
        ? null
        : ((ops.isFragment(prevDomNode) ? (FRAGMENT_MARKERS.get(prevDomNode) as TMarker) : prevDomNode) ??
          ops.nextSibling(fragmentMarker))

      ops.insertBefore(
        domNode,
        appendTo,
        beforeNode && ops.parentNode(beforeNode) === appendTo ? beforeNode : null,
      )

      if ((isFineNode(child) && child !== prevAppended?.fineNode) || domNode !== prevAppended?.domNode) {
        // remove the previous child if it changed
        if (prevAppended != undefined) unappendAndStop(ops, prevAppended, appendTo)

        // update the list of appended children
        appendedNodes[childIndex] = { fineNode: child, domNode }
      }
    })

    // if there are fewer children than before, unmount the extra from before
    for (let i = children.length; i < appendedNodes.length; i++)
      unappendAndStop(ops, appendedNodes[i], appendTo)
    appendedNodes.length = children.length
  }

  updateProps(): void {
    const { ops, props } = this
    const element = this.el as TElement

    for (const key in props) {
      if (!Object.hasOwn(props, key) || shouldIgnoreProp(key)) continue
      ops.setProp(element, key, props[key])
    }
  }

  // component is to be unmounted
  // assume a parent component will remove it from the DOM
  dispose(): void {
    const { ops, appendedNodes, props } = this
    if (this.isFragment) {
      const fragmentMarker = this.fragmentMarker!
      const parentNode = ops.parentNode(fragmentMarker)
      ops.remove(fragmentMarker)
      if (parentNode) appendedNodes.forEach((node) => unappend(ops, node, parentNode))
    }

    appendedNodes.length = 0
    if (props.ref) props.ref.value = undefined

    if (this.isFragment) return

    const element = this.el as Element

    ;(this as Partial<NonReadonly<typeof this>>).el = undefined

    for (const key in props) {
      if (!Object.hasOwn(props, key) || shouldIgnoreProp(key)) continue

      ops.clearProp(element as TElement, key, props[key])
    }
  }
}
