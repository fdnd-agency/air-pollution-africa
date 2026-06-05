import { fail, redirect } from '@sveltejs/kit'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { compare } from 'bcryptjs'
import generateApiKey from '$lib/server/helpers/generateApiKey'
import { hashApiKey } from '$lib/server/helpers/apiKeyHash'
import { DirectusService } from '$lib/server/services/directusService'
import getResendClient from '$lib/server/services/resendService'

/**
 * Directus `dateTime` columns come back without a timezone designator, so a plain
 * `new Date(value)` parses them as *local* time. We stored them as UTC (toISOString),
 * so treat a tz-less value as UTC to avoid a false "expired" on non-UTC servers.
 */
function parseUtcDate(value) {
	if (!value) return null
	const s = String(value)
	const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s)
	const d = new Date(hasTz ? s : `${s}Z`)
	return Number.isNaN(d.getTime()) ? null : d
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies, params }) {
	if (!cookies.get('pending_api_key_email')) {
		throw redirect(303, `/${params.city}/api-key/request`)
	}

	// DEV ONLY: surface the verification code when mail isn't configured (same failsafe as login).
	const devCode = cookies.get('dev_api_key_code') || null
	if (devCode) cookies.delete('dev_api_key_code', { path: '/' })
	return { devCode }
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies, params }) => {
		const emailLower = cookies.get('pending_api_key_email')
		if (!emailLower) {
			throw redirect(303, `/${params.city}/api-key/request`)
		}

		const formData = await request.formData()
		const code = String(formData.get('code') || '').trim()
		if (!code) {
			return fail(400, { error: 'Please enter your verification code.' })
		}

		const token = DirectusService.getServerToken()
		let apiKey
		try {
			const record = await DirectusService.getApiKeyByEmailLower(emailLower, { token })
			if (!record) {
				return fail(400, { error: 'Invalid or expired code.' })
			}

			const expiresAt = parseUtcDate(record.verify_expires_at)
			if (!record.verify_code_hash || !expiresAt || expiresAt < new Date()) {
				return fail(400, { error: 'Invalid or expired code.' })
			}

			const ok = await compare(code, record.verify_code_hash)
			if (!ok) {
				return fail(400, { error: 'Invalid or expired code.' })
			}

			apiKey = generateApiKey()
			// Store only the hash; the plaintext key is shown/emailed once, never persisted.
			await DirectusService.issueApiKey({ id: record.id, apiKeyHash: hashApiKey(apiKey) }, { token })
		} catch (error) {
			console.error('API key verify failed:', error)
			return fail(500, { error: 'Failed to verify code.' })
		}

		// Best effort: the key is shown once on the success page, so a mail failure
		// (e.g. RESEND_API_KEY unset in dev) must not lose the already-issued key.
		try {
			const resend = getResendClient()
			await resend.emails.send({
				from: env.FROM_EMAIL,
				to: emailLower,
				subject: 'Your API key',
				html: `
					<p>Here is your API key:</p>
					<p><strong>${apiKey}</strong></p>
					<p>Keep this key safe. You need it for all API calls.</p>
				`
			})
		} catch (error) {
			console.error('Failed to send API key email (key is still shown on the success page):', error?.message)
		}

		cookies.delete('pending_api_key_email', { path: '/' })
		cookies.set('api_key_to_show', apiKey, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: 60 * 10
		})

		// Outside the try/catch: redirect() throws, and must be allowed to propagate.
		throw redirect(303, `/${params.city}/api-key/success`)
	}
}
