// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MaybeRef, MaybeRefOrGetter, Ref } from '#reactivity'

import type { FineNode } from './nodes.ts'

export type MaybeArray<T> = T | T[]
export type NonReadonly<T> = {
  -readonly [P in keyof T]: T[P]
}
export type NativeElement = Element

export type Context = Record<string | symbol, unknown>

type SingleFineNodeChild = FineNode | Node | string | number | boolean | Record<string, any>
export type FineNodeChild = MaybeArray<SingleFineNodeChild>
export type MaybeChild = FineNodeChild | null | undefined
export interface AppendedChild {
  fineNode: MaybeChild
  domNode: Node
}

export type Stop = () => void

export type ComponentProps<Props = Record<string, unknown>, R = unknown> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [P in keyof Props]: Props[P] extends Function | Ref ? Props[P] : MaybeRef<Props[P]>
} & {
  ref?: Ref<R | undefined>
  children?: MaybeArray<MaybeRefOrGetter<FineNodeChild | null | undefined>>
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Component<Props extends Record<string, unknown> = {}, R = unknown> = (
  props: ComponentProps<Props, R>,
) => JSX.Element
