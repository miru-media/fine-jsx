// SPDX-FileCopyrightText: 2025 Taye Adeyemi <dev@taye.me>
//
// SPDX-License-Identifier: AGPL-3.0-only

import { resolve } from 'node:path'

import { getBabelOutputPlugin } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import del from 'rollup-plugin-delete'
import filesize from 'rollup-plugin-filesize'

const ROOT = resolve(import.meta.dirname)
const { NODE_ENV } = process.env
const isProd = NODE_ENV === 'production'
const ALWAYS_BUNDLE = ['@reactively/core']
const EXTENSIONS = ['.mjs', '.js', '.json', '.node', '.ts', '.tsx']

/**
 * @typedef {{
 *  inputs: Record<string, string>
 *  external?: import('rollup').RollupOptions['external']
 *  dist?: string
 *  clearDist?: boolean
 * }} Options
 **/

/** @type {Options[]} */
const packageOptions = [
  {
    inputs: {
      index: 'src/index.ts',
      composables: 'src/composables.ts',
      'jsx-runtime': 'src/jsx-runtime.ts',
      'jsx-dev-runtime': 'src/jsx-dev-runtime.ts',
    },
  },
]

const replacements = {
  values: {
    'import.meta.hot': 'undefined',
    'import.meta.env.DEV': JSON.stringify(!isProd),
    'import.meta.env.PROD': JSON.stringify(isProd),
    'import.meta.env.NODE_ENV': JSON.stringify(NODE_ENV),
  },
  preventAssignment: true,
}

export default packageOptions.map(
  ({
    inputs,
    dist,
    clearDist = true,
    external = (id) =>
      id.includes('/node_modules/') &&
      !ALWAYS_BUNDLE.some((dep) => id === dep || id.includes(`/node_modules/${dep}/`)),
  }) => {
    dist = dist ? resolve(ROOT, dist) : resolve(ROOT, 'dist')

    return defineConfig({
      plugins: [
        clearDist && del({ targets: resolve(dist, '*'), runOnce: true }),
        nodeResolve({ extensions: EXTENSIONS }),
        commonjs(),
        typescript(),
        getBabelOutputPlugin({ presets: ['@babel/preset-env'] }),
        replace(replacements),
        isProd && terser(),
        filesize(),
      ],
      input: Object.fromEntries(
        Object.entries(inputs).map(([key, filename]) => [key, resolve(ROOT, filename)]),
      ),
      external,
      output: {
        dir: dist,
        format: 'es',
        entryFileNames: '[name].js',
        sourcemap: true,
        hoistTransitiveImports: false,
      },
    })
  },
)
