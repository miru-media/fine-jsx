// SPDX-FileCopyrightText: 2025 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { effect, type MaybeRefOrGetter, onScopeDispose, ref, toValue, watch } from '#reactivity'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const useEventListener = <T extends Event>(
  targetRef: MaybeRefOrGetter<EventTarget | undefined>,
  type: string,
  listener: (event: T) => void,
  options?: EventListenerOptions,
) =>
  effect((onCleanup) => {
    const target = toValue(targetRef)
    if (target == undefined) return

    target.addEventListener(type, listener as (event: Event) => void, options)
    onCleanup(() => target.removeEventListener(type, listener as (event: Event) => void, options))
  })

export const useElementSize = (element: MaybeRefOrGetter<HTMLElement | null | undefined>) => {
  const initialElement = toValue(element)
  const size = ref({
    width: initialElement?.offsetWidth ?? 0,
    height: initialElement?.offsetHeight ?? 0,
  })

  const observer = new ResizeObserver(([entry]) => {
    if ('contentBoxSize' in (entry as never)) {
      const { contentBoxSize } = entry

      const sizeItem = (
        Array.isArray(contentBoxSize) ? contentBoxSize[0] : contentBoxSize
      ) as ResizeObserverSize
      size.value = { width: sizeItem.inlineSize, height: sizeItem.blockSize }
    } else {
      size.value = { width: entry.contentRect.width, height: entry.contentRect.height }
    }
  })

  watch([() => toValue(element)], ([el], _prev, onCleanup) => {
    if (el == undefined) return

    observer.observe(el)
    onCleanup(() => observer.unobserve(el))
  })

  onScopeDispose(observer.disconnect.bind(observer))

  return size
}
