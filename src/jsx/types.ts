// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MaybeRef, MaybeRefOrGetter, Ref } from '#reactivity'

import type { FineNode } from './nodes.ts'

export type MaybeGetter<T> = T | (() => T)
export type MaybeArray<T> = T | T[]
export type NonReadonly<T> = {
  -readonly [P in keyof T]: T[P]
}
export type NativeElement = Element

export type Context = Record<string | symbol, unknown>

type SingleFineNodeChild<TNode extends object> =
  | FineNode<TNode>
  | TNode
  | string
  | number
  | boolean
  | Record<string, any>
export type FineNodeChild<TNode extends object> = MaybeArray<SingleFineNodeChild<TNode>>
export type MaybeChild<TNode extends object = object> = FineNodeChild<TNode> | null | undefined
export interface AppendedChild<TNode extends object, TFragment extends object> {
  fineNode: MaybeChild<TNode>
  domNode: TNode | TFragment
}

export type Stop = () => void

export type ComponentProps<Props = Record<string, unknown>, R = unknown, TNode extends object = any> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [P in keyof Props]: Props[P] extends Function | Ref ? Props[P] : MaybeRef<Props[P]>
} & {
  ref?: Ref<R | undefined>
  children?: MaybeArray<MaybeRefOrGetter<FineNodeChild<TNode> | null | undefined>>
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Component<Props extends Record<string, unknown> = {}, R = unknown, TNode extends object = any> = (
  props: ComponentProps<Props, R, TNode>,
) => JSX.Element | (() => JSX.Element)

export interface NodeOps<
  TNode = object,
  TElement extends TNode = TNode,
  TFragment = object,
  TMarker extends TNode = TNode,
> {
  createElement: (type: string) => TElement
  createText: () => TNode
  createFragment: () => TFragment
  createMarker: (label: string) => TMarker
  insertBefore: (child: TNode | TFragment, parent: TNode | TFragment, reference: TNode | null) => void
  setText: (node: TNode, content: string) => void
  setProp: (element: TElement, key: string, value: any) => void
  clearProp: (element: TElement, key: string, value: any) => void
  remove: (child: TNode) => void
  parentNode: (child: TNode | null | undefined) => TNode | null
  nextSibling: (node: TElement | TMarker | null | undefined) => TElement | null | undefined
  isFragment: (node: TNode | TFragment | null | undefined) => node is TFragment
  isNativeNode: (node: any) => node is TNode
  isText: (node: TNode) => boolean
}
