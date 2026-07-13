// SPDX-FileCopyrightText: 2026 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { NodeOps } from '#jsx-types'
import { isRef, toValue } from '#reactivity'

import { createRuntime, toClassName, toKebabCase } from '../jsx/create-runtime'

import { SVG_TYPES } from './svgTypes'

const isSvg = (element: Element): element is SVGElement => 'ownerSVGElement' in element

const shouldIgnoreProp = (key: string) =>
  key === 'innerHTML' ||
  key === 'innerText' ||
  key === 'outerHTML' ||
  key === 'outerText' ||
  key === 'textContent'

const setAttribute = (element: Element, name: string, value: unknown) => {
  if (value == null) element.removeAttribute(name)
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  else element.setAttribute(name, String(value))
}

const domNodeOps: NodeOps<Node, Element, DocumentFragment, Comment> = {
  createElement: function (type: string): Element {
    return SVG_TYPES.has(type) || type.startsWith('svg:')
      ? document.createElementNS('http://www.w3.org/2000/svg', type.replace('svg:', ''))
      : document.createElement(type)
  },
  createText: () => new Text(),
  createFragment: () => new DocumentFragment(),
  createMarker: () => new Comment(),
  insertBefore: (child, parent, reference) => parent.insertBefore(child, reference),
  setText: (node: Node, content: string) => (node.textContent = content),
  setProp: (element, key, value) => {
    if (shouldIgnoreProp(key)) return

    if (key.startsWith('on')) {
      const listener = (isRef(value) ? value.value : value) as () => unknown
      const type = key.slice(2).toLowerCase()
      element.addEventListener(type, listener)
    } else if (key === 'class' || key === 'className') {
      element.setAttribute('class', toClassName(value))
    } else if (isSvg(element)) {
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
  },
  clearProp: (element, key, value) => {
    if (shouldIgnoreProp(key)) return

    if (key.startsWith('on')) {
      const listener = (isRef(value) ? value.value : value) as () => unknown
      const type = key.slice(2).toLowerCase()
      element.removeEventListener(type, listener)
      return
    } else if (isSvg(element)) {
      const svgKey = key === 'viewBox' ? key : toKebabCase(key)
      element.removeAttribute(svgKey)
    } else if (key in element && key !== 'style' && !(key === 'list' && element.nodeName === 'INPUT'))
      (element as any)[key] = null
    else element.removeAttribute(key === 'className' ? 'class' : key)
  },
  remove: (child) => child.parentNode?.removeChild(child),
  parentNode: (child) => child?.parentNode ?? null,
  nextSibling: (node) => node?.nextElementSibling,
  isFragment: (node): node is DocumentFragment => node?.nodeType === 11,
  isNativeNode: (node): node is Node =>
    !!node &&
    typeof node.nodeType === 'number' &&
    Object.prototype.toString.call(node) !== '[opbject Object]',
  isText: (node): node is Text => node.nodeType === 3,
}

export const { jsx, jsxs, Fragment } = createRuntime(domNodeOps)
export { jsx as h }
