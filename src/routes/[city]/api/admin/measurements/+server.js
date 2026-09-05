import { json } from '@sveltejs/kit'
import { DirectusService } from '$lib/server/services/directusService'
import { getCityPoint, getCityTube, resolveCity } from '$lib/server/services/cityService'

const MEASUREMENT_MIN = 0
const MEASUREMENT_MAX = 200

/** Resolves a value/no-measurement pair to a stored value (number or null). */
function parseValue(raw, noMeasurement) {
	if (noMeasurement) return { ok: true, value: null }
	const s = raw === null || raw === undefined ? '' : String(raw).trim()
	if (s === '') return { ok: false }
	const n = Number(s.replace(',', '.'))
	if (!Number.isFinite(n) || n < MEASUREMENT_MIN || n > MEASUREMENT_MAX) return { ok: false }
	return { ok: true, value: n }
}

export async function POST({ request, locals, params }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

	const token = DirectusService.getServerToken()
	const city = await resolveCity(params.city, { token })
	if (!city) return json({ error: `Unknown city "${params.city}".` }, { status: 404 })
	const body = await request.json().catch(() => ({}))
	const { samplingPoint, date, tube, noMeasurement } = body

	if (!samplingPoint || !date || !tube) {
		return json({ error: 'samplingPoint, date and tube are required.' }, { status: 400 })
	}
	if (!(await getCityPoint(samplingPoint, city.id, { token }))) return json({ error: 'Sampling point not found in this city.' }, { status: 404 })
	if (!(await getCityTube(tube, city.id, { token }))) return json({ error: 'Tube not found in this city.' }, { status: 404 })

	const when = new Date(date)
	if (Number.isNaN(when.getTime())) return json({ error: 'date must be a valid date.' }, { status: 400 })

	const v = parseValue(body.value, noMeasurement)
	if (!v.ok) {
		return json({ error: `Provide a value between ${MEASUREMENT_MIN} and ${MEASUREMENT_MAX} (µg/m³), or mark "no measurement".` }, { status: 400 })
	}

	const created = await DirectusService.postContent('apa_measurements', { sampling_point: samplingPoint, date: when.toISOString(), tube, value: v.value }, { token })
	return json(created?.data ?? created, { status: 201 })
}
