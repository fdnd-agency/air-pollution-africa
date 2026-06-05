import { fail, redirect } from '@sveltejs/kit'
import { compare } from 'bcryptjs'
import generateApiKey from '$lib/server/helpers/generateApiKey'
import { DirectusService } from '$lib/server/services/directusService'
import getResendClient from '$lib/server/services/resendService'

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	if (!cookies.get('pending_api_key_email')) {
		throw redirect(303, '/api-key/request')
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies }) => {
		const emailLower = cookies.get('pending_api_key_email')
		if (!emailLower) {
			throw redirect(303, '/api-key/request')
		}

		const formData = await request.formData()
		const code = String(formData.get('code') || '').trim()
		if (!code) {
			return fail(400, { error: 'Voer je verificatiecode in.' })
		}

		try {
			const record = await DirectusService.getApiKeyByEmailLower(emailLower)
			if (!record) {
				return fail(400, { error: 'Ongeldige of verlopen code.' })
			}

			const expiresAt = record?.verify_expires_at ? new Date(record.verify_expires_at) : null
			if (!record.verify_code_hash || !expiresAt || expiresAt < new Date()) {
				return fail(400, { error: 'Ongeldige of verlopen code.' })
			}

			const ok = await compare(code, record.verify_code_hash)
			if (!ok) {
				return fail(400, { error: 'Ongeldige of verlopen code.' })
			}

			const apiKey = generateApiKey()
			await DirectusService.issueApiKey({ id: record.id, apiKey })

			const resend = getResendClient()
			await resend.emails.send({
				from: process.env.FROM_EMAIL,
				to: emailLower,
				subject: 'Je API key',
				html: `
					<p>Hier is je API key:</p>
					<p><strong>${apiKey}</strong></p>
					<p>Bewaar deze key goed. Je hebt deze nodig voor alle API calls.</p>
				`
			})

			cookies.delete('pending_api_key_email', { path: '/' })
			cookies.set('api_key_to_show', apiKey, {
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 60 * 10
			})

			throw redirect(303, '/api-key/success')
		} catch (error) {
			console.error('API key verify failed:', error)
			return fail(500, { error: 'Failed to verify code.' })
		}
	}
}
