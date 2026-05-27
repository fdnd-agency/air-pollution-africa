function getPointIdFromMeasurement(measurement) {
	const candidates = [measurement?.sampling_point, measurement?.sampling_point_id, measurement?.point, measurement?.point_id, measurement?.apa_sampling_point, measurement?.apa_sampling_point_id]

	for (const candidate of candidates) {
		if (!candidate) continue
		if (typeof candidate === 'object' && candidate !== null) {
			if (candidate.id !== undefined && candidate.id !== null) return candidate.id
		}
		return candidate
	}

	return null
}

function stripPointReference(measurement) {
	const cleaned = { ...measurement }
	delete cleaned.sampling_point
	delete cleaned.sampling_point_id
	delete cleaned.point
	delete cleaned.point_id
	delete cleaned.apa_sampling_point
	delete cleaned.apa_sampling_point_id
	return cleaned
}

function flattenObject(obj, prefix = '', res = {}) {
	for (const [key, value] of Object.entries(obj || {})) {
		if (key === '_id') continue
		const newKey = prefix ? `${prefix}.${key}` : key

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			flattenObject(value, newKey, res)
		} else {
			res[newKey] = value
		}
	}
	return res
}

export function buildPointsWithMeasurements(points = [], measurements = []) {
	const map = new Map()
	for (const point of points) {
		const measurementsArray = Array.isArray(point.measurements) ? [...point.measurements] : []
		map.set(point.id, { ...point, measurements: measurementsArray })
	}

	for (const measurement of measurements) {
		const pointId = getPointIdFromMeasurement(measurement)
		if (pointId === null || pointId === undefined) continue

		if (!map.has(pointId)) {
			map.set(pointId, { id: pointId, measurements: [] })
		}

		map.get(pointId).measurements.push(stripPointReference(measurement))
	}

	return Array.from(map.values())
}

export function buildFlatRows(pointsWithMeasurements = []) {
	const rows = []

	for (const point of pointsWithMeasurements) {
		const { measurements = [], ...pointWithoutMeasurements } = point
		const flatPoint = flattenObject(pointWithoutMeasurements)

		if (!measurements.length) {
			rows.push({ ...flatPoint })
			continue
		}

		for (const measurement of measurements) {
			rows.push({ ...flatPoint, ...flattenObject(measurement, 'measurement') })
		}
	}

	const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
	if (!headers.length) headers.push('id')

	return { rows, headers }
}
