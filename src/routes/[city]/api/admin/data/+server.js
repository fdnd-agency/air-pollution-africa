import { DirectusService } from '$lib/server/services/directusService'
import { buildPointsWithMeasurements } from '$lib/server/helpers/exportData'
import { resolveCity, getCityData } from '$lib/server/services/cityService'

export async function GET({ locals, params }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const token = DirectusService.getServerToken()

	const city = await resolveCity(params.city, { token })
	if (!city) {
		return new Response(JSON.stringify({ error: `Unknown city "${params.city}".` }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const { points, measurements } = await getCityData(city.id, { token, includeMeasurements: true })
	const items = buildPointsWithMeasurements(points, measurements)

	return new Response(JSON.stringify(items), {
		headers: { 'Content-Type': 'application/json' }
	})
}
