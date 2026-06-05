import adapter from '@sveltejs/adapter-auto';
import { DIRECTUS_URL } from './src/lib/constants.js'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
        csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'], // Required for Svelte transitions
				'img-src': ['self', 'data:', DIRECTUS_URL],
				'font-src': ['self'],
				'connect-src': ['self', DIRECTUS_URL],
				'frame-src': ['self', DIRECTUS_URL], // PDF viewer iframes in publicaties
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self']
			}
        }
	}
}

export default config;
