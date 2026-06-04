import { json } from '@sveltejs/kit'
import { DirectusService } from '$lib/server/services/directusService'

const MEASUREMENT_MIN = 0
const MEASUREMENT_MAX = 200

function parseValue(raw, noMeasurement) {
	if (noMeasurement) return { ok: true, value: null }
	const s = raw === null || raw === undefined ? '' : String(raw).trim()
	if (s === '') return { ok: false }
	const n = Number(s.replace(',', '.'))
	if (!Number.isFinite(n) || n < MEASUREMENT_MIN || n > MEASUREMENT_MAX) return { ok: false }
	return { ok: true, value: n }
}

export async function PATCH({ request, locals, params }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

	const { id } = params
	if (!id) return json({ error: 'Invalid measurement id.' }, { status: 400 })

	const token = DirectusService.getServerToken()
	const body = await request.json().catch(() => ({}))
	const { date, tube, noMeasurement } = body

	if (!date || !tube) return json({ error: 'date and tube are required.' }, { status: 400 })

	const when = new Date(date)
	if (Number.isNaN(when.getTime())) return json({ error: 'date must be a valid date.' }, { status: 400 })

	const v = parseValue(body.value, noMeasurement)
	if (!v.ok) {
		return json({ error: `Provide a value between ${MEASUREMENT_MIN} and ${MEASUREMENT_MAX} (µg/m³), or mark "no measurement".` }, { status: 400 })
	}

	const updated = await DirectusService.updateContent('apa_measurements', id, { date: when.toISOString(), tube, value: v.value }, { token })
	return json(updated?.data ?? updated)
}

export async function DELETE({ locals, params }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 })

	const { id } = params
	if (!id) return json({ error: 'Invalid measurement id.' }, { status: 400 })

	const token = DirectusService.getServerToken()
	await DirectusService.deleteContent('apa_measurements', id, { token })
	return json({ success: true })
}
