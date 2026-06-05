import prettier from 'eslint-config-prettier'
import path from 'node:path'
import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import svelteConfig from './svelte.config.js'

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore')

export default defineConfig([
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,

	// Global environment globals
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},

	// Ignore common build/dev folders
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/', 'coverage/', '**/*.config.js']
	},

	// Svelte file parser options
	{
		files: ['**/*.svelte', '**/*.svelte.js'],
		languageOptions: { parserOptions: { svelteConfig } },
		rules: {
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'prefer-destructuring': 'off',
			'svelte/no-at-html-tags': 'off',
			'svelte/require-each-key': 'warn',
			'svelte/no-navigation-without-resolve': 'off'
		}
	},

	// FDND Code Conventions
	{
		rules: {
			quotes: ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
			semi: ['warn', 'never'],
			indent: ['warn', 'tab'],
			'prefer-const': 'warn',
			'no-var': 'error',
			camelcase: ['warn', { properties: 'never', ignoreDestructuring: true }],
			'prefer-template': 'warn',
			'prefer-destructuring': [
				'warn',
				{
					array: false,
					object: true
				},
				{
					enforceForRenamedProperties: false
				}
			],
			'no-unused-vars': [
				'warn',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			],
			'arrow-body-style': ['warn', 'as-needed'],
			'prefer-arrow-callback': 'warn',
			'object-curly-spacing': ['warn', 'always'],
			'array-bracket-spacing': ['warn', 'never'],
			'comma-dangle': ['warn', 'never'],
			'eol-last': ['warn', 'always'],
			'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
			'no-trailing-spaces': 'warn',
			eqeqeq: ['warn', 'always'],
			'no-console': ['warn', { allow: ['error'] }],
			'no-debugger': 'warn'
		}
	},

	// Config files may differ
	{
		files: ['**/*.config.js', '**/*.config.mjs'],
		rules: {
			'no-console': 'off'
		}
	}
])
