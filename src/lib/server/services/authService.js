import { DirectusService } from '$lib/server/services/directusService'
import { LoginCodeManager } from '$lib/server/services/loginCodeManager'
import { SessionManager } from '$lib/server/services/sessionManager'
import getResendClient from '$lib/server/services/resendService'

const SESSION_COOKIE = 'session_id'
const SESSION_MAX_AGE = Math.floor(SessionManager.ttlMs / 1000)

export class AuthService {
	static async requestLoginCode(email) {
		const normalized = this.#normalizeEmail(email)
		if (!normalized) return { success: false, error: 'Email is required.' }

		const token = DirectusService.getServerToken()
		const user = await DirectusService.getApaUserByEmailLower(normalized.emailLower, { token })
		if (!user) return { success: false, error: 'No account found for this email.' }
		if (user.active === false) return { success: false, error: 'This account is inactive.' }

		const { code, expiresAt } = await LoginCodeManager.createCode(user.id)
		await this.#sendLoginCodeEmail(normalized.emailLower, code)

		return { success: true, expiresAt, emailLower: normalized.emailLower }
	}

	static async verifyLoginCode(email, code, cookies) {
		const normalized = this.#normalizeEmail(email)
		if (!normalized || !String(code || '').trim()) {
			return { success: false, error: 'Email and code are required.' }
		}

		const token = DirectusService.getServerToken()
		const user = await DirectusService.getApaUserByEmailLower(normalized.emailLower, { token })
		if (!user) return { success: false, error: 'Invalid or expired code.' }
		if (user.active === false) return { success: false, error: 'This account is inactive.' }

		const result = await LoginCodeManager.verifyCode(user.id, code)
		if (!result.ok) return { success: false, error: result.error || 'Invalid or expired code.' }

		const session = await SessionManager.createSession(user.id)

		this.#setSessionCookie(cookies, session.token)

		this.#updateLoginTimestamp(user, token).catch((error) => {
			console.error('Failed to update login timestamp:', error)
		})

		return { success: true, session }
	}

	static async getSessionFromCookies(cookies) {
		const sessionToken = cookies.get(SESSION_COOKIE)
		if (!sessionToken) return null

		const session = await SessionManager.getSession(sessionToken, { touch: true })
		if (!session) {
			cookies.delete(SESSION_COOKIE, { path: '/' })
			return null
		}

		this.#setSessionCookie(cookies, sessionToken)
		return session
	}

	static async logout(cookies) {
		const sessionToken = cookies.get(SESSION_COOKIE)
		if (sessionToken) await SessionManager.deleteSession(sessionToken)
		cookies.delete(SESSION_COOKIE, { path: '/' })
	}

	static #normalizeEmail(email) {
		const emailRaw = String(email || '').trim()
		if (!emailRaw) return null
		return { email: emailRaw, emailLower: emailRaw.toLowerCase() }
	}

	static #setSessionCookie(cookies, sessionId) {
		cookies.set(SESSION_COOKIE, sessionId, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE
		})
	}

	static async #sendLoginCodeEmail(email, code) {
		const from = String(process.env.FROM_EMAIL || '').trim()
		if (!from) throw new Error('FROM_EMAIL missing in environment.')
		const resend = getResendClient()
		await resend.emails.send({
			from,
			to: email,
			subject: 'Your login code',
			html: `
				<p>Your one-time login code is: <strong>${code}</strong></p>
				<p>This code is valid for 10 minutes.</p>
			`
		})
	}

	static async #updateLoginTimestamp(user, token) {
		if (!user?.id) return
		await DirectusService.updateContent(
			'apa_users',
			user.id,
			{ last_login_at: new Date().toISOString() },
			{ token }
		)
	}
}
