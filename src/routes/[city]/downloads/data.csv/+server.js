import { error } from '@sveltejs/kit'
import csvEscape from '$lib/server/helpers/csvEscape'
import { buildFlatRows, buildPointsWithMeasurements } from '$lib/server/helpers/exportData'
import { resolveCity, getCityData } from '$lib/server/services/cityService'

export async function GET({ params }) {
	const city = await resolveCity(params.city)
	if (!city) throw error(404, `Unknown city "${params.city}".`)

	const { points, measurements } = await getCityData(city.id, { includeMeasurements: true })
	const items = buildPointsWithMeasurements(points, measurements)
	const { rows, headers } = buildFlatRows(items)

	const lines = [headers.join(',')]
	for (const row of rows) {
		lines.push(headers.map((header) => csvEscape(row[header] ?? '')).join(','))
	}

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="data.csv"'
		}
	})
}
