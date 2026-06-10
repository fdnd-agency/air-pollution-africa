// Shared, framework-free air-quality helpers used by both the map and the table
// views: data reshaping, colour scales, month lookups and the mini sparkline.

export const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const monthKey = (year, monthIndex) => year * 12 + monthIndex

const relId = (v) => (v && typeof v === 'object' ? v.id : v)
const toNum = (v) => {
	if (v === null || v === undefined || v === '') return null
	const n = Number(v)
	return Number.isFinite(n) ? n : null
}

export const kleuren = {
	LOW: 'rgb(0, 255, 0)',
	MID: 'rgb(255, 255, 0)',
	HIGH: 'rgb(255, 165, 0)',
	MAX: 'rgb(255, 0, 0)',
	ABSOLUTE: 'rgb(54, 0, 54)',
	NOMES: 'rgb(160, 160, 160)'
}

/** Group flat measurements under their sampling point and coerce types. */
export function reshapePoints(samplingPoints = [], measurements = []) {
	return (samplingPoints || []).map((p) => {
		const ms = (measurements || [])
			.filter((m) => relId(m.sampling_point) === p.id)
			.map((m) => ({ date: m.date, value: toNum(m.value), tubeId: relId(m.tube) }))
			.sort((a, b) => new Date(a.date) - new Date(b.date))
		return {
			id: p.id,
			location: p.location,
			description: p.description,
			point_number: p.point_number,
			lat: Number(p.latitude),
			lon: Number(p.longitude),
			measurements: ms
		}
	})
}

export function computeMaxValue(points) {
	const vals = points.flatMap((p) => p.measurements.filter((m) => typeof m.value === 'number').map((m) => m.value))
	return vals.length ? Math.max(...vals) : null
}

export function buildScalePresets(maxValue) {
	return {
		WHO: { key: 'WHO', label: 'WHO', annual: 10, colorMax: 20 },
		EU: { key: 'EU', label: 'EU', annual: 40, colorMax: 80 },
		RELATIVE: { key: 'RELATIVE', label: 'Relative', annual: maxValue !== null ? Number((maxValue / 2).toFixed(2)) : null, colorMax: maxValue }
	}
}

function parseRgb(rgb) {
	const nums = String(rgb).match(/\d+/g)
	if (!nums || nums.length < 3) return [0, 0, 0]
	return [Number(nums[0]), Number(nums[1]), Number(nums[2])]
}
const lerp = (a, b, t) => a + (b - a) * t

export function getKleuren(value, max) {
	if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return kleuren.LOW
	if (value > max) {
		const t = Math.min(Math.max((value - max) / (max * 4), 0), 1)
		const red = parseRgb(kleuren.MAX)
		const black = parseRgb(kleuren.ABSOLUTE)
		return `rgb(${Math.round(lerp(red[0], black[0], t))}, ${Math.round(lerp(red[1], black[1], t))}, ${Math.round(lerp(red[2], black[2], t))})`
	}
	const t = Math.min(Math.max(value / max, 0), 1)
	let c1, c2, lt
	if (t <= 0.33) {
		c1 = parseRgb(kleuren.LOW)
		c2 = parseRgb(kleuren.MID)
		lt = t / 0.33
	} else if (t <= 0.66) {
		c1 = parseRgb(kleuren.MID)
		c2 = parseRgb(kleuren.HIGH)
		lt = (t - 0.33) / 0.33
	} else {
		c1 = parseRgb(kleuren.HIGH)
		c2 = parseRgb(kleuren.MAX)
		lt = (t - 0.66) / 0.34
	}
	return `rgb(${Math.round(lerp(c1[0], c2[0], lt))}, ${Math.round(lerp(c1[1], c2[1], lt))}, ${Math.round(lerp(c1[2], c2[2], lt))})`
}

export function getClass(value, max) {
	if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return { key: 'NONE', label: 'No data' }
	if (value <= max * 0.25) return { key: 'LOW', label: 'Low' }
	if (value <= max * 0.5) return { key: 'MID', label: 'Medium' }
	if (value <= max) return { key: 'HIGH', label: 'High' }
	if (value <= max * 5) return { key: 'MAX', label: 'Dangerous' }
	return { key: 'ABSOLUTE', label: 'Extreme' }
}

export function getMonthValue(point, year, monthIndex) {
	const m = point.measurements.find((meas) => {
		const d = new Date(meas.date)
		return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === monthIndex
	})
	if (!m) return { status: 'missing', value: null }
	if (typeof m.value === 'number' && !Number.isNaN(m.value)) return { status: 'value', value: m.value }
	return { status: 'noMeasurement', value: null }
}

/** Returns { byYear: { [year]: number[] }, years: number[], latest: {year, monthIndex}|null }. */
export function buildAvailability(points) {
	const byYear = {}
	for (const p of points) {
		for (const m of p.measurements) {
			// Count any month that has a record — including explicit "no measurement"
			// (value === null) — so points with only such records still appear.
			const d = new Date(m.date)
			if (Number.isNaN(d.getTime())) continue
			const y = d.getFullYear()
			const mo = d.getMonth()
			if (!byYear[y]) byYear[y] = []
			if (!byYear[y].includes(mo)) byYear[y].push(mo)
		}
	}
	const years = Object.keys(byYear)
		.map(Number)
		.sort((a, b) => a - b)
	let latest = null
	for (const y of years) {
		for (const mo of byYear[y]) {
			if (!latest || monthKey(y, mo) > monthKey(latest.year, latest.monthIndex)) latest = { year: y, monthIndex: mo }
		}
	}
	return { byYear, years, latest }
}

export function legendValues(max) {
	const m = Number.isFinite(max) ? max : 0
	return { LOW: 0, MID: Number((m * 0.25).toFixed(2)), HIGH: Number((m * 0.5).toFixed(2)), MAX: Number(m.toFixed(2)) }
}

/** Monthly rows for one point: { year, monthIndex, dateKey, status, value }, sorted, deduped. */
export function sortedMonthly(point) {
	const rows = point.measurements
		.map((m) => {
			const d = new Date(m.date)
			if (Number.isNaN(d.getTime())) return null
			const year = d.getFullYear()
			const monthIndex = d.getMonth()
			return { year, monthIndex, dateKey: monthKey(year, monthIndex), status: typeof m.value === 'number' && !Number.isNaN(m.value) ? 'value' : 'noMeasurement', value: typeof m.value === 'number' ? m.value : null }
		})
		.filter(Boolean)
	const dedup = {}
	for (const r of rows) dedup[r.dateKey] = r
	return Object.values(dedup).sort((a, b) => a.dateKey - b.dateKey)
}

export function windowAround(rows, year, monthIndex, before = 5, after = 6) {
	const key = monthKey(year, monthIndex)
	let idx = rows.findIndex((r) => r.dateKey === key)
	if (idx === -1) {
		const nextIdx = rows.findIndex((r) => r.dateKey > key)
		idx = nextIdx !== -1 ? nextIdx : rows.length - 1
	}
	if (idx < 0) return []
	return rows.slice(Math.max(0, idx - before), Math.min(rows.length, idx + 1 + after))
}

/** Compact inline SVG line chart (no external chart lib) for the windowed rows. */
export function buildSparkline(rows, activeScale, maxValue) {
	const W = 300
	const H = 120
	const m = { top: 12, right: 12, bottom: 22, left: 30 }
	const iw = W - m.left - m.right
	const ih = H - m.top - m.bottom
	const annual = Number.isFinite(activeScale?.annual) ? activeScale.annual : null
	const max = activeScale?.colorMax ?? maxValue ?? 0
	const vals = rows.filter((r) => r.status === 'value').map((r) => r.value)
	let lo = vals.length ? Math.min(...vals) : 0
	let hi = vals.length ? Math.max(...vals) : 1
	if (annual !== null) {
		lo = Math.min(lo, annual)
		hi = Math.max(hi, annual)
	}
	const pad = (hi - lo) * 0.15 || 5
	const yMin = Math.max(0, lo - pad)
	let yMax = hi + pad
	if (yMax - yMin < 10) yMax = yMin + 10
	const n = rows.length
	const x = (i) => m.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
	const y = (v) => m.top + ih - ((v - yMin) / (yMax - yMin)) * ih

	const linePts = rows.map((r, i) => (r.status === 'value' ? `${x(i).toFixed(1)},${y(r.value).toFixed(1)}` : null)).filter(Boolean)
	const polyline = linePts.length > 1 ? `<polyline points="${linePts.join(' ')}" fill="none" stroke="#334155" stroke-width="2" opacity="0.6" />` : ''
	const dots = rows
		.map((r, i) => {
			if (r.status === 'value') return `<circle cx="${x(i).toFixed(1)}" cy="${y(r.value).toFixed(1)}" r="4" fill="${getKleuren(r.value, max)}" stroke="#fff" stroke-width="1.5" />`
			return `<circle cx="${x(i).toFixed(1)}" cy="${y(yMin).toFixed(1)}" r="3.5" fill="${kleuren.NOMES}" stroke="#fff" stroke-width="1.5" />`
		})
		.join('')
	const annualLine = annual !== null ? `<line x1="${m.left}" x2="${m.left + iw}" y1="${y(annual).toFixed(1)}" y2="${y(annual).toFixed(1)}" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.55" /><text x="${m.left + iw}" y="${Math.max(10, y(annual) - 6).toFixed(1)}" text-anchor="end" font-size="10" fill="#0f172a" opacity="0.7">${activeScale.key} annual: ${annual}</text>` : ''
	const labels = rows.map((r, i) => (i % 2 === 0 || i === n - 1 ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#64748b">${monthShort[r.monthIndex]} ${String(r.year).slice(2)}</text>` : '')).join('')
	return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="auto" role="img" aria-label="Monthly values">${annualLine}${polyline}${dots}${labels}</svg>`
}
