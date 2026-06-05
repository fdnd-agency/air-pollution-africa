import { fail, redirect } from '@sveltejs/kit'
import generateCode from '$lib/server/helpers/generateCode'
import { DirectusService } from '$lib/server/services/directusService'
import getResendClient from '$lib/server/services/resendService'

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData()
		const emailRaw = String(formData.get('email') || '').trim()
		if (!emailRaw) {
			return fail(400, { error: 'Voer een e-mailadres in.' })
		}

		const emailLower = emailRaw.toLowerCase()
		const { plain, hash } = await generateCode()
		try {
			const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
			await DirectusService.upsertApiKeyRequest({
				email: emailRaw,
				emailLower,
				verifyCodeHash: hash,
				verifyExpiresAt: expiresAt
			})
		} catch (error) {
			console.error('API key request failed:', error)
			return fail(500, { error: 'Failed to store verification code.' })
		}

		cookies.set('pending_api_key_email', emailLower, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 10
		})

		try {
			const resend = getResendClient()
			await resend.emails.send({
				from: process.env.FROM_EMAIL,
				to: emailLower,
				subject: 'Bevestig je email voor je API key',
				html: `
					<p>Je verificatiecode is: <strong>${plain}</strong></p>
					<p>Deze code is 10 minuten geldig.</p>
					<p>Vul deze code in om je API key te ontvangen.</p>
				`
			})
		} catch (error) {
			console.error('Failed to send API key verification email:', error)
			return fail(500, { error: 'Failed to send verification email.' })
		}

		throw redirect(303, '/api-key/verify')
	}
}
