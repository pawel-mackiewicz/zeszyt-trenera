// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'dev-dist',
      // Why: Storybook stories are isolated UI examples and should not fail app-wide lint gates.
      'src/stories/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly'
      },
      parserOptions: {
        parser: tseslint.parser
      }
    },
    rules: {
      // Why: application/use-case contracts often require a request argument even when a specific handler does not use it yet.
      // `_` keeps that intent explicit while still surfacing all other unused arguments as lint errors.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['**/*.{spec,test}.{ts,tsx,js,jsx}'],
    rules: {
      // Tests lean on disposable fixtures and mocks, so allowing `any` here keeps that flexibility out of app code.
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  prettierConfig,
  storybook.configs['flat/recommended']
)
