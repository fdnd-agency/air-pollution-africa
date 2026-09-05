import { DirectusService } from '$lib/server/services/directusService'

const COLLECTION = 'apa_cities'

/**
 * Resolve a city by its URL slug. Returns the city row or null when unknown.
 * @param {string} slug
 * @param {{ token?: string }} [options]
 */
export async function resolveCity(slug, options = {}) {
	const s = String(slug || '')
		.trim()
		.toLowerCase()
	if (!s) return null

	const items = await DirectusService.getContent(COLLECTION, `filter[slug][_eq]=${encodeURIComponent(s)}&limit=1`, options)
	return items[0] || null
}

/**
 * List the cities to offer in the picker. Active only, sorted by name.
 * @param {{ token?: string }} [options]
 */
export async function listCities(options = {}) {
	return DirectusService.getContent(COLLECTION, 'filter[active][_eq]=true&sort=name&limit=-1', options)
}

/**
 * Fetch a city's sampling points (and optionally their measurements), scoped by
 * the city id. Measurements are joined through their sampling point so the data
 * model only needs a `city` field on `apa_sampling_points`.
 *
 * @param {string|number} cityId
 * @param {{ token?: string, includeMeasurements?: boolean, pointsQuery?: string, measurementsQuery?: string }} [options]
 * @returns {Promise<{ points: any[], measurements: any[] }>}
 */
export async function getCityData(cityId, { token, includeMeasurements = true, pointsQuery = '', measurementsQuery = '' } = {}) {
	const pq = new URLSearchParams(pointsQuery)
	pq.set('filter[city][_eq]', String(cityId))
	if (!pq.has('limit')) pq.set('limit', '-1')

	const points = await DirectusService.getContent('apa_sampling_points', pq.toString(), { token })

	if (!includeMeasurements || points.length === 0) {
		return { points, measurements: [] }
	}

	const ids = points.map((p) => p.id).filter(Boolean)
	const mq = new URLSearchParams(measurementsQuery)
	mq.set('filter[sampling_point][_in]', ids.join(','))
	if (!mq.has('limit')) mq.set('limit', '-1')

	const measurements = await DirectusService.getContent('apa_measurements', mq.toString(), { token })
	return { points, measurements }
}

/**
 * Fetch the tubes belonging to a city. Tubes are per-city (each city has its own
 * inventory), so the admin dropdown must only offer this city's tubes.
 * @param {string|number} cityId
 * @param {{ token?: string, query?: string }} [options]
 */
export async function getCityTubes(cityId, { token, query = '' } = {}) {
	const q = new URLSearchParams(query)
	q.set('filter[city][_eq]', String(cityId))
	if (!q.has('limit')) q.set('limit', '-1')
	return DirectusService.getContent('apa_tubes', q.toString(), { token })
}

export async function getCityPoint(pointId, cityId, { token } = {}) {
	const items = await DirectusService.getContent(
		'apa_sampling_points',
		`filter[id][_eq]=${encodeURIComponent(pointId)}&filter[city][_eq]=${encodeURIComponent(cityId)}&limit=1`,
		{ token }
	)
	return items[0] || null
}

export async function getCityTube(tubeId, cityId, { token } = {}) {
	const items = await DirectusService.getContent(
		'apa_tubes',
		`filter[id][_eq]=${encodeURIComponent(tubeId)}&filter[city][_eq]=${encodeURIComponent(cityId)}&limit=1`,
		{ token }
	)
	return items[0] || null
}

export async function getCityMeasurement(measurementId, cityId, { token } = {}) {
	const items = await DirectusService.getContent(
		'apa_measurements',
		`filter[id][_eq]=${encodeURIComponent(measurementId)}&fields=id,sampling_point,tube&limit=1`,
		{ token }
	)
	const measurement = items[0]
	if (!measurement) return null

	const point = await getCityPoint(measurement.sampling_point, cityId, { token })
	return point ? measurement : null
}
