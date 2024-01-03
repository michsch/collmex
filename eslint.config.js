const standard = require('eslint-config-standard')
const pluginImport = require('eslint-plugin-import')
const pluginN = require('eslint-plugin-n')
const pluginPromise = require('eslint-plugin-promise')

const plugins = {
  import: pluginImport,
  n: pluginN,
  promise: pluginPromise
}

let { env, globals, parserOptions, rules } = standard
Object.assign(globals, env)

const languageOptions = {
  parserOptions,
  globals
}

module.exports = [
  {
    languageOptions,
    plugins,
    rules,
  },
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        module: 'writable',
        require: 'readonly',
      }
    },
    rules: {
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'only-multiline',
      }]
    }
  }
]