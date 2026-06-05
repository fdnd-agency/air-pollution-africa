import { fail, redirect } from '@sveltejs/kit'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import generateCode from '$lib/server/helpers/generateCode'
import { DirectusService } from '$lib/server/services/directusService'
import getResendClient from '$lib/server/services/resendService'

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies, params }) => {
		const formData = await request.formData()
		const emailRaw = String(formData.get('email') || '').trim()
		if (!emailRaw) {
			return fail(400, { error: 'Please enter an email address.' })
		}

		const emailLower = emailRaw.toLowerCase()
		const { plain, hash } = await generateCode()
		try {
			const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
			await DirectusService.upsertApiKeyRequest(
				{
					email: emailRaw,
					emailLower,
					verifyCodeHash: hash,
					verifyExpiresAt: expiresAt
				},
				{ token: DirectusService.getServerToken() }
			)
		} catch (error) {
			console.error('API key request failed:', error)
			return fail(500, { error: 'Failed to store verification code.' })
		}

		cookies.set('pending_api_key_email', emailLower, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: 60 * 10
		})

		// DEV ONLY: when DEV_SHOW_LOGIN_CODE is on, surface the code instead of relying
		// on a working mail service (same failsafe as the login flow).
		const exposeCode = dev && env.DEV_SHOW_LOGIN_CODE === 'true'

		try {
			const resend = getResendClient()
			await resend.emails.send({
				from: env.FROM_EMAIL,
				to: emailLower,
				subject: 'Confirm your email for your API key',
				html: `
					<p>Your verification code is: <strong>${plain}</strong></p>
					<p>This code is valid for 10 minutes.</p>
					<p>Enter this code to receive your API key.</p>
				`
			})
		} catch (error) {
			if (!exposeCode) {
				console.error('Failed to send API key verification email:', error)
				return fail(500, { error: 'Failed to send verification email.' })
			}
			console.error('[dev] API key email failed; showing code on the verify page:', error?.message)
		}

		if (exposeCode) {
			cookies.set('dev_api_key_code', plain, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'lax',
				maxAge: 60 * 10
			})
		}

		throw redirect(303, `/${params.city}/api-key/verify`)
	}
}
