import { json } from '@sveltejs/kit'
import { DirectusService } from '$lib/server/services/directusService'
import { resolveCity } from '$lib/server/services/cityService'

export async function POST({ request, locals, params }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

	const token = DirectusService.getServerToken()

	const city = await resolveCity(params.city, { token })
	if (!city) return json({ error: `Unknown city "${params.city}".` }, { status: 404 })

	const body = await request.json().catch(() => ({}))
	const code = String(body.code ?? '').trim()
	if (!code) return json({ error: 'A tube code is required.' }, { status: 400 })

	const notes = body.notes == null ? null : String(body.notes).trim() || null
	const active = body.active !== false

	// Tube codes only need to be unique within a city, and the column is no longer
	// globally unique — so guard against duplicates within this city here.
	const existing = await DirectusService.getContent('apa_tubes', `filter[city][_eq]=${city.id}&filter[code][_eq]=${encodeURIComponent(code)}&limit=1`, { token })
	if (existing.length) {
		return json({ error: `Tube "${code}" already exists in ${city.name}.` }, { status: 409 })
	}

	const created = await DirectusService.postContent('apa_tubes', { code, notes, active, city: city.id }, { token })

	return json(created?.data ?? created, { status: 201 })
}
