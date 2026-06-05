import { json } from '@sveltejs/kit'
import { DirectusService } from '$lib/server/services/directusService'
import { resolveCity } from '$lib/server/services/cityService'

export async function POST({ request, locals, params }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

	const token = DirectusService.getServerToken()

	const city = await resolveCity(params.city, { token })
	if (!city) return json({ error: `Unknown city "${params.city}".` }, { status: 404 })

	const body = await request.json().catch(() => ({}))
	const { location, description, lat, lon, startDate, active = true } = body

	if (!location || !description || lat == null || lon == null || !startDate) {
		return json({ error: 'location, description, lat, lon and startDate are required.' }, { status: 400 })
	}

	const latNum = Number(lat)
	const lonNum = Number(lon)
	if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
		return json({ error: 'lat and lon must be valid numbers.' }, { status: 400 })
	}

	const start = new Date(startDate)
	if (Number.isNaN(start.getTime())) {
		return json({ error: 'startDate must be a valid date (YYYY-MM-DD).' }, { status: 400 })
	}

	// Point numbers are per-city, so only consider this city's existing points.
	const last = await DirectusService.getContent('apa_sampling_points', `filter[city][_eq]=${city.id}&sort=-point_number&limit=1`, { token })
	const lastNumber = last?.[0]?.point_number
	const nextPointNumber = Number.isFinite(Number(lastNumber)) ? Number(lastNumber) + 1 : 1

	const created = await DirectusService.postContent(
		'apa_sampling_points',
		{
			point_number: nextPointNumber,
			location: String(location).trim(),
			latitude: latNum,
			longitude: lonNum,
			description: String(description).trim(),
			start_date: start.toISOString(),
			active: active !== false,
			city: city.id
		},
		{ token }
	)

	return json(created?.data ?? created, { status: 201 })
}
