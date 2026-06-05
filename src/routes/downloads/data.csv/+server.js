import { DirectusService } from '$lib/server/services/directusService'
import csvEscape from '$lib/server/helpers/csvEscape'
import { buildFlatRows, buildPointsWithMeasurements } from '$lib/server/helpers/exportData'

export async function GET() {
	const [points, measurements] = await Promise.all([DirectusService.getContent('apa_sampling_points', 'limit=-1'), DirectusService.getContent('apa_measurements', 'limit=-1')])

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
