import { json } from '@sveltejs/kit'
import { DirectusService } from '$lib/server/services/directusService'

export async function PATCH({ request, locals, params }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

	const { id } = params
	if (!id) return json({ error: 'Invalid point id.' }, { status: 400 })

	const token = DirectusService.getServerToken()
	const body = await request.json().catch(() => ({}))

	const patch = {}

	if (body.location !== undefined) {
		const location = String(body.location).trim()
		if (!location) return json({ error: 'location cannot be empty.' }, { status: 400 })
		patch.location = location
	}

	if (body.description !== undefined) {
		patch.description = String(body.description).trim()
	}

	if (body.lat !== undefined) {
		const latNum = Number(body.lat)
		if (!Number.isFinite(latNum)) return json({ error: 'lat must be a valid number.' }, { status: 400 })
		patch.latitude = latNum
	}

	if (body.lon !== undefined) {
		const lonNum = Number(body.lon)
		if (!Number.isFinite(lonNum)) return json({ error: 'lon must be a valid number.' }, { status: 400 })
		patch.longitude = lonNum
	}

	if (!Object.keys(patch).length) {
		return json({ error: 'No fields to update.' }, { status: 400 })
	}

	const updated = await DirectusService.updateContent('apa_sampling_points', id, patch, { token })
	return json(updated?.data ?? updated)
}
