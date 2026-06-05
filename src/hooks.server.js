import { AuthService } from '$lib/server/services/authService.js'
import { createRateLimiter } from '$lib/server/helpers/rateLimiter.js'

const WINDOW_MS = 15 * 60 * 1000
// City-aware: the login form now lives at /<city>/admin/login, so match on suffix.
const LOGIN_PATH_SUFFIX = '/admin/login'

const requestLimiter = createRateLimiter({ windowMs: WINDOW_MS, max: 5 })
const verifyLimiter = createRateLimiter({ windowMs: WINDOW_MS, max: 10 })

export async function handle({ event, resolve }) {
	const session = await AuthService.getSessionFromCookies(event.cookies)
	if (session) {
		event.locals.user = session.user
	}

	const limited = checkLoginRateLimit(event)
	if (limited) return limited

	return resolve(event)
}

/**
 * Rate-limits POSTs to the login form actions by client IP.
 * Returns a 429 Response when the limit is exceeded, otherwise null.
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
function checkLoginRateLimit(event) {
	if (event.request.method !== 'POST' || !event.url.pathname.endsWith(LOGIN_PATH_SUFFIX)) {
		return null
	}

	const limiter = pickLoginLimiter(event.url.search)
	if (!limiter) return null

	// Read the body via formData only inside the actions — reading it here would
	// consume the stream, so we key on IP only.
	const ip = event.getClientAddress()
	const { allowed, retryAfterMs } = limiter.limiter.check(`${limiter.name}:${ip}`)
	if (allowed) return null

	return new Response('Too many requests. Please try again later.', {
		status: 429,
		headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) }
	})
}

/**
 * Maps a SvelteKit action query (e.g. "?/request") to its limiter.
 * @param {string} search
 */
function pickLoginLimiter(search) {
	if (search.startsWith('?/request')) return { name: 'request', limiter: requestLimiter }
	if (search.startsWith('?/verify')) return { name: 'verify', limiter: verifyLimiter }
	return null
}
