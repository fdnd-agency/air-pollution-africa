import { fail, redirect } from '@sveltejs/kit'
import { AuthService } from '$lib/server/services/authService'

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData()
		const email = String(formData.get('email') || '').trim()
		const password = String(formData.get('password') || '')

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.' })
		}

		const result = await AuthService.login(email, password, cookies)
		if (!result.success) {
			return fail(400, { error: result.error || 'Login failed.' })
		}

		throw redirect(303, '/admin')
	}
}
