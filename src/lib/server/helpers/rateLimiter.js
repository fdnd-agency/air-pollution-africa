// Simple in-memory rate limiter. Counts live in a Map, so they only hold within
// one server process — on serverless/multi-instance hosts each instance counts
// on its own. Fine as a throttle; back it with Redis/Directus if you ever need a
// hard global cap.

const PRUNE_INTERVAL_MS = 10 * 60 * 1000

/**
 * @param {{ windowMs: number, max: number }} options
 *   windowMs - length of the fixed window in ms
 *   max      - max allowed hits per key within the window
 */
export function createRateLimiter({ windowMs, max }) {
	/** @type {Map<string, { count: number, resetAt: number }>} */
	const buckets = new Map()

	setInterval(() => {
		const now = Date.now()
		for (const [key, entry] of buckets) {
			if (entry.resetAt <= now) buckets.delete(key)
		}
	}, PRUNE_INTERVAL_MS).unref()

	return {
		/**
		 * Records a hit for `key` and reports whether it is allowed.
		 * @param {string} key
		 * @returns {{ allowed: boolean, retryAfterMs: number }}
		 */
		check(key) {
			const now = Date.now()
			const id = String(key ?? '')

			let entry = buckets.get(id)
			if (!entry || entry.resetAt <= now) {
				entry = { count: 0, resetAt: now + windowMs }
				buckets.set(id, entry)
			}

			entry.count += 1
			const allowed = entry.count <= max
			return { allowed, retryAfterMs: allowed ? 0 : entry.resetAt - now }
		}
	}
}
