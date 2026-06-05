import { error } from '@sveltejs/kit'
import { buildPointsWithMeasurements } from '$lib/server/helpers/exportData'
import { resolveCity, getCityData } from '$lib/server/services/cityService'

export async function GET({ params }) {
	const city = await resolveCity(params.city)
	if (!city) throw error(404, `Unknown city "${params.city}".`)

	const { points, measurements } = await getCityData(city.id, { includeMeasurements: true })
	const items = buildPointsWithMeasurements(points, measurements)

	return new Response(JSON.stringify(items, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': 'attachment; filename="data.json"'
		}
	})
}
