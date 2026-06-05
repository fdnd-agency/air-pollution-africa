import { DirectusService } from '$lib/server/services/directusService'

const MEASUREMENT_MIN = 0
const MEASUREMENT_MAX = 200

export async function POST({ request, locals }) {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const token = DirectusService.getServerToken()

	const body = await request.json().catch(() => ({}))
	const { year, month, entries } = body

	if (!Array.isArray(entries)) {
		return new Response(JSON.stringify({ error: 'Invalid payload: entries must be an array.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const y = Number(year)
	const m = Number(month)

	if (!Number.isFinite(y) || y < 2000 || y > 2100 || !Number.isFinite(m) || m < 1 || m > 12) {
		return new Response(JSON.stringify({ error: 'Invalid payload: year/month required.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const measurementDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
	const items = []

	for (const [index, entry] of entries.entries()) {
		const { pointId } = entry
		if (!pointId) continue

		const tubeId = entry.tube_id === null || entry.tube_id === undefined ? '' : String(entry.tube_id).trim()
		if (!tubeId) {
			return new Response(JSON.stringify({ error: 'tube_id is required for each measurement.', index }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			})
		}

		const rawValueString = entry.value === null || entry.value === undefined ? '' : String(entry.value).trim()
		const hasValue = rawValueString !== ''
		const hasNoMeasurement = !!entry.noMeasurement

		if (!hasValue && !hasNoMeasurement) {
			return new Response(
				JSON.stringify({
					error: "Each measurement must either have a value or be marked as 'no measurement'.",
					index
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}

		if (hasValue && hasNoMeasurement) {
			return new Response(
				JSON.stringify({
					error: "A measurement cannot have both a numeric value and 'no measurement' at the same time.",
					index
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}

		let value = null
		if (hasValue) {
			const cleaned = rawValueString.replace(',', '.')
			const num = Number(cleaned)
			if (!Number.isFinite(num) || num < MEASUREMENT_MIN || num > MEASUREMENT_MAX) {
				return new Response(
					JSON.stringify({
						error: `Measurement values must be between ${MEASUREMENT_MIN} and ${MEASUREMENT_MAX} (ug/m3).`,
						index
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				)
			}
			value = num
		}

		items.push({
			sampling_point: pointId,
			date: measurementDate.toISOString(),
			tube: tubeId,
			value
		})
	}

	if (!items.length) {
		return new Response(JSON.stringify({ error: 'No valid entries to save.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	await DirectusService.postContent('apa_measurements', items, { token })

	return new Response(
		JSON.stringify({
			success: true,
			savedPeriod: { year: y, month: m },
			measurementDateUTC: measurementDate.toISOString()
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	)
}
