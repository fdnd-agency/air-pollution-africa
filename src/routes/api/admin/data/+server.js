import { DirectusService } from '$lib/server/services/directusService'
import { buildPointsWithMeasurements } from '$lib/server/helpers/exportData'

export async function GET({ cookies }) {
	const token = cookies.get('access_token')
	if (!token) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const [points, measurements] = await Promise.all([DirectusService.getContent('apa_sampling_points', { token }), DirectusService.getContent('apa_measurements', { token })])

	const items = buildPointsWithMeasurements(points, measurements)

	return new Response(JSON.stringify(items), {
		headers: { 'Content-Type': 'application/json' }
	})
}
