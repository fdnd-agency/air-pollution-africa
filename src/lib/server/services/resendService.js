import { Resend } from 'resend'
import { env } from '$env/dynamic/private'

function getResendClient() {
	const key = (env.RESEND_API_KEY || '').trim()
	if (!key) throw new Error('RESEND_API_KEY missing in environment.')
	return new Resend(key)
}

export default getResendClient
