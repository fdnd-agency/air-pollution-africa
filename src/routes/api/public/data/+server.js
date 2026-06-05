import { DirectusService } from '$lib/server/services/directusService'
import { buildPointsWithMeasurements } from '$lib/server/helpers/exportData'
import { verifyApiKey } from '$lib/server/helpers/requireApiKey'

function parseMonthToUTC(monthStr) {
	if (typeof monthStr !== 'string') return null
	const m = monthStr.trim()
	const match = /^(\d{4})-(\d{2})$/.exec(m)
	if (!match) return null

	const year = Number(match[1])
	const month = Number(match[2])
	if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null

	return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
}

function addMonthsUTC(date, monthsToAdd) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthsToAdd, 1, 0, 0, 0, 0))
}

function parseBool(value) {
	if (value === true || value === false) return value
	if (typeof value !== 'string') return null
	const s = value.trim().toLowerCase()
	if (s === 'true' || s === '1' || s === 'yes') return true
	if (s === 'false' || s === '0' || s === 'no') return false
	return null
}

function clampInt(n, min, max, fallback) {
	const x = parseInt(String(n ?? ''), 10)
	if (!Number.isFinite(x)) return fallback
	return Math.max(min, Math.min(max, x))
}

function parsePointFilter(params) {
	const point = params.get('point') ? parseInt(params.get('point'), 10) : null
	const pointMin = params.get('pointMin') ? parseInt(params.get('pointMin'), 10) : null
	const pointMax = params.get('pointMax') ? parseInt(params.get('pointMax'), 10) : null

	if (Number.isFinite(point)) {
		return { eq: point }
	}

	const filters = {}
	if (Number.isFinite(pointMin)) filters.gte = pointMin
	if (Number.isFinite(pointMax)) filters.lte = pointMax
	return Object.keys(filters).length ? filters : null
}

function applyMeasurementLimits(items, { latestOnly, mLimit }) {
	if (!latestOnly && mLimit === 24) return items

	return items.map((point) => {
		const measurements = Array.isArray(point.measurements) ? [...point.measurements] : []
		measurements.sort((a, b) => new Date(a.date) - new Date(b.date))

		let sliced = measurements
		if (latestOnly) {
			sliced = measurements.slice(-1)
		} else if (mLimit) {
			sliced = measurements.slice(-mLimit)
		}

		return { ...point, measurements: sliced }
	})
}

export async function GET({ url, request }) {
	const client = await verifyApiKey({ request, url })
	if (!client) {
		return new Response(JSON.stringify({ error: "Valid API key required. Provide it via the 'x-api-key' header." }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const params = url.searchParams
	const page = clampInt(params.get('page'), 1, 1000000, 1)
	const limit = clampInt(params.get('limit'), 1, 200, 50)
	const skip = (page - 1) * limit

	const activeParam = (params.get('active') || 'all').trim().toLowerCase()
	const includeMeasurements = parseBool(params.get('includeMeasurements'))
	const includeM = includeMeasurements === null ? false : includeMeasurements

	const startFrom = parseMonthToUTC(params.get('startFrom'))
	const startTo = parseMonthToUTC(params.get('startTo'))
	const mFrom = parseMonthToUTC(params.get('mFrom'))
	const mTo = parseMonthToUTC(params.get('mTo'))
	const latestOnly = parseBool(params.get('latestOnly')) === true
	const mLimit = clampInt(params.get('mLimit'), 1, 24, 24)

	const pointFilter = parsePointFilter(params)
	const query = new URLSearchParams()
	query.set('limit', String(limit))
	query.set('offset', String(skip))
	query.set('sort', 'point_number')
	query.set('meta', 'filter_count')

	if (activeParam === 'true') query.set('filter[active][_eq]', 'true')
	if (activeParam === 'false') query.set('filter[active][_eq]', 'false')

	if (pointFilter?.eq !== undefined) {
		query.set('filter[point_number][_eq]', String(pointFilter.eq))
	} else if (pointFilter) {
		if (pointFilter.gte !== undefined) query.set('filter[point_number][_gte]', String(pointFilter.gte))
		if (pointFilter.lte !== undefined) query.set('filter[point_number][_lte]', String(pointFilter.lte))
	}

	if (startFrom) query.set('filter[start_date][_gte]', startFrom.toISOString())
	if (startTo) query.set('filter[start_date][_lt]', addMonthsUTC(startTo, 1).toISOString())

	const { data: points, meta } = await DirectusService.getContentWithMeta('apa_sampling_points', query.toString())
	const count = meta?.filter_count ?? points.length

	if (!includeM) {
		return new Response(JSON.stringify({ page, limit, count, items: points }), {
			headers: { 'Content-Type': 'application/json' }
		})
	}

	const measurementsQuery = new URLSearchParams()
	measurementsQuery.set('limit', '-1')
	measurementsQuery.set('sort', 'date')
	if (mFrom) measurementsQuery.set('filter[date][_gte]', mFrom.toISOString())
	if (mTo) measurementsQuery.set('filter[date][_lt]', addMonthsUTC(mTo, 1).toISOString())

	const measurements = await DirectusService.getContent('apa_measurements', measurementsQuery.toString())
	let items = buildPointsWithMeasurements(points, measurements)
	items = applyMeasurementLimits(items, { latestOnly, mLimit })

	return new Response(JSON.stringify({ page, limit, count, items }), {
		headers: { 'Content-Type': 'application/json' }
	})
}
