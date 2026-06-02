import { fail, redirect } from '@sveltejs/kit'
import { AuthService } from '$lib/server/services/authService'

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies, locals }) {
	if (locals.user) {
		throw redirect(303, '/admin')
	}

	return {
		pendingEmail: cookies.get('pending_login_email') || ''
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	request: async ({ request, cookies }) => {
		const formData = await request.formData()
		const email = String(formData.get('email') || '').trim()
		if (!email) {
			return fail(400, { error: 'Email is required.', step: 'request' })
		}

		try {
			const result = await AuthService.requestLoginCode(email)
			if (!result.success) {
				return fail(400, { error: result.error || 'Failed to send code.', step: 'request' })
			}

			cookies.set('pending_login_email', result.emailLower, {
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 60 * 10
			})

			return {
				requested: true,
				step: 'verify',
				email,
				code: result.code
			}
		} catch (error) {
			console.error('Failed to request login code:', error)
			return fail(500, { error: 'Failed to send login code.', step: 'request' })
		}
	},
	verify: async ({ request, cookies }) => {
		const formData = await request.formData()
		const email = String(formData.get('email') || cookies.get('pending_login_email') || '').trim()
		const code = String(formData.get('code') || '').trim()
		if (!email || !code) {
			return fail(400, { error: 'Email and code are required.', step: 'verify', email })
		}

		try {
			const result = await AuthService.verifyLoginCode(email, code, cookies)
			if (!result.success) {
				return fail(400, { error: result.error || 'Verification failed.', step: 'verify', email })
			}

			cookies.delete('pending_login_email', { path: '/' })
			throw redirect(303, '/admin')
		} catch (error) {
			console.error('Login code verification failed:', error)
			return fail(500, { error: 'Failed to verify login code.', step: 'verify', email })
		}
	}
}
