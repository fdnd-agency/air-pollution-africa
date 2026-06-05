import { error } from '@sveltejs/kit'
import { resolveCity } from '$lib/server/services/cityService'

/**
 * Resolve the `[city]` slug once for every page below it. Unknown slugs 404
 * instead of silently rendering another city's (or empty) data. The resolved
 * city + slug are exposed to all child loads/components via `data`.
 * @type {import('./$types').LayoutServerLoad}
 */
export async function load({ params }) {
	const city = await resolveCity(params.city)
	if (!city) {
		throw error(404, `Unknown city "${params.city}".`)
	}

	return {
		city,
		citySlug: params.city
	}
}
