import { DirectusService } from '$lib/server/services/directusService'
import { buildPointsWithMeasurements } from '$lib/server/helpers/exportData'

export async function GET() {
	const [points, measurements] = await Promise.all([DirectusService.getContent('apa_sampling_points', 'limit=-1'), DirectusService.getContent('apa_measurements', 'limit=-1')])

	const items = buildPointsWithMeasurements(points, measurements)

	return new Response(JSON.stringify(items, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': 'attachment; filename="data.json"'
		}
	})
}
