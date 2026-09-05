import { DirectusService } from '$lib/server/services/directusService'
import { getCityPoint, resolveCity } from '$lib/server/services/cityService'

export async function PATCH({ request, locals, params }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const token = DirectusService.getServerToken()
	const city = await resolveCity(params.city, { token })
	if (!city) return new Response(JSON.stringify({ error: `Unknown city "${params.city}".` }), { status: 404, headers: { 'Content-Type': 'application/json' } })
	if (!(await getCityPoint(params.id, city.id, { token }))) return new Response(JSON.stringify({ error: 'Point not found in this city.' }), { status: 404, headers: { 'Content-Type': 'application/json' } })

	const { id } = params
	if (!id) {
		return new Response(JSON.stringify({ error: 'Invalid point id.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const body = await request.json().catch(() => ({}))
	const isActive = !!body.active

	await DirectusService.updateContent('apa_sampling_points', id, { active: isActive }, { token })

	return new Response(JSON.stringify({ success: true, active: isActive }), {
		headers: { 'Content-Type': 'application/json' }
	})
}
