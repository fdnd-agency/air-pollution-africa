import { AuthService } from '$lib/server/services/authService.js'

export async function handle({ event, resolve }) {
	const session = AuthService.getSessionFromCookies(event.cookies)
	if (session) {
		event.locals.user = session.user
	}

	return resolve(event)
}
