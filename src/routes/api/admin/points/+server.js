import { DirectusService } from '$lib/server/services/directusService'

const MEASUREMENT_MIN = 0
const MEASUREMENT_MAX = 200

function getCreatedId(created) {
	return created?.data?.id ?? created?.id ?? null
}

export async function POST({ request, cookies }) {
	const token = cookies.get('access_token')
	if (!token) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const body = await request.json().catch(() => ({}))
	const { description, lat, lon, startDate, firstValue } = body

	if (!description || lat == null || lon == null || !startDate) {
		return new Response(JSON.stringify({ error: 'description, lat, lon and startDate are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
	}

	const latNum = Number(lat)
	const lonNum = Number(lon)
	if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
		return new Response(JSON.stringify({ error: 'lat and lon must be valid numbers.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const start = new Date(startDate)
	if (Number.isNaN(start.getTime())) {
		return new Response(JSON.stringify({ error: 'startDate must be a valid date (YYYY-MM-DD).' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
	}

	const last = await DirectusService.getContent('apa_sampling_points', 'sort=-point_number&limit=1', { token })
	const lastNumber = last?.[0]?.point_number
	const nextPointNumber = Number.isFinite(Number(lastNumber)) ? Number(lastNumber) + 1 : 1

	const payload = {
		point_number: nextPointNumber,
		coordinates: { lat: latNum, lon: lonNum },
		description: String(description).trim(),
		start_date: start.toISOString(),
		active: true
	}

	const created = await DirectusService.postContent('apa_sampling_points', payload, { token })
	const pointId = getCreatedId(created)

	if (pointId && firstValue !== undefined && firstValue !== null && firstValue !== '') {
		const cleaned = String(firstValue).replace(',', '.')
		const v = Number(cleaned)
		if (!Number.isFinite(v) || v < MEASUREMENT_MIN || v > MEASUREMENT_MAX) {
			return new Response(
				JSON.stringify({
					error: `firstValue must be a number between ${MEASUREMENT_MIN} and ${MEASUREMENT_MAX} (ug/m3).`
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}

		await DirectusService.postContent(
			'apa_measurements',
			{
				sampling_point: pointId,
				date: start.toISOString(),
				value: v
			},
			{ token }
		)
	}

	return new Response(JSON.stringify(created?.data ?? created), {
		status: 201,
		headers: { 'Content-Type': 'application/json' }
	})
}
