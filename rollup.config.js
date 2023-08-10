import alias from '@rollup/plugin-alias'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import {babel} from '@rollup/plugin-babel'
// packages
import webPkg from './packages/web/package.json'
import workerPkg from './packages/worker/package.json'

const bannersParams = {
  web: webPkg,
  worker: workerPkg
}

const LIBRARY_NAME = 'CableSW' // Library name
const EXTERNAL = [] // external modules
const GLOBALS = {} // https://rollupjs.org/guide/en/#outputglobals
const OUTPUT_DIR = 'dist'

const makeConfig = () => {
  const configs = Object.keys(bannersParams).map((name) => {
    const banner = `/*!
 * ${bannersParams[name].name}
 * ${bannersParams[name].description}
 *
 * @version v${bannersParams[name].version}
 * @author ${bannersParams[name].author}
 * @homepage ${bannersParams[name].homepage}
 * @repository ${bannersParams[name].repository}
 * @license ${bannersParams[name].license}
 */`

    return {
      input: `packages/${name}/src/index.js`,
      external: EXTERNAL,
      output: [
        {
          banner,
          name: LIBRARY_NAME,
          file: `packages/${name}/${OUTPUT_DIR}/index.umd.js`, // UMD
          format: 'umd',
          exports: 'auto',
          globals: GLOBALS,
          sourcemap: true
        },
        {
          banner,
          file: `packages/${name}/${OUTPUT_DIR}/index.cjs.js`, // CommonJS
          format: 'cjs',
          exports: 'named', // https://rollupjs.org/guide/en/#outputexports
          globals: GLOBALS,
          sourcemap: true
        },
        {
          banner,
          file: `packages/${name}/${OUTPUT_DIR}/index.esm.js`, // ESM
          format: 'es',
          exports: 'auto',
          globals: GLOBALS,
          sourcemap: true
        }
      ],
      plugins: [
        alias({
          entries: [{find: /^cable-shared\/(.*)/, replacement: './shared/$1.js'}]
        }),
        resolve(), // teach Rollup how to find external modules
        commonjs(), // so Rollup can convert external modules to an ES module
        babel({
          babelHelpers: 'bundled',
          exclude: ['node_modules/**']
        })
      ]
    }
  })

  return configs
}

export default () => {
  return makeConfig()
}
