import { redirect } from '@sveltejs/kit'
import { DirectusService } from '$lib/server/services/directusService'
import keuzes from '../../../static/keuzes.json'

/** Relation fields come back as ids by default; guard in case of expansion. */
function relId(value) {
	return value && typeof value === 'object' ? value.id : value
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(303, '/admin/login')
	}

	const token = DirectusService.getServerToken()
	const isAdmin = locals.user.role === 'admin'
	const [rawPoints, measurements, tubes, users] = await Promise.all([
		DirectusService.getContent('apa_sampling_points', 'sort=point_number&limit=-1', { token }),
		DirectusService.getContent('apa_measurements', 'limit=-1', { token }),
		DirectusService.getContent('apa_tubes', 'sort=code&limit=-1', { token }),
		// User management is admin-only — don't even fetch the list for researchers.
		isAdmin ? DirectusService.getUsers('', { token }) : Promise.resolve([])
	])

	const tubeCodeById = new Map(tubes.map((t) => [t.id, t.code]))

	// Group measurements under their sampling point.
	const byPoint = new Map()
	for (const m of measurements) {
		const pid = relId(m.sampling_point)
		if (!pid) continue
		const tubeId = relId(m.tube)
		// Directus returns numeric/decimal columns as strings — coerce to a number.
		const num = m.value === null || m.value === undefined || m.value === '' ? null : Number(m.value)
		if (!byPoint.has(pid)) byPoint.set(pid, [])
		byPoint.get(pid).push({
			id: m.id,
			date: m.date,
			value: Number.isFinite(num) ? num : null,
			tubeId: tubeId ?? null,
			tubeCode: tubeCodeById.get(tubeId) ?? null
		})
	}

	const points = rawPoints.map((p) => {
		const ms = (byPoint.get(p.id) ?? []).slice().sort((a, b) => new Date(a.date) - new Date(b.date))
		const dates = ms.map((m) => m.date).filter(Boolean)
		return {
			id: p.id,
			point_number: p.point_number,
			location: p.location,
			description: p.description,
			latitude: p.latitude,
			longitude: p.longitude,
			start_date: p.start_date,
			active: p.active,
			measurements: ms,
			succeededCount: ms.filter((m) => typeof m.value === 'number').length,
			period: dates.length ? `${dates[0].slice(0, 7)} to ${dates[dates.length - 1].slice(0, 7)}` : '–'
		}
	})

	const allValues = points.flatMap((p) => p.measurements.filter((m) => typeof m.value === 'number').map((m) => m.value))
	const failed = points.reduce((n, p) => n + p.measurements.filter((m) => m.value === null).length, 0)
	const years = new Set(points.flatMap((p) => p.measurements.map((m) => new Date(m.date).getUTCFullYear())))

	const stats = {
		points: points.length,
		measurements: allValues.length + failed,
		succeeded: allValues.length,
		failed,
		low: allValues.length ? Math.min(...allValues) : null,
		high: allValues.length ? Math.max(...allValues) : null,
		years: years.size
	}

	return {
		points,
		tubes: tubes.map((t) => ({ id: t.id, code: t.code, active: t.active })).sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true })),
		users,
		isAdmin,
		stats,
		city: keuzes?.['Gekozen stad'] ?? ''
	}
}
