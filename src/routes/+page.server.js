import { listCities } from '$lib/server/services/cityService'

/**
 * Root landing page: a picker that lists the available cities and links into
 * each one's dashboard at `/<slug>`.
 * @type {import('./$types').PageServerLoad}
 */
export async function load() {
	const cities = await listCities()
	return { cities }
}
